import { MongoServerError, ObjectId, type Db, type Document } from "mongodb";
import { getDb } from "./mongodb";
import { generateReferenceCode } from "./referenceCode";
import { DEFAULT_DURATION, toRange, type TimeRange } from "./schedule";
import type { Booking, BookingStatus, NewBooking } from "./types";

const COLLECTION = "bookings";

let indexesReady: Promise<unknown> | null = null;

function ensureIndexes(db: Db) {
  indexesReady ??= Promise.all([
    // Partial so older bookings without a code don't count as duplicates.
    db.collection(COLLECTION).createIndex(
      { referenceCode: 1 },
      { unique: true, partialFilterExpression: { referenceCode: { $type: "string" } } }
    ),
    db.collection(COLLECTION).createIndex({ userId: 1 }),
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
  userId?: string
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
        ...(userId ? { userId } : {}),
        referenceCode,
        status: "pending" satisfies BookingStatus,
        createdAt: now,
        updatedAt: now,
      });
      return { id: result.insertedId.toString(), referenceCode };
    } catch (err) {
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
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(toBooking);
}

export async function getConfirmedBookings(): Promise<Booking[]> {
  const db = await getDb();
  const docs = await db
    .collection(COLLECTION)
    .find({ status: "confirmed" })
    .sort({ date: 1, time: 1 })
    .toArray();
  return docs.map(toBooking);
}

/**
 * Admin confirm/decline. Returns "not_found" for unknown ids and
 * "cancelled" if the customer already cancelled (admins can't undo that).
 */
export async function updateBookingStatus(
  id: string,
  status: BookingStatus
): Promise<"updated" | "not_found" | "cancelled"> {
  const db = await getDb();
  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return "not_found";
  }
  const result = await db
    .collection(COLLECTION)
    .updateOne(
      { _id: objectId, status: { $ne: "cancelled" } },
      { $set: { status, updatedAt: new Date().toISOString() } }
    );
  if (result.matchedCount > 0) return "updated";
  const exists = await db.collection(COLLECTION).countDocuments({ _id: objectId }, { limit: 1 });
  return exists ? "cancelled" : "not_found";
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
  const result = await db.collection(COLLECTION).updateOne(
    {
      _id: objectId,
      userId,
      status: { $in: ["pending", "confirmed"] },
      date: { $gte: today },
    },
    { $set: { status: "cancelled" satisfies BookingStatus, updatedAt: new Date().toISOString() } }
  );
  if (result.matchedCount > 0) return "cancelled";
  const owned = await db
    .collection(COLLECTION)
    .countDocuments({ _id: objectId, userId }, { limit: 1 });
  return owned ? "not_cancellable" : "not_found";
}

export async function getBookingsForUser(userId: string): Promise<Booking[]> {
  const db = await getDb();
  const docs = await db
    .collection(COLLECTION)
    .find({ userId })
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
  const doc = await db.collection(COLLECTION).findOne({ _id: objectId });
  return doc ? toBooking(doc) : null;
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
    .find({ date, status: "confirmed" })
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
