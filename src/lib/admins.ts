import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { ObjectId, type Document } from "mongodb";
import { getDb } from "./mongodb";

const COLLECTION = "admins";

export interface PublicAdmin {
  id: string;
  name: string;
  email: string;
}

// Admin accounts aren't created through a public signup form (that would
// let anyone make themselves an admin) — see scripts/create-admin.mjs.
function hashPassword(password: string, salt: string = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function toPublicAdmin(doc: Document): PublicAdmin {
  return { id: doc._id.toString(), name: doc.name, email: doc.email };
}

export async function verifyAdminCredentials(
  email: string,
  password: string
): Promise<PublicAdmin | null> {
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ email: email.toLowerCase() });
  if (!doc) return null;

  const { hash } = hashPassword(password, doc.passwordSalt);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(doc.passwordHash as string, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return toPublicAdmin(doc);
}

export async function getAdminById(id: string): Promise<PublicAdmin | null> {
  const db = await getDb();
  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return null;
  }
  const doc = await db.collection(COLLECTION).findOne({ _id: objectId });
  return doc ? toPublicAdmin(doc) : null;
}
