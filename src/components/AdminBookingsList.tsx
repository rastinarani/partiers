"use client";

import { useState } from "react";
import { formatTimeRange } from "@/lib/schedule";
import EventDetails from "./EventDetails";
import type { Booking, BookingStatus } from "@/lib/types";
import { Button, Card, StatusBadge } from "./ui";

function formatDateTime(date: string, time: string, durationMinutes: number) {
  const day = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return `${day}, ${formatTimeRange(time, durationMinutes)}`;
}

interface OverlapWarning {
  bookingId: string;
  parentName: string;
  time: string;
}

export default function AdminBookingsList({ initialBookings }: { initialBookings: Booking[] }) {
  const [bookings, setBookings] = useState(initialBookings);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [warning, setWarning] = useState<OverlapWarning | null>(null);

  async function updateStatus(id: string, status: BookingStatus, force = false) {
    setUpdatingId(id);
    setWarning(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, force }),
      });
      if (res.ok) {
        setBookings((prev) => prev.map((b) => (b._id === id ? { ...b, status } : b)));
      } else if (res.status === 409) {
        const data = await res.json().catch(() => ({}));
        if (data.overlap) setWarning({ bookingId: id, ...data.overlap });
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
        <Card key={b._id} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold">
                {b.parentName} &middot; <span className="text-muted">{b.contact}</span>
              </p>
              <p className="text-sm text-muted">
                For {b.childName} (age {b.childAge}) &mdash; {b.numberOfChildren}{" "}
                {b.numberOfChildren === 1 ? "child" : "children"} &mdash;{" "}
                {formatDateTime(b.date, b.time, b.durationMinutes)}
              </p>
              <EventDetails booking={b} />
              {b.notes && <p className="mt-1 text-sm text-muted italic">&ldquo;{b.notes}&rdquo;</p>}
            </div>
            <StatusBadge status={b.status} />
          </div>

          {b.status === "cancelled" ? (
            <p className="mt-3 text-sm text-muted">Cancelled by the customer.</p>
          ) : warning?.bookingId === b._id ? (
            <div className="mt-3 rounded-xl bg-accent/10 p-3 text-sm">
              <p>
                <strong>Heads up:</strong> this overlaps {warning.parentName}&rsquo;s confirmed
                booking ({warning.time}). Confirm anyway?
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  variant="success"
                  size="xs"
                  disabled={updatingId === b._id}
                  onClick={() => updateStatus(b._id, "confirmed", true)}
                >
                  Confirm anyway
                </Button>
                <Button variant="secondary" size="xs" onClick={() => setWarning(null)}>
                  Never mind
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <Button
                variant="success"
                size="xs"
                disabled={updatingId === b._id || b.status === "confirmed"}
                onClick={() => updateStatus(b._id, "confirmed")}
              >
                Confirm
              </Button>
              <Button
                variant="danger"
                size="xs"
                disabled={updatingId === b._id || b.status === "declined"}
                onClick={() => updateStatus(b._id, "declined")}
              >
                Decline
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
