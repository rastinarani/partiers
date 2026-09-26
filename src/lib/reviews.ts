import { ObjectId, type Document } from "mongodb";
import { getDb } from "./mongodb";
import type { NewReview, Review, ReviewStatus } from "./types";

const COLLECTION = "reviews";

function toReview(doc: Document): Review {
  return {
    _id: doc._id.toString(),
    name: doc.name,
    rating: doc.rating,
    comment: doc.comment,
    status: doc.status,
    createdAt: doc.createdAt,
  };
}

export async function createReview(input: NewReview): Promise<string> {
  const db = await getDb();
  const result = await db.collection(COLLECTION).insertOne({
    ...input,
    status: "pending" satisfies ReviewStatus,
    createdAt: new Date().toISOString(),
  });
  return result.insertedId.toString();
}

export async function getApprovedReviews(): Promise<Review[]> {
  const db = await getDb();
  const docs = await db
    .collection(COLLECTION)
    .find({ status: "approved" })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(toReview);
}

export async function getAllReviews(): Promise<Review[]> {
  const db = await getDb();
  const docs = await db
    .collection(COLLECTION)
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(toReview);
}

export async function updateReviewStatus(
  id: string,
  status: ReviewStatus
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
    .updateOne({ _id: objectId }, { $set: { status } });
  return result.matchedCount > 0;
}
