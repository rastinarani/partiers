// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import BookingForm from "./BookingForm";
import { emptyBookingDraft, encodeBookingDraft } from "@/lib/bookingDraft";

beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ taken: [], blocked: false }),
      }),
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function saved(parentName: string, contact: string) {
  return encodeBookingDraft({
    step: 3,
    values: {
      ...emptyBookingDraft(parentName, contact).values,
      date: "2099-12-01",
      time: "12:00",
      eventType: "birthday",
      location: "Test park",
    },
  });
}
it("keeps guest and signed-in drafts separate and prefills the account details", async () => {
  sessionStorage.setItem(
    "partiers-booking-draft:v1:guest",
    saved("Guest family", "guest@example.invalid"),
  );
  sessionStorage.setItem(
    "partiers-booking-draft:v1:account@example.invalid",
    saved("Account family", "account@example.invalid"),
  );
  const { rerender } = render(<BookingForm />);
  expect(
    (await screen.findByLabelText("Your name")) as HTMLInputElement,
  ).toHaveProperty("value", "Guest family");
  rerender(
    <BookingForm
      loggedIn
      defaultParentName="Account family"
      defaultContact="account@example.invalid"
    />,
  );
  expect(
    (await screen.findByLabelText("Your name")) as HTMLInputElement,
  ).toHaveProperty("value", "Account family");
  expect(screen.getByLabelText("Phone or email")).toHaveProperty(
    "value",
    "account@example.invalid",
  );
});
it("still allows booking when browser storage is unavailable", async () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("disabled");
  });
  render(<BookingForm />);
  expect(await screen.findByText(/couldn't save your progress/)).toBeDefined();
  expect(
    screen.getByRole("button", { name: "Next" }),
  ).toHaveProperty("disabled", false);
});
it("recovers from damaged draft storage without a blank page", async () => {
  sessionStorage.setItem("partiers-booking-draft:v1:guest", "damaged-json");
  render(<BookingForm />);
  expect(
    await screen.findByRole("heading", { name: "Date" }),
  ).toBeDefined();
});
