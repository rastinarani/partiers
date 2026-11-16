import { verifyAdminSessionToken } from "@/lib/sessions";
import { privateMetadata } from "@/lib/seo";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME } from "@/lib/auth";
import { getAdminById } from "@/lib/admins";
import { getAdminBookingById } from "@/lib/bookings";
import { formatTimeRange } from "@/lib/schedule";
import AdminBookingEditor from "@/components/AdminBookingEditor";
import EventDetails from "@/components/EventDetails";
import { Card, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = privateMetadata(
  "Booking details",
  "Private Partiers booking details.",
);

export default async function BookingDetailPage({
  params,
}: PageProps<"/admin/bookings/[id]">) {
  const cookieStore = await cookies();
  const adminId = await verifyAdminSessionToken(
    cookieStore.get(ADMIN_COOKIE_NAME)?.value,
  );
  if (!adminId || !(await getAdminById(adminId))) redirect("/admin/login");
  const { id } = await params;
  const booking = await getAdminBookingById(id);
  if (!booking) notFound();
  const date = new Date(`${booking.date}T00:00:00`).toLocaleDateString(
    "en-CA",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <Link href="/admin" className="text-sm text-primary hover:underline">
        &larr; Back to dashboard
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Booking details</h1>
          <p className="mt-1 font-mono text-primary">
            {booking.referenceCode ?? booking._id}
          </p>
        </div>
        <StatusBadge status={booking.status} />
      </div>
      <Card className="space-y-4 p-6">
        <h2 className="text-xl font-semibold">Event &amp; family</h2>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          {[
            ["Parent", booking.parentName],
            ["Contact", booking.contact],
            ["Child", `${booking.childName} (age ${booking.childAge})`],
            ["Number of children", String(booking.numberOfChildren)],
            ["Date", date],
            ["Time", formatTimeRange(booking.time, booking.durationMinutes)],
            [
              "Duration",
              `${booking.durationMinutes / 60} ${booking.durationMinutes === 60 ? "hour" : "hours"}`,
            ],
            ["Booked", booking.userId ? "Customer account" : "Guest"],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted">{label}</dt>
              <dd className="mt-1 break-words font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <EventDetails booking={booking} />
        <div>
          <h3 className="text-sm font-medium">Parent’s notes</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
            {booking.notes || "No extra notes."}
          </p>
        </div>
        <p className="text-xs text-muted">
          Requested {new Date(booking.createdAt).toLocaleString("en-CA")}
        </p>
      </Card>
      <AdminBookingEditor
        id={booking._id}
        status={booking.status}
        initialNotes={booking.adminNotes}
      />
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Status history</h2>
        <ol className="space-y-4">
          {booking.statusHistory.map((change, index) => (
            <li
              key={index}
              className="flex flex-wrap items-center gap-3 text-sm"
            >
              <StatusBadge status={change.status} />
              <div>
                <p>
                  {change.actor === "system"
                    ? "Request received"
                    : change.actor === "unknown"
                      ? "Earlier status (before history was recorded)"
                      : `Changed by ${change.actor === "admin" ? "an admin" : "the customer"}`}
                </p>
                <time className="text-xs text-muted" dateTime={change.at}>
                  {new Date(change.at).toLocaleString("en-CA")}
                </time>
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
