import Link from "next/link";
import { getConfirmedBookings } from "@/lib/bookings";
import ConfirmedCalendarView from "@/components/ConfirmedCalendarView";

export const dynamic = "force-dynamic";

export default async function AdminCalendarPage() {
  const bookings = await getConfirmedBookings();

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8">
        <Link href="/admin" className="text-sm text-muted hover:text-foreground">
          &larr; Back to dashboard
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Confirmed Bookings</h1>
        <p className="mt-1 text-muted">Days with a dot have at least one confirmed booking.</p>
      </div>

      <ConfirmedCalendarView bookings={bookings} />
    </div>
  );
}
