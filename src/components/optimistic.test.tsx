// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AdminBookingsList from "./AdminBookingsList";
import AdminReviewsList from "./AdminReviewsList";
import AdminBookingEditor from "./AdminBookingEditor";
import ToastProvider from "./ToastProvider";
import type { Booking } from "@/lib/types";
const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
const booking: Booking = {
  _id: "123456789012345678901234",
  parentName: "Sample parent",
  contact: "sample@example.invalid",
  childName: "Sample child",
  childAge: 6,
  numberOfChildren: 5,
  date: "2099-12-01",
  time: "12:00",
  durationMinutes: 120,
  notes: "",
  status: "pending",
  createdAt: "2026-11-15",
  updatedAt: "2026-11-15",
};
beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function deferred() {
  let resolve!: (response: unknown) => void;
  const promise = new Promise((done) => {
    resolve = done;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(() => promise),
  );
  return resolve;
}
it("updates booking counts immediately and restores the old booking on failure", async () => {
  const resolve = deferred();
  render(
    <ToastProvider>
      <AdminBookingsList initialBookings={[booking]} today="2026-11-15" />
    </ToastProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
  expect(screen.getByRole("button", { name: "pending (0)" })).toBeDefined();
  expect(screen.getByRole("button", { name: "confirmed (1)" })).toBeDefined();
  await act(async () =>
    resolve({ ok: false, json: async () => ({ error: "Could not save." }) }),
  );
  await screen.findByText("Could not save.");
  expect(screen.getByRole("button", { name: "pending (1)" })).toBeDefined();
  expect(screen.getByText("Sample parent", { exact: false })).toBeDefined();
});
it("rolls back an optimistic confirmation before showing an overlap warning", async () => {
  const resolve = deferred();
  render(
    <ToastProvider>
      <AdminBookingsList initialBookings={[booking]} today="2026-11-15" />
    </ToastProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
  await act(async () =>
    resolve({
      ok: false,
      json: async () => ({
        overlap: { parentName: "Other family", time: "12 PM" },
      }),
    }),
  );
  await screen.findByRole("button", { name: "Confirm anyway" });
  expect(screen.getByRole("button", { name: "pending (1)" })).toBeDefined();
});
it("shows a new review status immediately and restores it on server failure", async () => {
  const resolve = deferred();
  render(
    <ToastProvider>
      <AdminReviewsList
        initialReviews={[
          {
            _id: "review",
            name: "Sample",
            comment: "Test",
            rating: 5,
            status: "pending",
            createdAt: "2026-11-15",
          },
        ]}
      />
    </ToastProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Approve" }));
  expect(screen.getByText("approved", { exact: true })).toBeDefined();
  expect(screen.getByRole("button", { name: "Reject" })).toHaveProperty(
    "disabled",
    true,
  );
  await act(async () =>
    resolve({ ok: false, json: async () => ({ error: "Please retry." }) }),
  );
  await screen.findByText("Please retry.");
  expect(screen.getByText("pending", { exact: true })).toBeDefined();
});
it("keeps a server-confirmed status when refreshed props arrive", async () => {
  const resolve = deferred();
  const view = (record: Booking) => (
    <ToastProvider>
      <AdminBookingsList initialBookings={[record]} today="2026-11-15" />
    </ToastProvider>
  );
  const { rerender } = render(view(booking));
  fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
  rerender(view({ ...booking, status: "confirmed" }));
  await act(async () => resolve({ ok: true }));
  await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  expect(screen.getByRole("button", { name: "confirmed (1)" })).toBeDefined();
});
it("restores detail-page controls after a failed optimistic cancellation", async () => {
  const resolve = deferred();
  render(
    <ToastProvider>
      <AdminBookingEditor
        id={booking._id}
        status="pending"
        initialNotes="Keep my notes"
      />
    </ToastProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Cancel booking" }));
  fireEvent.click(screen.getByRole("button", { name: "Yes, cancel booking" }));
  expect(screen.getByText("This booking has been cancelled.")).toBeDefined();
  await act(async () =>
    resolve({ ok: false, json: async () => ({ error: "Booking changed." }) }),
  );
  await screen.findByRole("button", { name: "Confirm" });
  expect(screen.getByLabelText("Private admin notes")).toHaveProperty(
    "value",
    "Keep my notes",
  );
});
