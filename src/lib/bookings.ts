import { MongoServerError, ObjectId, type Db, type Document } from "mongodb";
import { getDb } from "./mongodb";
import { generateReferenceCode } from "./referenceCode";
import { DEFAULT_DURATION, toRange, type TimeRange } from "./schedule";
import type { AdminBooking, Booking, BookingStatus, BookingStatusChange, NewBooking } from "./types";

const COLLECTION = "bookings";

function historyFor(doc: Document): BookingStatusChange[] {
  if (doc.statusHistory?.length) return doc.statusHistory;
  // Older bookings only retain their initial request and latest status.
  const history: BookingStatusChange[] = [{ status: "pending", at: doc.createdAt, actor: "system" }];
  if (doc.status !== "pending") {
    history.push({ status: doc.status, at: doc.updatedAt, actor: "unknown" });
  }
  return history;
}

let indexesReady: Promise<unknown> | null = null;

function ensureIndexes(db: Db) {
  indexesReady ??= Promise.all([
    // Partial so older bookings without a code don't count as duplicates.
    db.collection(COLLECTION).createIndex(
      { referenceCode: 1 },
      { unique: true, partialFilterExpression: { referenceCode: { $type: "string" } } }
    ),
    db.collection(COLLECTION).createIndex({ userId: 1 }),
    db.collection(COLLECTION).createIndex({ requestKey: 1 }, {
      unique: true, partialFilterExpression: { requestKey: { $type: "string" } },
    }),
  ]).catch((err) => {
    indexesReady = null;
    throw err;
  });
  return indexesReady;
}

function toBooking(doc: Document): Booking {
  return {
    _id: doc._id.toString(),
    parentName: doc.parentName,
    contact: doc.contact,
    childName: doc.childName,
    childAge: doc.childAge,
    numberOfChildren: doc.numberOfChildren ?? 1,
    date: doc.date,
    time: doc.time,
    durationMinutes: doc.durationMinutes ?? DEFAULT_DURATION,
    ...(doc.eventType ? { eventType: doc.eventType } : {}),
    ...(doc.location ? { location: doc.location } : {}),
    ...(doc.activities ? { activities: doc.activities } : {}),
    notes: doc.notes ?? "",
    status: doc.status,
    ...(doc.referenceCode ? { referenceCode: doc.referenceCode } : {}),
    ...(doc.userId ? { userId: doc.userId } : {}),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function createBooking(
  input: NewBooking,
  userId?: string,
  request?: { key: string; hash: string }
): Promise<{ id: string; referenceCode: string }> {
  const db = await getDb();
  await ensureIndexes(db);
  const now = new Date().toISOString();

  // ~920k possible codes, so a clash is rare; retry a few times if it happens.
  for (let attempt = 0; ; attempt++) {
    const referenceCode = generateReferenceCode();
    try {
      const result = await db.collection(COLLECTION).insertOne({
        ...input,
        ...(request ? { requestKey: request.key, requestHash: request.hash } : {}),
        ...(userId ? { userId } : {}),
        referenceCode,
        status: "pending" satisfies BookingStatus,
        statusHistory: [{ status: "pending", at: now, actor: "system" }],
        createdAt: now,
        updatedAt: now,
      });
      return { id: result.insertedId.toString(), referenceCode };
    } catch (err) {
      if (request && err instanceof MongoServerError && err.code === 11000) {
        const receipt = await getBookingReceipt(request.key, request.hash);
        if (receipt) return receipt;
      }
      const duplicateCode =
        err instanceof MongoServerError && err.code === 11000 && attempt < 4;
      if (!duplicateCode) throw err;
    }
  }
}

export async function getAllBookings(): Promise<Booking[]> {
  const db = await getDb();
  const docs = await db
    .collection(COLLECTION)
    .find({ deletedAt: { $exists: false } })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(toBooking);
}

export async function getConfirmedBookings(): Promise<Booking[]> {
  const db = await getDb();
  const docs = await db
    .collection(COLLECTION)
    .find({ status: "confirmed", deletedAt: { $exists: false } })
    .sort({ date: 1, time: 1 })
    .toArray();
  return docs.map(toBooking);
}

/**
 * Status and history are saved together; matching the previous version
 * prevents concurrent actions from overwriting each other's history.
 */
export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
  adminId: string
): Promise<"updated" | "not_found" | "cancelled" | "conflict"> {
  const db = await getDb();
  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return "not_found";
  }
  const doc = await db.collection(COLLECTION).findOne({ _id: objectId, deletedAt: { $exists: false } });
  if (!doc) return "not_found";
  if (doc.status === "cancelled") return "cancelled";
  if (doc.status === status) return "updated";
  const now = new Date().toISOString();
  const result = await db
    .collection(COLLECTION)
    .updateOne(
      { _id: objectId, status: doc.status, updatedAt: doc.updatedAt, deletedAt: { $exists: false } },
      { $set: {
        status, updatedAt: now,
        statusHistory: [...historyFor(doc), { status, at: now, actor: "admin", actorId: adminId }],
      } }
    );
  if (result.matchedCount > 0) return "updated";
  return "conflict";
}

