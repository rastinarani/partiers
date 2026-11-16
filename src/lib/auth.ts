import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE_NAME = "partiers_admin_session";
export const USER_COOKIE_NAME = "partiers_user_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
export type SessionRole = "admin" | "user";

interface SessionClaims {
  id: string;
  role: SessionRole;
  revision: string;
  expiresAt: number;
}

function getKey(purpose: string): Buffer {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing ADMIN_SESSION_SECRET environment variable. Add it to .env.local (see .env.example).");
  }
  // Separate signing keys by purpose without requiring new deployment settings.
  return createHmac("sha256", secret).update(`partiers:session:v1:${purpose}`).digest();
}

export function sessionRevision(doc: Record<string, unknown>): string {
  return createHmac("sha256", getKey("revision"))
    .update(JSON.stringify([doc.sessionVersion ?? "", doc.passwordHash ?? ""]))
    .digest("hex");
}

function createToken(role: SessionRole, id: string, revision: string): string {
  if (!/^[a-f0-9]{24}$/.test(id) || !/^[a-f0-9]{64}$/.test(revision)) {
    throw new Error("Invalid session identity.");
  }
  const claims: SessionClaims = { id, role, revision, expiresAt: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", getKey(role)).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

function readToken(role: SessionRole, token: string | undefined | null): SessionClaims | null {
  if (!token || token.length > 1024) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!/^[A-Za-z0-9_-]+$/.test(payload) || !/^[a-f0-9]{64}$/.test(signature)) return null;
  const expected = createHmac("sha256", getKey(role)).update(payload).digest();
  if (!timingSafeEqual(Buffer.from(signature, "hex"), expected)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (!claims || claims.role !== role || typeof claims.id !== "string" || !/^[a-f0-9]{24}$/.test(claims.id)
      || typeof claims.revision !== "string" || !/^[a-f0-9]{64}$/.test(claims.revision)
      || !Number.isSafeInteger(claims.expiresAt) || claims.expiresAt <= now
      || claims.expiresAt > now + SESSION_MAX_AGE) return null;
    return claims;
  } catch {
    return null;
  }
}

export const createAdminSessionToken = (id: string, revision: string) => createToken("admin", id, revision);
export const createUserSessionToken = (id: string, revision: string) => createToken("user", id, revision);
// Proxy only checks the signed claims. Pages and APIs must also check the database.
export const readAdminSessionToken = (token: string | undefined | null) => readToken("admin", token);
export const readUserSessionToken = (token: string | undefined | null) => readToken("user", token);
