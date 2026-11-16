"use client";

import EmptyState from "./EmptyState";

import { useMemo, useState } from "react";
import type { BlockedDate } from "@/lib/blockedDates";
import { todayString } from "@/lib/bookingDates";
import { formatTimeRange } from "@/lib/schedule";
import type { Booking } from "@/lib/types";
import BlockDatePanel from "./BlockDatePanel";
import EventDetails from "./EventDetails";
import MonthCalendar from "./MonthCalendar";
import { Card } from "./ui";

export default function ConfirmedCalendarView({
  bookings,
  blockedDates,
}: {
  bookings: Booking[];
  blockedDates: BlockedDate[];
}) {
  const today = todayString();
  const [selectedDate, setSelectedDate] = useState(today);

  const markedDates = useMemo(
    () => new Set(bookings.map((b) => b.date)),
    [bookings],
  );
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      const list = map.get(b.date) ?? [];
      list.push(b);
      map.set(b.date, list);
    }
    return map;
  }, [bookings]);

  const blockedByDate = useMemo(
    () => new Map(blockedDates.map((b) => [b.date, b.reason])),
    [blockedDates],
  );
  const unavailableDates = useMemo(
    () => new Set(blockedByDate.keys()),
    [blockedByDate],
  );

  const dayBookings = (bookingsByDate.get(selectedDate) ?? []).sort((a, b) =>
    a.time.localeCompare(b.time),
  );

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <MonthCalendar
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        markedDates={markedDates}
        disablePast={false}
        unavailableDates={unavailableDates}
        allowSelectingUnavailable
      />

      <div>
        <h2 className="mb-3 font-semibold">
          {new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </h2>

        <BlockDatePanel
          key={selectedDate}
          date={selectedDate}
          blockedReason={blockedByDate.get(selectedDate) ?? null}
          isPast={selectedDate < today}
        />

        {dayBookings.length === 0 ? (
          <EmptyState
            title="No confirmed bookings"
            description="There are no confirmed events for this date. Pending requests stay on the dashboard until confirmed."
          />
        ) : (
          <div className="space-y-3">
            {dayBookings.map((b) => (
              <Card key={b._id} className="p-4">
                <p className="font-medium">
                  {formatTimeRange(b.time, b.durationMinutes)}
                  {b.referenceCode && (
                    <span className="ml-2 font-mono text-xs text-muted">
                      {b.referenceCode}
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted">
                  {b.parentName} &middot; {b.childName} (age {b.childAge})
                  &middot; {b.numberOfChildren}{" "}
                  {b.numberOfChildren === 1 ? "child" : "children"}
                </p>
                <EventDetails booking={b} />
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
