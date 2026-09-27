import { createHmac, timingSafeEqual } from "crypto";

// Both admin and customer sessions work the same way: a cookie shaped
// like "<id>.<hmac(id)>", where the id points at a document in the
// "admins" or "users" collection respectively. Signing (rather than
// storing sessions in the DB) means we don't need a sessions table or
// cleanup job for a site this size.
function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "Missing ADMIN_SESSION_SECRET environment variable. Add it to .env.local (see .env.example)."
    );
  }
  return secret;
}

function createSignedId(id: string): string {
  const signature = createHmac("sha256", getSecret()).update(id).digest("hex");
  return `${id}.${signature}`;
}

function verifySignedId(token: string | undefined | null): string | null {
  if (!token) return null;
  const [id, signature] = token.split(".");
  if (!id || !signature) return null;

  const expected = createHmac("sha256", getSecret()).update(id).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return id;
}

export const ADMIN_COOKIE_NAME = "partiers_admin_session";
export const createAdminSessionToken = createSignedId;
export const verifyAdminSessionToken = verifySignedId;

export const USER_COOKIE_NAME = "partiers_user_session";
export const createUserSessionToken = createSignedId;
export const verifyUserSessionToken = verifySignedId;
