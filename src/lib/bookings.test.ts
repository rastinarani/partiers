import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import { cancelBookingForUser, createBooking, getAdminBookingById, getAllBookings, getBookingById, getBookingsForUser, getConfirmedBookings, updateAdminNotes, updateBookingStatus } from "./bookings";
import { validateAdminBookingStatusInput, validateAdminNotesInput } from "./validation";

const db = vi.hoisted(() => ({
  findOne: vi.fn(), updateOne: vi.fn(), find: vi.fn(), sort: vi.fn(), toArray: vi.fn(),
  countDocuments: vi.fn(), createIndex: vi.fn(), insertOne: vi.fn(),
}));
vi.mock("./mongodb", () => ({ getDb: async () => ({ collection: () => db }) }));
const id = new ObjectId().toHexString();
const doc = {
  _id: new ObjectId(id), parentName: "Jamie", childName: "Alex", contact: "jamie@example.com",
  childAge: 6, numberOfChildren: 5, date: "2099-12-01", time: "10:00", durationMinutes: 60,
  notes: "Parent note", status: "pending", userId: "customer", adminNotes: "PRIVATE NOTE",
  createdAt: "2026-01-01T12:00:00Z", updatedAt: "2026-01-01T12:00:00Z",
};
beforeEach(() => {
  vi.clearAllMocks();
  db.findOne.mockResolvedValue({ ...doc });
  db.updateOne.mockResolvedValue({ matchedCount: 1 });
  db.find.mockReturnValue(db); db.sort.mockReturnValue(db); db.toArray.mockResolvedValue([{ ...doc }]);
});

describe("private booking details", () => {
  it("excludes private notes and history from every shared booking reader", async () => {
    db.findOne.mockResolvedValue({ ...doc, statusHistory: [{ status: "confirmed", actorId: "private-admin" }] });
    db.toArray.mockResolvedValue([{ ...doc, statusHistory: [{ actorId: "private-admin" }] }]);
    const bookings = [await getBookingById(id), ...(await getBookingsForUser("customer")), ...(await getAllBookings()), ...(await getConfirmedBookings())];
    for (const booking of bookings) {
      expect(booking).not.toHaveProperty("adminNotes");
      expect(booking).not.toHaveProperty("statusHistory");
      expect(booking?.notes).toBe("Parent note");
    }
  });
  it("loads private notes only through the admin reader", async () => {
    expect(await getAdminBookingById(id)).toMatchObject({ adminNotes: "PRIVATE NOTE", statusHistory: [{ status: "pending", actor: "system" }] });
  });
  it("preserves the available latest status of legacy bookings", async () => {
    db.findOne.mockResolvedValue({ ...doc, status: "confirmed" });
    expect((await getAdminBookingById(id))?.statusHistory.map((entry) => entry.actor)).toEqual(["system", "unknown"]);
  });
  it("saves and clears private notes without changing customer notes", async () => {
    expect(await updateAdminNotes(id, "")).toBe(true);
    expect(db.updateOne.mock.calls[0][1]).toEqual({ $set: { adminNotes: "" } });
  });
  it("reports missing or malformed bookings", async () => {
    expect(await getAdminBookingById("bad-id")).toBeNull();
    expect(await updateAdminNotes("bad-id", "note")).toBe(false);
    db.updateOne.mockResolvedValue({ matchedCount: 0 });
    expect(await updateAdminNotes(id, "note")).toBe(false);
  });
});

describe("status history", () => {
  it("records the initial pending request", async () => {
    db.insertOne.mockResolvedValue({ insertedId: new ObjectId(id) });
    await createBooking({ parentName: "Jamie", childName: "Alex", contact: "a@example.com", childAge: 6, numberOfChildren: 5, date: doc.date, time: doc.time, durationMinutes: 60, notes: "", eventType: "birthday", location: "Park", activities: [] });
    expect(db.insertOne.mock.calls[0][0].statusHistory).toEqual([{ status: "pending", actor: "system", at: expect.any(String) }]);
  });
  it("records an admin's change together with status and guards the version", async () => {
    expect(await updateBookingStatus(id, "confirmed", "admin-id")).toBe("updated");
    expect(db.updateOne.mock.calls[0][0]).toMatchObject({ status: "pending", updatedAt: doc.updatedAt });
    expect(db.updateOne.mock.calls[0][1].$set).toMatchObject({ status: "confirmed", statusHistory: [{ status: "pending", actor: "system", at: doc.createdAt }, { status: "confirmed", actor: "admin", actorId: "admin-id", at: expect.any(String) }] });
  });
  it("does not duplicate history when the same status is submitted twice", async () => {
    expect(await updateBookingStatus(id, "pending", "admin-id")).toBe("updated");
    expect(db.updateOne).not.toHaveBeenCalled();
  });
  it("does not reopen cancelled bookings", async () => {
    db.findOne.mockResolvedValue({ ...doc, status: "cancelled" });
    expect(await updateBookingStatus(id, "confirmed", "admin-id")).toBe("cancelled");
    expect(db.updateOne).not.toHaveBeenCalled();
  });
  it("reports concurrent changes instead of overwriting history", async () => {
    db.updateOne.mockResolvedValue({ matchedCount: 0 });
    expect(await updateBookingStatus(id, "cancelled", "admin-id")).toBe("conflict");
  });
  it("records customer cancellation and keeps ownership/date checks", async () => {
    expect(await cancelBookingForUser(id, "customer", "2099-01-01")).toBe("cancelled");
    expect(db.findOne.mock.calls[0][0]).toMatchObject({ userId: "customer" });
    expect(db.updateOne.mock.calls[0][0]).toMatchObject({ userId: "customer", date: { $gte: "2099-01-01" }, updatedAt: doc.updatedAt });
    expect(db.updateOne.mock.calls[0][1].$set.statusHistory.at(-1)).toMatchObject({ status: "cancelled", actor: "customer", actorId: "customer" });
  });
  it("rejects a cancellation when the booking belongs to someone else", async () => {
    db.findOne.mockResolvedValue(null);
    expect(await cancelBookingForUser(id, "other-user", "2099-01-01")).toBe("not_found");
    expect(db.updateOne).not.toHaveBeenCalled();
  });
});

describe("admin input validation", () => {
  it("accepts empty notes, trims text, and discards extra fields", () => {
    expect(validateAdminNotesInput({ adminNotes: "  note  ", status: "confirmed" })).toEqual({ adminNotes: "note" });
    expect(validateAdminNotesInput({ adminNotes: "" })).toEqual({ adminNotes: "" });
    expect(validateAdminNotesInput({ adminNotes: "a".repeat(5000) })).not.toBeNull();
  });
  it("rejects invalid or oversized notes", () => {
    for (const value of [null, [], {}, { adminNotes: { $set: "bad" } }, { adminNotes: "a".repeat(5001) }]) expect(validateAdminNotesInput(value)).toBeNull();
  });
  it("accepts only supported status actions and boolean overlap overrides", () => {
    expect(validateAdminBookingStatusInput({ id, status: "cancelled" })).toEqual({ id, status: "cancelled", force: false });
    for (const value of [{ id, status: "pending" }, { id, status: "confirmed", force: "true" }, { id: "bad", status: "confirmed" }, null]) expect(validateAdminBookingStatusInput(value)).toBeNull();
  });
});