/**
 * Customer cancel. Only matches the user's own booking, and only while it
 * is pending or confirmed and today or later; the checks live in the
 * update filter so there's no gap between checking and writing.
 * Someone else's booking is reported as "not_found", same as a missing id.
 */
export async function cancelBookingForUser(
  id: string,
  userId: string,
  today: string
): Promise<"cancelled" | "not_found" | "not_cancellable"> {
  const db = await getDb();
  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return "not_found";
  }
  const doc = await db.collection(COLLECTION).findOne({ _id: objectId, userId, deletedAt: { $exists: false } });
  if (!doc) return "not_found";
  if (doc.status !== "pending" && doc.status !== "confirmed") return "not_cancellable";
  const now = new Date().toISOString();
  const result = await db.collection(COLLECTION).updateOne(
    {
      _id: objectId,
      userId,
      deletedAt: { $exists: false },
      status: doc.status,
      date: { $gte: today },
      updatedAt: doc.updatedAt,
    },
    { $set: {
      status: "cancelled" satisfies BookingStatus, updatedAt: now,
      statusHistory: [...historyFor(doc), { status: "cancelled", at: now, actor: "customer", actorId: userId }],
    } }
  );
  if (result.matchedCount > 0) return "cancelled";
  const owned = await db
    .collection(COLLECTION)
    .countDocuments({ _id: objectId, userId, deletedAt: { $exists: false } }, { limit: 1 });
  return owned ? "not_cancellable" : "not_found";
}

export async function getBookingsForUser(userId: string): Promise<Booking[]> {
  const db = await getDb();
  const docs = await db
    .collection(COLLECTION)
    .find({ userId, deletedAt: { $exists: false } })
    .sort({ date: 1, time: 1 })
    .toArray();
  return docs.map(toBooking);
}

export async function getBookingById(id: string): Promise<Booking | null> {
  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return null;
  }
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ _id: objectId, deletedAt: { $exists: false } });
  return doc ? toBooking(doc) : null;
}

/** Private fields are added only for the authenticated admin detail page. */
export async function getAdminBookingById(id: string): Promise<AdminBooking | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id), deletedAt: { $exists: false } });
  return doc ? { ...toBooking(doc), adminNotes: doc.adminNotes ?? "", statusHistory: historyFor(doc) } : null;
}

export async function updateAdminNotes(id: string, adminNotes: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const db = await getDb();
  const result = await db.collection(COLLECTION).updateOne(
    { _id: new ObjectId(id), deletedAt: { $exists: false } },
    { $set: { adminNotes } }
  );
  return result.matchedCount > 0;
}

/**
 * Time ranges taken by confirmed bookings on a date. Safe to expose
 * publicly once the ids are stripped: no names or contact details.
 */
export async function getTakenRanges(
  date: string,
  excludeId?: string
): Promise<Array<TimeRange & { id: string }>> {
  const db = await getDb();
  const docs = await db
    .collection(COLLECTION)
    .find({ date, status: "confirmed", deletedAt: { $exists: false } })
    .project({ time: 1, durationMinutes: 1 })
    .sort({ time: 1 })
    .toArray();
  return docs
    .filter((d) => d._id.toString() !== excludeId)
    .map((d) => ({
      id: d._id.toString(),
      ...toRange(d.time, d.durationMinutes ?? DEFAULT_DURATION),
    }));
}

export async function hideBooking(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const db = await getDb();
  const result = await db.collection(COLLECTION).updateOne(
    { _id: new ObjectId(id), deletedAt: { $exists: false } },
    { $set: { deletedAt: new Date() } }
  );
  return result.matchedCount > 0;
}

export class BookingRequestConflict extends Error {}

/** A retry receives only its receipt, never the saved personal or admin details. */
export async function getBookingReceipt(key: string, hash: string) {
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ requestKey: key });
  if (!doc) return null;
  if (doc.requestHash !== hash) throw new BookingRequestConflict("Request details changed.");
  return { id: doc._id.toString(), referenceCode: doc.referenceCode as string };
}
