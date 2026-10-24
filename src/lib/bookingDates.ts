import type { Booking } from "./types";

/** Today's date as "YYYY-MM-DD" in the server's local time zone. */
export function todayString(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Splits bookings into upcoming (today or later, soonest first) and past
 * (most recent first). Dates are "YYYY-MM-DD", so string comparison works.
 */
export function splitUpcomingAndPast(bookings: Booking[], today: string) {
  const byDateTime = (a: Booking, b: Booking) =>
    a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date);

  const upcoming = bookings.filter((b) => b.date >= today).sort(byDateTime);
  const past = bookings.filter((b) => b.date < today).sort((a, b) => byDateTime(b, a));
  return { upcoming, past };
}
