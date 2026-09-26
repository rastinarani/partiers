"use client";

import { useMemo, useState } from "react";
import type { Booking } from "@/lib/types";
import MonthCalendar from "./MonthCalendar";

function formatTime(time: string) {
  return new Date(`2000-01-01T${time}:00`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ConfirmedCalendarView({ bookings }: { bookings: Booking[] }) {
  const today = new Date().toISOString().slice(0, 10);
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
              <div key={b._id} className="rounded-2xl border border-card-border bg-card p-4 shadow-sm">
                <p className="font-medium">{formatTime(b.time)}</p>
                <p className="text-sm text-muted">
                  {b.parentName} &middot; {b.childName} (age {b.childAge})
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
