import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { ObjectId, type Document } from "mongodb";
import { getDb } from "./mongodb";

const COLLECTION = "users";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

function hashPassword(password: string, salt: string = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function toPublicUser(doc: Document): PublicUser {
  return { id: doc._id.toString(), name: doc.name, email: doc.email };
}

/** Returns the new user, or null if that email is already registered. */
export async function createUser(
  name: string,
  email: string,
  password: string
): Promise<PublicUser | null> {
  const db = await getDb();
  const normalizedEmail = email.toLowerCase();

  const existing = await db.collection(COLLECTION).findOne({ email: normalizedEmail });
  if (existing) return null;

  const { salt, hash } = hashPassword(password);
  const result = await db.collection(COLLECTION).insertOne({
    name,
    email: normalizedEmail,
    passwordSalt: salt,
    passwordHash: hash,
    createdAt: new Date().toISOString(),
  });

  return { id: result.insertedId.toString(), name, email: normalizedEmail };
}

/** Returns the user if the email/password match, otherwise null. */
export async function verifyUserCredentials(
  email: string,
  password: string
): Promise<PublicUser | null> {
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ email: email.toLowerCase() });
  if (!doc) return null;

  const { hash } = hashPassword(password, doc.passwordSalt);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(doc.passwordHash as string, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return toPublicUser(doc);
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  const db = await getDb();
  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return null;
  }
  const doc = await db.collection(COLLECTION).findOne({ _id: objectId });
  return doc ? toPublicUser(doc) : null;
}
