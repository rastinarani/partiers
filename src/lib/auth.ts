import { createHmac, timingSafeEqual } from "crypto";

// Single shared admin password (no user accounts). A logged-in session is
// just a cookie whose value is an HMAC of a fixed string, keyed by a
// server-only secret — that's enough to prove "this browser knows the
// secret" without needing a database-backed session table.
export const ADMIN_COOKIE_NAME = "partiers_admin_session";
const SESSION_PAYLOAD = "partiers-admin";

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "Missing ADMIN_SESSION_SECRET environment variable. Add it to .env.local (see .env.example)."
    );
  }
  return secret;
}

export function createSessionToken(): string {
  return createHmac("sha256", getSecret()).update(SESSION_PAYLOAD).digest("hex");
}

export function isValidSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const expected = createSessionToken();
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function checkAdminPassword(password: unknown): boolean {
  const configured = process.env.ADMIN_PASSWORD;
  if (!configured || typeof password !== "string") return false;
  const a = Buffer.from(password);
  const b = Buffer.from(configured);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Customer accounts: a per-user session cookie of the form
// "<userId>.<hmac(userId)>". Unlike the single shared admin cookie, this
// needs to carry *which* user is signed in, so it's a signed id rather
// than a fixed value.
export const USER_COOKIE_NAME = "partiers_user_session";

export function createUserSessionToken(userId: string): string {
  const signature = createHmac("sha256", getSecret()).update(userId).digest("hex");
  return `${userId}.${signature}`;
}

export function verifyUserSessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const [userId, signature] = token.split(".");
  if (!userId || !signature) return null;

  const expected = createHmac("sha256", getSecret()).update(userId).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return userId;
}
