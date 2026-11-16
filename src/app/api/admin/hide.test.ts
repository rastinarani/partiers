import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSessionToken, createUserSessionToken, sessionRevision } from "@/lib/auth";
import { DELETE as hideBooking } from "./bookings/[id]/route";
import { DELETE as hideReview } from "./reviews/[id]/route";

const mocks = vi.hoisted(() => ({ token: "", admin: vi.fn(), booking: vi.fn(), review: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: mocks.token }) }) }));
vi.mock("@/lib/mongodb", () => ({ getDb: async () => ({ collection: () => ({ findOne: async () => { const admin = await mocks.admin("64b7f0c2a1b2c3d4e5f60718"); return admin ? { _id: admin.id } : null; } }) }) }));
vi.mock("@/lib/admins", () => ({ getAdminById: mocks.admin }));
vi.mock("@/lib/bookings", () => ({ hideBooking: mocks.booking }));
vi.mock("@/lib/reviews", () => ({ hideReview: mocks.review }));
const id = "123456789012345678901234";
const context = { params: Promise.resolve({ id }) };
const request = () => new Request("http://localhost/api", { method: "DELETE" });
beforeEach(() => {
  vi.clearAllMocks();
  process.env.ADMIN_SESSION_SECRET = "test-admin-secret";
  mocks.token = createAdminSessionToken("64b7f0c2a1b2c3d4e5f60718", sessionRevision({}));
  mocks.admin.mockImplementation(async (id) => id === "64b7f0c2a1b2c3d4e5f60718" ? { id } : null);
  mocks.booking.mockResolvedValue(true); mocks.review.mockResolvedValue(true);
});
describe.each([hideBooking, hideReview])("admin hiding permissions", (hide) => {
  it("rejects missing, forged and customer cookies without writing", async () => {
    for (const token of ["", "forged.signature", createUserSessionToken("64b7f0c2a1b2c3d4e5f60719", sessionRevision({}))]) {
      mocks.token = token;
      expect((await hide(request(), context)).status).toBe(401);
    }
    expect(mocks.booking).not.toHaveBeenCalled(); expect(mocks.review).not.toHaveBeenCalled();
  });
  it("rejects signed cookies for removed admins", async () => {
    mocks.admin.mockResolvedValue(null);
    expect((await hide(request(), context)).status).toBe(401);
    expect(mocks.booking).not.toHaveBeenCalled(); expect(mocks.review).not.toHaveBeenCalled();
  });
  it("hides only the requested record for a real admin", async () => {
    expect((await hide(request(), context)).status).toBe(200);
    expect(hide === hideBooking ? mocks.booking : mocks.review).toHaveBeenCalledWith(id);
  });
  it("reports missing or already hidden records without claiming success", async () => {
    mocks.booking.mockResolvedValue(false); mocks.review.mockResolvedValue(false);
    expect((await hide(request(), context)).status).toBe(404);
  });
});
