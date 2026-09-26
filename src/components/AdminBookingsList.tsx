"use client";

import { useState } from "react";
import type { Booking, BookingStatus } from "@/lib/types";

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: "bg-accent/15 text-accent",
  confirmed: "bg-success-soft text-success",
  declined: "bg-danger-soft text-danger",
};

function formatDateTime(date: string, time: string) {
  const d = new Date(`${date}T${time}:00`);
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminBookingsList({ initialBookings }: { initialBookings: Booking[] }) {
  const [bookings, setBookings] = useState(initialBookings);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function updateStatus(id: string, status: BookingStatus) {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setBookings((prev) => prev.map((b) => (b._id === id ? { ...b, status } : b)));
      }
    } finally {
      setUpdatingId(null);
    }
  }

  if (bookings.length === 0) {
    return <p className="text-muted">No booking requests yet.</p>;
  }

  return (
    <div className="space-y-3">
      {bookings.map((b) => (
        <div key={b._id} className="rounded-2xl border border-card-border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold">
                {b.parentName} &middot; <span className="text-muted">{b.contact}</span>
              </p>
              <p className="text-sm text-muted">
                For {b.childName} (age {b.childAge}) &mdash; {formatDateTime(b.date, b.time)}
              </p>
              {b.notes && <p className="mt-1 text-sm text-muted italic">&ldquo;{b.notes}&rdquo;</p>}
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[b.status]}`}>
              {b.status}
            </span>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={updatingId === b._id || b.status === "confirmed"}
              onClick={() => updateStatus(b._id, "confirmed")}
              className="rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              Confirm
            </button>
            <button
              type="button"
              disabled={updatingId === b._id || b.status === "declined"}
              onClick={() => updateStatus(b._id, "declined")}
              className="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
