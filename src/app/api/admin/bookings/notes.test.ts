import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSessionToken, sessionRevision } from "@/lib/auth";
import { PATCH as notesPatch } from "./[id]/notes/route";
import { PATCH as statusPatch } from "@/app/api/bookings/route";

const mocks = vi.hoisted(() => ({ token: "", admin: vi.fn(), save: vi.fn(), status: vi.fn(), booking: vi.fn(), ranges: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: mocks.token }) }) }));
vi.mock("@/lib/mongodb", () => ({ getDb: async () => ({ collection: () => ({ findOne: async () => { const admin = await mocks.admin("64b7f0c2a1b2c3d4e5f60718"); return admin ? { _id: admin.id } : null; } }) }) }));
vi.mock("@/lib/admins", () => ({ getAdminById: mocks.admin }));
vi.mock("@/lib/bookings", () => ({ updateAdminNotes: mocks.save, updateBookingStatus: mocks.status, getBookingById: mocks.booking, getTakenRanges: mocks.ranges }));
const id = "123456789012345678901234";
const context = { params: Promise.resolve({ id }) };
const request = (body: unknown) => new Request("http://localhost/api", { method: "PATCH", body: JSON.stringify(body) });
beforeEach(() => {
  vi.clearAllMocks();
  process.env.ADMIN_SESSION_SECRET = "test-secret-only";
  mocks.token = createAdminSessionToken("64b7f0c2a1b2c3d4e5f60718", sessionRevision({}));
  mocks.admin.mockResolvedValue({ id: "64b7f0c2a1b2c3d4e5f60718" });
  mocks.save.mockResolvedValue(true); mocks.status.mockResolvedValue("updated");
});
describe("private booking API permissions", () => {
  it("rejects logged-out callers and tampered sessions before any writes", async () => {
    for (const token of ["", "forged.signature"]) {
      mocks.token = token;
      expect((await notesPatch(request({ adminNotes: "secret" }), context)).status).toBe(401);
      expect((await statusPatch(request({ id, status: "cancelled" }))).status).toBe(401);
    }
    expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.status).not.toHaveBeenCalled();
  });
  it("rejects signed sessions without a real admin (including customers)", async () => {
    mocks.admin.mockResolvedValue(null);
    expect((await notesPatch(request({ adminNotes: "secret" }), context)).status).toBe(401);
    expect((await statusPatch(request({ id, status: "cancelled" }))).status).toBe(401);
    expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.status).not.toHaveBeenCalled();
  });
  it("validates notes and never passes other fields into a write", async () => {
    expect((await notesPatch(request({ adminNotes: { $set: "bad" } }), context)).status).toBe(400);
    const response = await notesPatch(request({ adminNotes: "  private  ", status: "confirmed" }), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(mocks.save).toHaveBeenCalledWith(id, "private");
  });
  it("returns 404 for a missing booking", async () => {
    mocks.save.mockResolvedValue(false);
    expect((await notesPatch(request({ adminNotes: "note" }), context)).status).toBe(404);
  });
  it("records the authenticated admin rather than a caller-supplied actor", async () => {
    expect((await statusPatch(request({ id, status: "cancelled", adminId: "someone-else" }))).status).toBe(200);
    expect(mocks.status).toHaveBeenCalledWith(id, "cancelled", "64b7f0c2a1b2c3d4e5f60718");
  });
  it("preserves overlap warnings and requires a real boolean override", async () => {
    mocks.booking.mockResolvedValue({ _id: id, time: "10:00", date: "2099-12-01", durationMinutes: 60, parentName: "Jamie" });
    mocks.ranges.mockResolvedValue([{ id: "other", start: "10:00", end: "11:00" }]);
    const response = await statusPatch(request({ id, status: "confirmed" }));
    expect(response.status).toBe(409); expect(await response.json()).toHaveProperty("overlap");
    expect(mocks.status).not.toHaveBeenCalled();
    expect((await statusPatch(request({ id, status: "confirmed", force: true }))).status).toBe(200);
  });
  it("reports conflicting or cancelled bookings without claiming success", async () => {
    for (const result of ["conflict", "cancelled"]) {
      mocks.status.mockResolvedValue(result);
      expect((await statusPatch(request({ id, status: "cancelled" }))).status).toBe(409);
    }
  });
});
