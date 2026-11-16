import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import { getAllBookings, getBookingsForUser, getBookingById, getAdminBookingById, getConfirmedBookings, getTakenRanges, hideBooking, updateAdminNotes, updateBookingStatus, cancelBookingForUser } from "./bookings";
import { getAllReviews, getApprovedReviews, hideReview, updateReviewStatus } from "./reviews";

const db = vi.hoisted(() => ({ find: vi.fn(), findOne: vi.fn(), updateOne: vi.fn(), countDocuments: vi.fn(), sort: vi.fn(), project: vi.fn(), toArray: vi.fn() }));
vi.mock("./mongodb", () => ({ getDb: async () => ({ collection: () => db }) }));
const id = new ObjectId().toHexString();
beforeEach(() => {
  vi.clearAllMocks();
  db.find.mockReturnValue(db); db.sort.mockReturnValue(db); db.project.mockReturnValue(db);
  db.toArray.mockResolvedValue([]); db.findOne.mockResolvedValue(null);
  db.updateOne.mockResolvedValue({ matchedCount: 1 });
});

describe("soft deletion", () => {
  it.each([hideBooking, hideReview])("only adds a database date; preserves contents and original timestamp on repeat", async (hide) => {
    expect(await hide(id)).toBe(true);
    expect(db.updateOne).toHaveBeenCalledWith({ _id: new ObjectId(id), deletedAt: { $exists: false } }, { $set: { deletedAt: expect.any(Date) } });
    db.updateOne.mockResolvedValue({ matchedCount: 0 });
    expect(await hide(id)).toBe(false);
    expect(await hide("bad-id")).toBe(false);
    expect(db.updateOne).toHaveBeenCalledTimes(2);
  });
  it("excludes hidden bookings from lists, customer views, calendar and availability", async () => {
    await getAllBookings(); await getBookingsForUser("owner"); await getConfirmedBookings(); await getTakenRanges("2099-12-01");
    expect(db.find.mock.calls.map(([filter]) => filter)).toEqual([
      { deletedAt: { $exists: false } },
      { userId: "owner", deletedAt: { $exists: false } },
      { status: "confirmed", deletedAt: { $exists: false } },
      { date: "2099-12-01", status: "confirmed", deletedAt: { $exists: false } },
    ]);
  });
  it("treats direct links and actions on hidden bookings as missing", async () => {
    expect(await getBookingById(id)).toBeNull(); expect(await getAdminBookingById(id)).toBeNull();
    expect(await updateBookingStatus(id, "confirmed", "admin")).toBe("not_found");
    expect(await cancelBookingForUser(id, "owner", "2099-01-01")).toBe("not_found");
    for (const [filter] of db.findOne.mock.calls) expect(filter).toHaveProperty("deletedAt", { $exists: false });
    db.updateOne.mockResolvedValue({ matchedCount: 0 });
    expect(await updateAdminNotes(id, "note")).toBe(false);
    expect(db.updateOne.mock.calls[0][0]).toHaveProperty("deletedAt", { $exists: false });
  });
  it("guards status writes against deletion between reading and writing", async () => {
    db.findOne.mockResolvedValue({ status: "pending", createdAt: "2026-01-01", updatedAt: "2026-01-01" });
    db.updateOne.mockResolvedValue({ matchedCount: 0 }); db.countDocuments.mockResolvedValue(0);
    expect(await updateBookingStatus(id, "confirmed", "admin")).toBe("conflict");
    expect(await cancelBookingForUser(id, "owner", "2099-01-01")).toBe("not_found");
    for (const [filter] of db.updateOne.mock.calls) expect(filter).toHaveProperty("deletedAt", { $exists: false });
    expect(db.countDocuments.mock.calls[0][0]).toHaveProperty("deletedAt", { $exists: false });
  });
  it("excludes hidden reviews from moderation and public pages, and prevents reapproval", async () => {
    await getAllReviews(); await getApprovedReviews();
    expect(db.find.mock.calls.map(([filter]) => filter)).toEqual([
      { deletedAt: { $exists: false } }, { status: "approved", deletedAt: { $exists: false } },
    ]);
    db.updateOne.mockResolvedValue({ matchedCount: 0 });
    expect(await updateReviewStatus(id, "approved")).toBe(false);
    expect(db.updateOne.mock.calls[0][0]).toHaveProperty("deletedAt", { $exists: false });
  });
});
