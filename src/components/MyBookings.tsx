import Link from "next/link";
import type { Booking } from "@/lib/types";
import { buttonClasses, Card, StatusBadge } from "./ui";

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time: string) {
  return new Date(`2000-01-01T${time}:00`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MyBookings({
  upcoming,
  past,
}: {
  upcoming: Booking[];
  past: Booking[];
}) {
  if (upcoming.length === 0 && past.length === 0) {
    return (
      <Card flat className="p-8 text-center">
        <div className="text-3xl">&#127880;</div>
        <h2 className="mt-2 text-lg font-semibold">No bookings yet</h2>
        <p className="mt-1 text-sm text-muted">
          When you request a party while logged in, it&rsquo;ll show up here.
        </p>
        <Link href="/" className={buttonClasses({ className: "mt-5 inline-block" })}>
          Book now
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <BookingSection
        title="Upcoming"
        bookings={upcoming}
        emptyText="Nothing coming up right now."
      />
      {past.length > 0 && <BookingSection title="Past" bookings={past} muted />}
    </div>
  );
}

function BookingSection({
  title,
  bookings,
  emptyText,
  muted,
}: {
  title: string;
  bookings: Booking[];
  emptyText?: string;
  muted?: boolean;
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">
        {title} <span className="text-sm font-normal text-muted">({bookings.length})</span>
      </h2>
      {bookings.length === 0 ? (
        <Card flat className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">{emptyText}</p>
          <Link href="/" className={buttonClasses({ size: "sm" })}>
            Book now
          </Link>
        </Card>
      ) : (
        <ul className="space-y-3">
          {bookings.map((b) => (
            <li key={b._id}>
              <Card
                flat={muted}
                className={`flex flex-wrap items-center justify-between gap-3 p-5 ${muted ? "opacity-80" : ""}`}
              >
                <div>
                  <p className="font-semibold">
                    {formatDate(b.date)} &middot; {formatTime(b.time)}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {b.childName} ({b.childAge}) &middot; {b.numberOfChildren}{" "}
                    {b.numberOfChildren === 1 ? "child" : "children"}
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
