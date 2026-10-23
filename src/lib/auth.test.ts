import { createHmac } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAdminSessionToken,
  createUserSessionToken,
  verifyAdminSessionToken,
  verifyUserSessionToken,
} from "./auth";

const SECRET = "test-secret-for-unit-tests";
const ID = "64b7f0c2a1b2c3d4e5f60718";

beforeEach(() => {
  vi.stubEnv("ADMIN_SESSION_SECRET", SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("session tokens", () => {
  it("round-trips an admin token", () => {
    expect(verifyAdminSessionToken(createAdminSessionToken(ID))).toBe(ID);
  });

  it("round-trips a user token", () => {
    expect(verifyUserSessionToken(createUserSessionToken(ID))).toBe(ID);
  });

  it("rejects a tampered signature", () => {
    const token = createUserSessionToken(ID);
    const last = token.slice(-1);
    const tampered = token.slice(0, -1) + (last === "0" ? "1" : "0");
    expect(verifyUserSessionToken(tampered)).toBeNull();
  });

  it("rejects a valid signature attached to a different id", () => {
    const signature = createUserSessionToken(ID).split(".")[1];
    expect(verifyUserSessionToken(`64b7f0c2a1b2c3d4e5f60719.${signature}`)).toBeNull();
  });

  it("rejects a token signed with another secret", () => {
    const forged = createHmac("sha256", "other-secret").update(ID).digest("hex");
    expect(verifyAdminSessionToken(`${ID}.${forged}`)).toBeNull();
  });

  it.each([undefined, null, "", "abc", ".", "id.", ".sig", `${ID}.short`])(
    "rejects garbage input %j",
    (token) => {
      expect(verifyAdminSessionToken(token)).toBeNull();
    }
  );

  it("throws a clear error when the secret is missing", () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "");
    expect(() => createAdminSessionToken(ID)).toThrow(/ADMIN_SESSION_SECRET/);
  });
});
