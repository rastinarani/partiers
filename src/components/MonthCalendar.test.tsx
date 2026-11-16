// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import MonthCalendar from "./MonthCalendar";

afterEach(() => { cleanup(); vi.useRealTimers(); });

function focusDay(name: RegExp) {
  const button = screen.getByRole("button", { name });
  act(() => button.focus());
  return button;
}

it("has one calendar tab stop and moves across a year without selecting until Enter or Space", async () => {
  const select = vi.fn();
  const user = userEvent.setup();
  render(<MonthCalendar selectedDate="2099-12-31" onSelectDate={select} />);
  expect(screen.getByRole("grid").querySelectorAll('button[tabindex="0"]')).toHaveLength(1);
  focusDay(/December 31, 2099/);
  await user.keyboard("{ArrowRight}");
  expect(document.activeElement?.getAttribute("aria-label")).toContain("January 1, 2100");
  expect(select).not.toHaveBeenCalled();
  await user.keyboard("{Enter}");
  expect(select).toHaveBeenLastCalledWith("2100-01-01");
  await user.keyboard("{ArrowLeft} ");
  expect(select).toHaveBeenLastCalledWith("2099-12-31");
  expect(screen.getByRole("grid").querySelectorAll('button[tabindex="0"]')).toHaveLength(1);
});

it("moves by week and to week boundaries, skipping blocked days", async () => {
  const user = userEvent.setup();
  render(<MonthCalendar selectedDate="2099-06-15" onSelectDate={vi.fn()}
    unavailableDates={new Set(["2099-06-16"])} />);
  focusDay(/June 15, 2099/);
  await user.keyboard("{ArrowRight}");
  expect(document.activeElement?.getAttribute("aria-label")).toContain("June 17, 2099");
  await user.keyboard("{ArrowDown}");
  expect(document.activeElement?.getAttribute("aria-label")).toContain("June 24, 2099");
  await user.keyboard("{ArrowUp}");
  expect(document.activeElement?.getAttribute("aria-label")).toContain("June 17, 2099");
  await user.keyboard("{Home}");
  expect(document.activeElement?.getAttribute("aria-label")).toContain("Sunday");
  await user.keyboard("{End}");
  expect(document.activeElement?.getAttribute("aria-label")).toContain("Saturday");
});

it("clamps month navigation to the last day, including leap years", async () => {
  const user = userEvent.setup();
  render(<MonthCalendar selectedDate="2096-01-31" onSelectDate={vi.fn()} />);
  focusDay(/January 31, 2096/);
  await user.keyboard("{PageDown}");
  expect(document.activeElement?.getAttribute("aria-label")).toContain("February 29, 2096");
  await user.keyboard("{PageUp}");
  expect(document.activeElement?.getAttribute("aria-label")).toContain("January 29, 2096");
});

it("does not focus or select past dates and leaves empty months navigable", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2099, 5, 15, 12));
  const user = userEvent.setup();
  render(<MonthCalendar selectedDate="2099-06-15" onSelectDate={vi.fn()} />);
  const today = focusDay(/June 15, 2099/);
  await user.keyboard("{ArrowLeft}");
  expect(document.activeElement).toBe(today);
  await user.click(screen.getByRole("button", { name: "Previous month" }));
  expect(screen.getByRole("grid").querySelectorAll('button[tabindex="0"]')).toHaveLength(0);
  await user.keyboard("{Tab}");
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Next month" }));
  await user.keyboard("{Enter}{Tab}");
  expect(document.activeElement?.getAttribute("aria-label")).toContain("June 15, 2099");
});

it("keeps the admin's blocked and marked dates accessible", async () => {
  const user = userEvent.setup();
  const select = vi.fn();
  render(<MonthCalendar selectedDate="2099-06-15" onSelectDate={select} disablePast={false}
    unavailableDates={new Set(["2099-06-16"])} markedDates={new Set(["2099-06-16"])} allowSelectingUnavailable />);
  focusDay(/June 15, 2099/);
  await user.keyboard("{ArrowRight}{Enter}");
  expect(document.activeElement?.getAttribute("aria-label")).toContain("unavailable");
  expect(document.activeElement?.getAttribute("aria-label")).toContain("confirmed events");
  expect(select).toHaveBeenLastCalledWith("2099-06-16");
});
