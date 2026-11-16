import { createHmac } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSessionToken, createUserSessionToken, readAdminSessionToken, readUserSessionToken, sessionRevision, SESSION_MAX_AGE } from "./auth";

const SECRET = "test-secret-for-unit-tests";
const ID = "64b7f0c2a1b2c3d4e5f60718";
let revision: string;
beforeEach(() => {
  vi.stubEnv("ADMIN_SESSION_SECRET", SECRET);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-16T12:00:00Z"));
  revision = sessionRevision({});
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

function sign(payload: unknown, purpose = "user") {
  const encoded = Buffer.from(typeof payload === "string" ? payload : JSON.stringify(payload)).toString("base64url");
  const key = createHmac("sha256", SECRET).update(`partiers:session:v1:${purpose}`).digest();
  return `${encoded}.${createHmac("sha256", key).update(encoded).digest("hex")}`;
}

describe("signed session claims", () => {
  it.each([[createAdminSessionToken, readAdminSessionToken, "admin"], [createUserSessionToken, readUserSessionToken, "user"]] as const)("round-trips a purpose-bound session", (create, read, role) => {
    expect(read(create(ID, revision))).toEqual({ id: ID, role, revision, expiresAt: Date.now() / 1000 + SESSION_MAX_AGE });
  });
  it("rejects both directions of customer/admin token substitution, even for the same id", () => {
    expect(readAdminSessionToken(createUserSessionToken(ID, revision))).toBeNull();
    expect(readUserSessionToken(createAdminSessionToken(ID, revision))).toBeNull();
  });
  it("expires at exactly 30 days, regardless of browser cookie retention", () => {
    const token = createUserSessionToken(ID, revision);
    vi.advanceTimersByTime(SESSION_MAX_AGE * 1000 - 1);
    expect(readUserSessionToken(token)?.id).toBe(ID);
    vi.advanceTimersByTime(1);
    expect(readUserSessionToken(token)).toBeNull();
  });
  it("rejects tampering with the expiry, identity, revision or signature", () => {
    const token = createUserSessionToken(ID, revision);
    const [payload, signature] = token.split(".");
    const claims = readUserSessionToken(token)!;
    for (const patch of [{ expiresAt: claims.expiresAt + 100 }, { id: ID.replace(/8$/, "9") }, { revision: "a".repeat(64) }]) {
      const forged = Buffer.from(JSON.stringify({ ...claims, ...patch })).toString("base64url");
      expect(readUserSessionToken(`${forged}.${signature}`)).toBeNull();
    }
    expect(readUserSessionToken(`${payload}.${"0".repeat(64)}`)).toBeNull();
    expect(readUserSessionToken(`${token}.extra`)).toBeNull();
  });
  it.each([null, [], "bad JSON", {}, { id: ID, role: "admin" },
    { id: "bad", role: "user" }, { expiresAt: "tomorrow" }, { expiresAt: 1 },
    { expiresAt: Date.parse("2099-01-01") / 1000 }, { revision: {} }])("rejects correctly signed malformed claims %j", (patch) => {
    const claims = readUserSessionToken(createUserSessionToken(ID, revision))!;
    expect(readUserSessionToken(sign(patch && typeof patch === "object" && !Array.isArray(patch) ? { ...claims, ...patch, ...(Object.keys(patch).length ? {} : { id: undefined }) } : patch))).toBeNull();
  });
  it.each([undefined, null, "", "abc", ".", "id.", ".sig", `${ID}.short`, "x".repeat(1025)])("rejects garbage %j", (token) => {
    expect(readUserSessionToken(token)).toBeNull();
  });
  it("rejects the old signed-id format", () => {
    const signature = createHmac("sha256", SECRET).update(ID).digest("hex");
    expect(readUserSessionToken(`${ID}.${signature}`)).toBeNull();
  });
  it("rejects tokens after a secret rotation", () => {
    const token = createUserSessionToken(ID, revision);
    vi.stubEnv("ADMIN_SESSION_SECRET", "different-test-secret");
    expect(readUserSessionToken(token)).toBeNull();
  });
  it("changes the revision for either a logout or a password change", () => {
    expect(sessionRevision({ sessionVersion: "new" })).not.toBe(revision);
    expect(sessionRevision({ passwordHash: "new" })).not.toBe(revision);
    expect(sessionRevision({})).toBe(revision);
  });
  it("throws a clear error when the secret is missing", () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "");
    expect(() => createAdminSessionToken(ID, revision)).toThrow(/ADMIN_SESSION_SECRET/);
  });
});
