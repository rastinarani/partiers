"use client";

import EmptyState from "./EmptyState";

import { useToast } from "./ToastProvider";

import { useState, useOptimistic, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { splitUpcomingAndPast } from "@/lib/bookingDates";
import { formatTimeRange } from "@/lib/schedule";
import EventDetails from "./EventDetails";
import HideRecordButton from "./HideRecordButton";
import type { Booking, BookingStatus } from "@/lib/types";
import { Button, Card, Input, Label, StatusBadge } from "./ui";

const STATUSES: BookingStatus[] = [
  "pending",
  "confirmed",
  "declined",
  "cancelled",
];

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

export default function AdminBookingsList({
  initialBookings,
  today,
}: {
  initialBookings: Booking[];
  today: string;
}) {
  const router = useRouter();
  const notify = useToast();
  const [isPending, startTransition] = useTransition();
  const [bookings, applyOptimisticStatus] = useOptimistic(
    initialBookings,
    (previous, change: { id: string; status: BookingStatus }) =>
      previous.map((record) =>
        record._id === change.id
          ? { ...record, status: change.status }
          : record,
      ),
  );
  const [status, setStatus] = useState<BookingStatus>("pending");
  const [search, setSearch] = useState("");
  const [warning, setWarning] = useState<OverlapWarning | null>(null);

  function updateStatus(id: string, status: BookingStatus, force = false) {
    if (isPending) return;
    startTransition(async () => {
      applyOptimisticStatus({ id, status });
      await sendStatus(id, status, force);
    });
  }

  async function sendStatus(id: string, status: BookingStatus, force = false) {
    setWarning(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, force }),
      });
      if (res.ok) {
        notify(`Booking ${status}.`);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.overlap) setWarning({ bookingId: id, ...data.overlap });
        else
          notify(
            data.error ?? "Couldn’t update this booking. Please try again.",
            "error",
          );
      }
    } catch {
      notify("Couldn’t connect. Please try again.", "error");
    }
  }

  if (bookings.length === 0) {
    return (
      <EmptyState
        title="No booking requests yet"
        description="New requests will appear here, ready for you to review."
        href="/admin/calendar"
        action="View calendar"
      />
    );
  }

  const query = search.trim().toLowerCase();
  const matching = bookings.filter(
    (booking) =>
      booking.status === status &&
      [booking.parentName, booking.childName, booking.contact].some((value) =>
        value.toLowerCase().includes(query),
      ),
  );
  const { upcoming, past } = splitUpcomingAndPast(matching, today);

  return (
    <div className="space-y-3">
      {isPending && (
        <p role="status" className="text-sm text-muted">
          Saving booking…
        </p>
      )}
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Booking status"
      >
        {STATUSES.map((value) => (
          <Button
            key={value}
            variant={status === value ? "primary" : "secondary"}
            aria-pressed={status === value}
            className="capitalize focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onClick={() => {
              setStatus(value);
              setWarning(null);
            }}
          >
            {value} (
            {bookings.filter((booking) => booking.status === value).length})
          </Button>
        ))}
      </div>
      <div>
        <Label htmlFor="booking-search">Search bookings</Label>
        <Input
          id="booking-search"
          type="search"
          placeholder="Parent name, child name or contact"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-describedby="booking-results"
        />
      </div>
      <p id="booking-results" className="text-sm text-muted" role="status">
        {matching.length} {status} booking{matching.length === 1 ? "" : "s"}
        {query ? " matching your search" : ""}. Upcoming bookings appear soonest
        first.
      </p>
      {matching.length === 0 && (
        <Card className="p-6 text-center">
          <p className="text-muted">
            {query
              ? "No bookings match your search in this status."
              : `No ${status} bookings yet.`}
          </p>
          {query && (
            <Button
              className="mt-3"
              variant="secondary"
              onClick={() => setSearch("")}
            >
              Clear search
            </Button>
          )}
        </Card>
      )}
      {[
        { title: "Upcoming", items: upcoming },
        { title: "Past", items: past },
      ].map(
        ({ title, items }) =>
          items.length > 0 && (
            <section
              key={title}
              aria-label={`${title} ${status} bookings`}
              className="space-y-3"
            >
              <h3 className="pt-2 font-semibold">{title}</h3>
              {items.map((b) => (
                <Card key={b._id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">
                        {b.parentName} &middot;{" "}
                        <span className="text-muted">{b.contact}</span>
                        {b.referenceCode && (
                          <span className="ml-2 rounded-md bg-primary-soft px-1.5 py-0.5 font-mono text-xs text-primary">
                            {b.referenceCode}
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted">
                        For {b.childName} (age {b.childAge}) &mdash;{" "}
                        {b.numberOfChildren}{" "}
                        {b.numberOfChildren === 1 ? "child" : "children"}{" "}
                        &mdash;{" "}
                        {formatDateTime(b.date, b.time, b.durationMinutes)}
                      </p>
                      <EventDetails booking={b} />
                      {b.notes && (
                        <p className="mt-1 text-sm text-muted italic">
                          &ldquo;{b.notes}&rdquo;
                        </p>
                      )}
                    </div>
                    <StatusBadge status={b.status} />
                  </div>

                  {b.status === "cancelled" ? (
                    <p className="mt-3 text-sm text-muted">
                      This booking has been cancelled.
                    </p>
                  ) : warning?.bookingId === b._id ? (
                    <div className="mt-3 rounded-xl bg-accent/10 p-3 text-sm">
                      <p>
                        <strong>Heads up:</strong> this overlaps{" "}
                        {warning.parentName}&rsquo;s confirmed booking (
                        {warning.time}). Confirm anyway?
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Button
                          variant="success"
                          size="xs"
                          disabled={isPending}
                          onClick={() => updateStatus(b._id, "confirmed", true)}
                        >
                          Confirm anyway
                        </Button>
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => setWarning(null)}
                        >
                          Never mind
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="success"
                        size="xs"
                        disabled={isPending || b.status === "confirmed"}
                        onClick={() => updateStatus(b._id, "confirmed")}
                      >
                        Confirm
                      </Button>
                      <Button
                        variant="danger"
                        size="xs"
                        disabled={isPending || b.status === "declined"}
                        onClick={() => updateStatus(b._id, "declined")}
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                  <HideRecordButton
                    id={b._id}
                    kind="booking"
                    disabled={isPending}
                  />
                  <Link
                    href={`/admin/bookings/${b._id}`}
                    className="mt-3 inline-block text-sm font-medium text-primary underline underline-offset-4"
                  >
                    View booking details
                  </Link>
                </Card>
              ))}
            </section>
          ),
      )}
    </div>
  );
}
