"use client";

import { useState } from "react";
import type { Booking, BookingStatus } from "@/lib/types";
import { Button, Card, StatusBadge } from "./ui";

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
        <Card key={b._id} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold">
                {b.parentName} &middot; <span className="text-muted">{b.contact}</span>
              </p>
              <p className="text-sm text-muted">
                For {b.childName} (age {b.childAge}) &mdash; {b.numberOfChildren}{" "}
                {b.numberOfChildren === 1 ? "child" : "children"} &mdash;{" "}
                {formatDateTime(b.date, b.time)}
              </p>
              {b.notes && <p className="mt-1 text-sm text-muted italic">&ldquo;{b.notes}&rdquo;</p>}
            </div>
            <StatusBadge status={b.status} />
          </div>

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
        </Card>
      ))}
    </div>
  );
}
