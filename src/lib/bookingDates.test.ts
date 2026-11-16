import { describe, expect, it } from "vitest";
import { splitUpcomingAndPast, todayString } from "./bookingDates";
import type { Booking } from "./types";

function booking(date: string, time: string): Booking {
  return {
    _id: `${date}-${time}`,
    parentName: "Jamie",
    contact: "jamie@example.com",
    childName: "Alex",
    childAge: 6,
    numberOfChildren: 1,
    date,
    time,
    durationMinutes: 120,
    notes: "",
    status: "pending",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("todayString", () => {
  it("uses Vancouver dates at UTC midnight and daylight-saving boundaries", () => {
    expect(todayString(new Date("2026-01-06T07:30:00Z"))).toBe("2026-01-05");
    expect(todayString(new Date("2026-07-06T06:30:00Z"))).toBe("2026-07-05");
    expect(todayString(new Date("2026-07-06T07:00:00Z"))).toBe("2026-07-06");
  });
});

describe("splitUpcomingAndPast", () => {
  const today = "2026-10-23";

  it("counts today as upcoming", () => {
    const { upcoming, past } = splitUpcomingAndPast([booking(today, "09:00")], today);
    expect(upcoming).toHaveLength(1);
    expect(past).toHaveLength(0);
  });

  it("sorts upcoming soonest first and past most recent first", () => {
    const { upcoming, past } = splitUpcomingAndPast(
      [
        booking("2026-11-02", "10:00"),
        booking("2026-09-01", "10:00"),
        booking("2026-10-30", "15:00"),
        booking("2026-10-30", "09:30"),
        booking("2026-10-22", "18:00"),
      ],
      today
    );
    expect(upcoming.map((b) => b._id)).toEqual([
      "2026-10-30-09:30",
      "2026-10-30-15:00",
      "2026-11-02-10:00",
    ]);
    expect(past.map((b) => b._id)).toEqual(["2026-10-22-18:00", "2026-09-01-10:00"]);
  });

  it("handles no bookings", () => {
    expect(splitUpcomingAndPast([], today)).toEqual({ upcoming: [], past: [] });
  });
});
