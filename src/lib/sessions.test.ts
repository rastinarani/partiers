import { ObjectId } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSessionToken, createUserSessionToken, sessionRevision } from "./auth";
import { invalidateSession, verifyAdminSessionToken, verifyUserSessionToken } from "./sessions";

const mocks = vi.hoisted(() => ({ find: vi.fn(), update: vi.fn(), collection: vi.fn() }));
vi.mock("./mongodb", () => ({ getDb: async () => ({ collection: mocks.collection }) }));
const id = new ObjectId("64b7f0c2a1b2c3d4e5f60718");
beforeEach(() => {
  vi.stubEnv("ADMIN_SESSION_SECRET", "isolated-unit-session-secret");
  vi.clearAllMocks();
  mocks.collection.mockReturnValue({ findOne: mocks.find, updateOne: mocks.update });
  mocks.update.mockResolvedValue({ matchedCount: 1 });
});
afterEach(() => vi.unstubAllEnvs());

describe.each([
  ["user", "users", createUserSessionToken, verifyUserSessionToken],
  ["admin", "admins", createAdminSessionToken, verifyAdminSessionToken],
] as const)("%s session revocation (mock database only)", (role, collection, create, verify) => {
  it("accepts a current session for an existing identity, including older documents without a version", async () => {
    mocks.find.mockResolvedValue({ _id: id, passwordHash: "test-hash" });
    const token = create(id.toString(), sessionRevision({ passwordHash: "test-hash" }));
    expect(await verify(token)).toBe(id.toString());
    expect(mocks.collection).toHaveBeenCalledWith(collection);
  });
  it("rejects deleted identities and changed versions or password hashes", async () => {
    const token = create(id.toString(), sessionRevision({ passwordHash: "test-hash" }));
    for (const doc of [null, { _id: id, passwordHash: "test-hash", sessionVersion: "rotated" }, { _id: id, passwordHash: "changed" }]) {
      mocks.find.mockResolvedValue(doc);
      expect(await verify(token)).toBeNull();
    }
  });
  it("invalidates all copies and ignores a replayed logout after a new login", async () => {
    const doc = { _id: id, passwordHash: "test-hash", sessionVersion: "" };
    mocks.find.mockImplementation(async () => ({ ...doc }));
    mocks.update.mockImplementation(async (_filter, update) => {
      doc.sessionVersion = update.$set.sessionVersion;
      return { matchedCount: 1 };
    });
    const old = create(id.toString(), sessionRevision(doc));
    await invalidateSession(role, old);
    expect(await verify(old)).toBeNull();
    const fresh = create(id.toString(), sessionRevision(doc));
    await invalidateSession(role, old);
    expect(await verify(fresh)).toBe(id.toString());
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update.mock.calls[0][0]).toEqual({ _id: id, passwordHash: "test-hash", sessionVersion: "" });
  });
  it("does not query or write for malformed, expired or wrong-role tokens", async () => {
    const other = role === "admin" ? createUserSessionToken : createAdminSessionToken;
    for (const token of [undefined, "bad.signature", other(id.toString(), sessionRevision({}))]) {
      expect(await verify(token)).toBeNull();
      await invalidateSession(role, token);
    }
    expect(mocks.find).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("propagates storage failures so logout cannot falsely report successful revocation", async () => {
    mocks.find.mockResolvedValue({ _id: id });
    mocks.update.mockRejectedValue(new Error("test database offline"));
    await expect(invalidateSession(role, create(id.toString(), sessionRevision({})))).rejects.toThrow("offline");
  });
});
