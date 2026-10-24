import Link from "next/link";
import { getBlockedDates } from "@/lib/blockedDates";
import { getConfirmedBookings } from "@/lib/bookings";
import ConfirmedCalendarView from "@/components/ConfirmedCalendarView";

export const dynamic = "force-dynamic";

export default async function AdminCalendarPage() {
  const [bookings, blockedDates] = await Promise.all([getConfirmedBookings(), getBlockedDates()]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8">
        <Link href="/admin" className="text-sm text-muted hover:text-foreground">
          &larr; Back to dashboard
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Calendar</h1>
        <p className="mt-1 text-muted">
          Days with a dot have at least one confirmed booking. Crossed-out days are blocked. Pick
          a day to block or unblock it.
        </p>
      </div>

      <ConfirmedCalendarView bookings={bookings} blockedDates={blockedDates} />
    </div>
  );
}
