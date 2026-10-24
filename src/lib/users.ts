import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { ObjectId, type Document } from "mongodb";
import { getDb } from "./mongodb";

const COLLECTION = "users";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone: string;
}

function hashPassword(password: string, salt: string = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function toPublicUser(doc: Document): PublicUser {
  return { id: doc._id.toString(), name: doc.name, email: doc.email, phone: doc.phone ?? "" };
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

  return { id: result.insertedId.toString(), name, email: normalizedEmail, phone: "" };
}

/** Returns the user if the email/password match, otherwise null. */
export async function verifyUserCredentials(
  email: string,
  password: string
): Promise<PublicUser | null> {
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ email: email.toLowerCase() });
  if (!doc) return null;

  return passwordMatches(doc, password) ? toPublicUser(doc) : null;
}

function passwordMatches(doc: Document, password: string): boolean {
  const { hash } = hashPassword(password, doc.passwordSalt);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(doc.passwordHash as string, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function toObjectId(id: string): ObjectId | null {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  const objectId = toObjectId(id);
  if (!objectId) return null;
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ _id: objectId });
  return doc ? toPublicUser(doc) : null;
}

/** Returns false if the user doesn't exist. */
export async function updateUserProfile(
  id: string,
  name: string,
  phone: string
): Promise<boolean> {
  const objectId = toObjectId(id);
  if (!objectId) return false;
  const db = await getDb();
  const result = await db
    .collection(COLLECTION)
    .updateOne({ _id: objectId }, { $set: { name, phone, updatedAt: new Date().toISOString() } });
  return result.matchedCount > 0;
}

export async function changeUserPassword(
  id: string,
  currentPassword: string,
  newPassword: string
): Promise<"changed" | "wrong_password" | "not_found"> {
  const objectId = toObjectId(id);
  if (!objectId) return "not_found";
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ _id: objectId });
  if (!doc) return "not_found";
  if (!passwordMatches(doc, currentPassword)) return "wrong_password";

  const { salt, hash } = hashPassword(newPassword);
  await db.collection(COLLECTION).updateOne(
    { _id: objectId },
    { $set: { passwordSalt: salt, passwordHash: hash, updatedAt: new Date().toISOString() } }
  );
  return "changed";
}
