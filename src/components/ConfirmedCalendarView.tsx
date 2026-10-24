"use client";

import { useMemo, useState } from "react";
import { todayString } from "@/lib/bookingDates";
import { formatTimeRange } from "@/lib/schedule";
import type { Booking } from "@/lib/types";
import EventDetails from "./EventDetails";
import MonthCalendar from "./MonthCalendar";
import { Card } from "./ui";

export default function ConfirmedCalendarView({ bookings }: { bookings: Booking[] }) {
  const today = todayString();
  const [selectedDate, setSelectedDate] = useState(today);

  const markedDates = useMemo(() => new Set(bookings.map((b) => b.date)), [bookings]);
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      const list = map.get(b.date) ?? [];
      list.push(b);
      map.set(b.date, list);
    }
    return map;
  }, [bookings]);

  const dayBookings = (bookingsByDate.get(selectedDate) ?? []).sort((a, b) =>
    a.time.localeCompare(b.time)
  );

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <MonthCalendar
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        markedDates={markedDates}
        disablePast={false}
      />

      <div>
        <h2 className="mb-3 font-semibold">
          {new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </h2>

        {dayBookings.length === 0 ? (
          <p className="text-sm text-muted">No confirmed bookings this day.</p>
        ) : (
          <div className="space-y-3">
            {dayBookings.map((b) => (
              <Card key={b._id} className="p-4">
                <p className="font-medium">{formatTimeRange(b.time, b.durationMinutes)}</p>
                <p className="text-sm text-muted">
                  {b.parentName} &middot; {b.childName} (age {b.childAge}) &middot;{" "}
                  {b.numberOfChildren} {b.numberOfChildren === 1 ? "child" : "children"}
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
