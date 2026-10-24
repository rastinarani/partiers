import type { Db } from "mongodb";
import { getDb } from "./mongodb";

const COLLECTION = "blockedDates";

export interface BlockedDate {
  date: string; // "YYYY-MM-DD"
  reason: string; // admin-only note, never sent to the public
}

let indexReady: Promise<unknown> | null = null;

function ensureIndex(db: Db) {
  indexReady ??= db
    .collection(COLLECTION)
    .createIndex({ date: 1 }, { unique: true })
    .catch((err) => {
      indexReady = null;
      throw err;
    });
  return indexReady;
}

/** Blocked dates from `fromDate` onward (all of them if omitted), soonest first. */
export async function getBlockedDates(fromDate?: string): Promise<BlockedDate[]> {
  const db = await getDb();
  const docs = await db
    .collection(COLLECTION)
    .find(fromDate ? { date: { $gte: fromDate } } : {})
    .sort({ date: 1 })
    .toArray();
  return docs.map((d) => ({ date: d.date, reason: d.reason ?? "" }));
}

export async function isDateBlocked(date: string): Promise<boolean> {
  const db = await getDb();
  return (await db.collection(COLLECTION).countDocuments({ date }, { limit: 1 })) > 0;
}

export async function blockDate(date: string, reason: string): Promise<void> {
  const db = await getDb();
  await ensureIndex(db);
  await db
    .collection(COLLECTION)
    .updateOne(
      { date },
      { $set: { reason }, $setOnInsert: { createdAt: new Date().toISOString() } },
      { upsert: true }
    );
}

export async function unblockDate(date: string): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTION).deleteOne({ date });
}
