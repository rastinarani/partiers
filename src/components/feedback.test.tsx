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
import { useState } from "react";
import ToastProvider, { useToast } from "./ToastProvider";
import BookingCelebration from "./BookingCelebration";
import MotionProvider from "./motion/MotionProvider";
import StarRating from "./StarRating";
import AdminReviewsList from "./AdminReviewsList";

const mocks = vi.hoisted(() => ({
  fire: vi.fn(),
  reset: vi.fn(),
  create: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("canvas-confetti", () => ({ default: { create: mocks.create } }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
let reduced = false;
const listeners = new Set<() => void>();
beforeEach(() => {
  vi.clearAllMocks();
  reduced = false;
  listeners.clear();
  Object.assign(mocks.fire, { reset: mocks.reset });
  mocks.create.mockReturnValue(mocks.fire);
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return reduced;
    },
    addEventListener: (_: string, callback: () => void) =>
      listeners.add(callback),
    removeEventListener: (_: string, callback: () => void) =>
      listeners.delete(callback),
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
function Notices() {
  const notify = useToast();
  return (
    <>
      <button onClick={() => notify("Saved.")}>Success</button>
      <button onClick={() => notify("Try again.", "error")}>Failure</button>
    </>
  );
}
it("announces success and persistent errors, and lets the reader dismiss them", () => {
  vi.useFakeTimers();
  render(
    <ToastProvider>
      <Notices />
    </ToastProvider>,
  );
  fireEvent.click(screen.getByText("Success"));
  fireEvent.click(screen.getByText("Failure"));
  expect(screen.getByRole("status").textContent).toBe("Saved.");
  expect(screen.getByRole("alert").textContent).toBe("Try again.");
  act(() => vi.advanceTimersByTime(8000));
  expect(screen.queryByText("Saved.")).toBeNull();
  expect(screen.getByText("Try again.")).toBeDefined();
  fireEvent.click(screen.getByLabelText("Dismiss notification"));
  expect(screen.queryByText("Try again.")).toBeNull();
});
it("fires one celebration and stops it when reduced motion changes", async () => {
  render(
    <MotionProvider>
      <BookingCelebration />
    </MotionProvider>,
  );
  await waitFor(() => expect(mocks.fire).toHaveBeenCalledTimes(1));
  expect(mocks.fire).toHaveBeenCalledWith(
    expect.objectContaining({ disableForReducedMotion: true }),
  );
  act(() => {
    reduced = true;
    listeners.forEach((callback) => callback());
  });
  expect(mocks.reset).toHaveBeenCalled();
  act(() => {
    reduced = false;
    listeners.forEach((callback) => callback());
  });
  expect(mocks.fire).toHaveBeenCalledTimes(1);
});
it("skips confetti entirely when reduced motion is enabled", async () => {
  reduced = true;
  const { container } = render(
    <MotionProvider>
      <BookingCelebration />
    </MotionProvider>,
  );
  await act(async () => {});
  expect(container.querySelector("canvas")).toBeNull();
  expect(mocks.create).not.toHaveBeenCalled();
});
it("supports keyboard star selection and describes read-only ratings", () => {
  function Rating() {
    const [value, setValue] = useState(5);
    return <StarRating value={value} onChange={setValue} />;
  }
  const { rerender } = render(<Rating />);
  fireEvent.keyDown(screen.getByRole("radio", { name: "5 stars" }), {
    key: "ArrowLeft",
  });
  expect(
    screen.getByRole("radio", { name: "4 stars" }).getAttribute("aria-checked"),
  ).toBe("true");
  expect(document.activeElement).toBe(
    screen.getByRole("radio", { name: "4 stars" }),
  );
  rerender(<StarRating value={4} readOnly />);
  expect(screen.getByRole("img", { name: "4 out of 5 stars" })).toBeDefined();
  expect(screen.queryByRole("radio")).toBeNull();
});
it("reports review mutation failures without changing the review, then supports retry", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Please log in again." }),
    })
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({ ok: true });
  vi.stubGlobal("fetch", fetcher);
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
            createdAt: "2026-01-01",
          },
        ]}
      />
    </ToastProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Approve" }));
  await screen.findByText("Please log in again.");
  expect(mocks.refresh).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Approve" }));
  await screen.findByText("Couldn’t connect. Please try again.");
  fireEvent.click(screen.getByRole("button", { name: "Approve" }));
  await screen.findByText("Review approved.");
  expect(mocks.refresh).toHaveBeenCalledTimes(1);
});
