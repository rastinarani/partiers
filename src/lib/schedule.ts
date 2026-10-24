// Time-slot maths shared by the booking form (browser) and the API
// (server). No database imports here so client components can use it.

export const DURATION_OPTIONS = [60, 90, 120, 180, 240] as const;
export type DurationMinutes = (typeof DURATION_OPTIONS)[number];

/** Bookings made before durations existed are treated as this long. */
export const DEFAULT_DURATION: DurationMinutes = 120;

/** Events must finish by midnight so a booking never spans two dates. */
export const DAY_END_MINUTES = 24 * 60;

export interface TimeRange {
  start: string; // "HH:MM"
  end: string; // "HH:MM", may be "24:00"
}

export function isDuration(value: unknown): value is DurationMinutes {
  return DURATION_OPTIONS.includes(value as DurationMinutes);
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function toRange(time: string, durationMinutes: number): TimeRange {
  return { start: time, end: minutesToTime(timeToMinutes(time) + durationMinutes) };
}

/** Touching ranges (one ends at 4:00, the next starts at 4:00) don't overlap. */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return timeToMinutes(a.start) < timeToMinutes(b.end) && timeToMinutes(b.start) < timeToMinutes(a.end);
}

export function findOverlap<T extends TimeRange>(range: TimeRange, taken: T[]): T | undefined {
  return taken.find((t) => rangesOverlap(range, t));
}

export function endsByMidnight(time: string, durationMinutes: number): boolean {
  return timeToMinutes(time) + durationMinutes <= DAY_END_MINUTES;
}

export function formatClock(time: string): string {
  const minutes = timeToMinutes(time) % DAY_END_MINUTES;
  return new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTimeRange(time: string, durationMinutes: number): string {
  const { end } = toRange(time, durationMinutes);
  return `${formatClock(time)} – ${formatClock(end)}`;
}

export function formatDuration(minutes: number): string {
  const hours = minutes / 60;
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}
