import type { Booking } from "./types";

export const SERVICE_TIME_ZONE = "America/Vancouver";

/** Business dates always follow Metro Vancouver, regardless of server or visitor. */
export function todayString(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SERVICE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
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
