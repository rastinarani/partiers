import { ACTIVITIES, EVENT_TYPES } from "@/lib/eventOptions";
import type { Booking } from "@/lib/types";

/** One line of event details; renders nothing for older bookings without them. */
export default function EventDetails({ booking }: { booking: Booking }) {
  const parts = [
    booking.eventType && EVENT_TYPES[booking.eventType],
    booking.location,
    booking.activities?.length
      ? booking.activities.map((a) => ACTIVITIES[a]).join(", ")
      : undefined,
  ].filter(Boolean);

  if (parts.length === 0) return null;
  return <p className="mt-1 text-sm text-muted">{parts.join(" · ")}</p>;
}
