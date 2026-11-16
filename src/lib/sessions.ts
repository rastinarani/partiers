import { randomBytes } from "crypto";
import { ObjectId } from "mongodb";
import { readAdminSessionToken, readUserSessionToken, sessionRevision, type SessionRole } from "./auth";
import { getDb } from "./mongodb";

async function findSession(role: SessionRole, token: string | undefined | null) {
  const claims = role === "admin" ? readAdminSessionToken(token) : readUserSessionToken(token);
  if (!claims) return null;
  const db = await getDb();
  const collection = db.collection(role === "admin" ? "admins" : "users");
  const doc = await collection.findOne({ _id: new ObjectId(claims.id) });
  if (!doc || sessionRevision(doc) !== claims.revision) return null;
  return { claims, collection, doc };
}

export async function verifyAdminSessionToken(token: string | undefined | null): Promise<string | null> {
  return (await findSession("admin", token))?.claims.id ?? null;
}

export async function verifyUserSessionToken(token: string | undefined | null): Promise<string | null> {
  return (await findSession("user", token))?.claims.id ?? null;
}

export async function invalidateSession(role: SessionRole, token: string | undefined | null): Promise<void> {
  const session = await findSession(role, token);
  if (!session) return;
  const { collection, doc } = session;
  // A replayed logout cannot revoke a newer login or overwrite a password change.
  await collection.updateOne(
    { _id: doc._id, sessionVersion: doc.sessionVersion ?? null, passwordHash: doc.passwordHash ?? null },
    { $set: { sessionVersion: randomBytes(32).toString("hex") } },
  );
}
