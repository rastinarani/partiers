import { ObjectId } from "mongodb";
import { scryptSync } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSessionToken, createUserSessionToken, sessionRevision } from "@/lib/auth";
import { POST as userLogout } from "./auth/logout/route";
import { POST as adminLogout } from "./admin/logout/route";
import { POST as password } from "./account/password/route";
import { PATCH as profile } from "./account/profile/route";
import { POST as cancel } from "./account/bookings/[id]/cancel/route";
import { PATCH as bookingStatus } from "./bookings/route";
import { PATCH as reviewStatus } from "./reviews/route";
import { POST as block, DELETE as unblock } from "./admin/blocked-dates/route";
import { PATCH as notes } from "./admin/bookings/[id]/notes/route";
import { DELETE as hideBooking } from "./admin/bookings/[id]/route";
import { DELETE as hideReview } from "./admin/reviews/[id]/route";
import AdminCalendar from "@/app/admin/calendar/page";

const mocks = vi.hoisted(() => ({ token: "", find: vi.fn(), update: vi.fn(), collection: vi.fn(), bookings: vi.fn(), blocked: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: mocks.token }) }) }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("@/lib/mongodb", () => ({ getDb: async () => ({ collection: mocks.collection }) }));
vi.mock("@/lib/bookings", () => ({ getConfirmedBookings: mocks.bookings }));
vi.mock("@/lib/blockedDates", () => ({ getBlockedDates: mocks.blocked }));
const id = new ObjectId("64b7f0c2a1b2c3d4e5f60718");
const context = { params: Promise.resolve({ id: id.toString() }) };
const request = () => new Request("http://localhost/api", { method: "POST", body: "{}" });
beforeEach(() => {
  vi.stubEnv("ADMIN_SESSION_SECRET", "isolated-route-session-secret");
  vi.clearAllMocks();
  mocks.collection.mockReturnValue({ findOne: mocks.find, updateOne: mocks.update });
  mocks.find.mockResolvedValue({ _id: id, sessionVersion: "revoked" });
  mocks.update.mockResolvedValue({ matchedCount: 1 });
});
afterEach(() => vi.unstubAllEnvs());

it.each([profile, password, (req: Request) => cancel(req as never, context)])("rejects a revoked customer session before reading input or mutating data", async (handler) => {
  mocks.token = createUserSessionToken(id.toString(), sessionRevision({}));
  expect((await handler(request())).status).toBe(401);
  expect(mocks.update).not.toHaveBeenCalled();
});
it.each([bookingStatus, reviewStatus, block, unblock, (req: Request) => notes(req, context), (req: Request) => hideBooking(req, context), (req: Request) => hideReview(req, context)])("rejects a revoked admin session before reading input or mutating data", async (handler) => {
  mocks.token = createAdminSessionToken(id.toString(), sessionRevision({}));
  expect((await handler(request())).status).toBe(401);
  expect(mocks.update).not.toHaveBeenCalled();
});
it("protects calendar data after revocation, even when Proxy accepts the signed claims", async () => {
  mocks.token = createAdminSessionToken(id.toString(), sessionRevision({}));
  await expect(AdminCalendar()).rejects.toThrow("redirect:/admin/login");
  expect(mocks.bookings).not.toHaveBeenCalled();
  expect(mocks.blocked).not.toHaveBeenCalled();
});

describe.each([[userLogout, createUserSessionToken, "partiers_user_session"], [adminLogout, createAdminSessionToken, "partiers_admin_session"]] as const)("logout", (logout, create, cookieName) => {
  it("revokes before clearing its own cookie", async () => {
    mocks.find.mockResolvedValue({ _id: id });
    mocks.token = create(id.toString(), sessionRevision({}));
    const response = await logout();
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(response.headers.get("set-cookie")).toContain(`${cookieName}=;`);
    expect(response.headers.get("set-cookie")).toContain("Expires=Thu, 01 Jan 1970");
  });
  it("does not claim success or clear the cookie if revocation storage fails", async () => {
    mocks.find.mockResolvedValue({ _id: id });
    mocks.token = create(id.toString(), sessionRevision({}));
    mocks.update.mockRejectedValueOnce(new Error("test failure"));
    const response = await logout();
    expect(response.status).toBe(503);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});

it("changes the password and revision in one conditional write, then clears the session", async () => {
  const passwordSalt = "unit-test-salt";
  const passwordHash = scryptSync("old-unit-password", passwordSalt, 64).toString("hex");
  const doc = { _id: id, passwordSalt, passwordHash };
  mocks.find.mockResolvedValue(doc);
  mocks.token = createUserSessionToken(id.toString(), sessionRevision(doc));
  const response = await password(new Request("http://localhost/api", { method: "POST", body: JSON.stringify({ currentPassword: "old-unit-password", newPassword: "new-unit-password" }) }));
  expect(response.status).toBe(200);
  expect(response.headers.get("set-cookie")).toContain("partiers_user_session=;");
  const [filter, update] = mocks.update.mock.calls[0];
  expect(filter).toEqual({ _id: id, passwordHash, sessionVersion: null });
  expect(update.$set.passwordHash).not.toBe(passwordHash);
  expect(update.$set.sessionVersion).toMatch(/^[a-f0-9]{64}$/);
});
it("rejects a password change when the session is revoked between authorization and the password read", async () => {
  const doc = { _id: id, passwordSalt: "test-salt", passwordHash: "test-hash" };
  mocks.token = createUserSessionToken(id.toString(), sessionRevision(doc));
  mocks.find.mockResolvedValueOnce(doc).mockResolvedValueOnce({ ...doc, sessionVersion: "rotated" });
  const response = await password(new Request("http://localhost/api", { method: "POST", body: JSON.stringify({ currentPassword: "old-unit-password", newPassword: "new-unit-password" }) }));
  expect(response.status).toBe(401);
  expect(mocks.update).not.toHaveBeenCalled();
});
