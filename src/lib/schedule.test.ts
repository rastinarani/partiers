import { describe, expect, it } from "vitest";
import {
  endsByMidnight,
  findOverlap,
  formatDuration,
  formatTimeRange,
  isDuration,
  rangesOverlap,
  toRange,
} from "./schedule";

describe("toRange", () => {
  it("adds the duration to the start time", () => {
    expect(toRange("14:00", 90)).toEqual({ start: "14:00", end: "15:30" });
    expect(toRange("20:00", 240)).toEqual({ start: "20:00", end: "24:00" });
  });
});

describe("rangesOverlap", () => {
  const party = { start: "14:00", end: "16:00" };

  it.each([
    ["13:00", "14:30"],
    ["15:00", "17:00"],
    ["14:30", "15:00"],
    ["13:00", "17:00"],
    ["14:00", "16:00"],
  ])("detects %s–%s overlapping 14:00–16:00", (start, end) => {
    expect(rangesOverlap({ start, end }, party)).toBe(true);
    expect(rangesOverlap(party, { start, end })).toBe(true);
  });

  it.each([
    ["12:00", "14:00"],
    ["16:00", "18:00"],
    ["09:00", "10:00"],
  ])("lets %s–%s sit next to 14:00–16:00", (start, end) => {
    expect(rangesOverlap({ start, end }, party)).toBe(false);
  });
});

describe("findOverlap", () => {
  it("returns the first clashing range, or undefined", () => {
    const taken = [
      { start: "10:00", end: "11:00", id: "a" },
      { start: "15:00", end: "17:00", id: "b" },
    ];
    expect(findOverlap(toRange("14:00", 120), taken)?.id).toBe("b");
    expect(findOverlap(toRange("11:00", 240), taken)).toBeUndefined();
  });
});

describe("endsByMidnight", () => {
  it("allows ending exactly at midnight but not after", () => {
    expect(endsByMidnight("22:00", 120)).toBe(true);
    expect(endsByMidnight("22:00", 180)).toBe(false);
  });
});

describe("isDuration", () => {
  it.each([60, 90, 120, 180, 240])("accepts %i", (d) => expect(isDuration(d)).toBe(true));
  it.each([0, 30, 150, 300, "120", null])("rejects %j", (d) => expect(isDuration(d)).toBe(false));
});

describe("formatting", () => {
  it("formats durations and ranges", () => {
    expect(formatDuration(60)).toBe("1 hour");
    expect(formatDuration(90)).toBe("1.5 hours");
    expect(formatTimeRange("14:00", 90)).toBe("2:00 PM – 3:30 PM");
    expect(formatTimeRange("21:00", 180)).toBe("9:00 PM – 12:00 AM");
  });
});
