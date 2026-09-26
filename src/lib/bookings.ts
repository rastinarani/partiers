import { ObjectId, type Document } from "mongodb";
import { getDb } from "./mongodb";
import type { Booking, BookingStatus, NewBooking } from "./types";

const COLLECTION = "bookings";

function toBooking(doc: Document): Booking {
  return {
    _id: doc._id.toString(),
    parentName: doc.parentName,
    contact: doc.contact,
    childName: doc.childName,
    childAge: doc.childAge,
    date: doc.date,
    time: doc.time,
    notes: doc.notes ?? "",
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function createBooking(input: NewBooking): Promise<string> {
  const db = await getDb();
  const now = new Date().toISOString();
  const result = await db.collection(COLLECTION).insertOne({
    ...input,
    status: "pending" satisfies BookingStatus,
    createdAt: now,
    updatedAt: now,
  });
  return result.insertedId.toString();
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

export async function updateBookingStatus(
  id: string,
  status: BookingStatus
): Promise<boolean> {
  const db = await getDb();
  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return false;
  }
  const result = await db
    .collection(COLLECTION)
    .updateOne(
      { _id: objectId },
      { $set: { status, updatedAt: new Date().toISOString() } }
    );
  return result.matchedCount > 0;
}
