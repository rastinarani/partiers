import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/auth";
import { getAdminById } from "@/lib/admins";
import { getAllBookings } from "@/lib/bookings";
import { getAllReviews } from "@/lib/reviews";
import AdminBookingsList from "@/components/AdminBookingsList";
import AdminReviewsList from "@/components/AdminReviewsList";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const adminId = verifyAdminSessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
  const admin = adminId ? await getAdminById(adminId) : null;

  // proxy.ts already checks the cookie's signature before letting the
  // request through, but the admin account could have been removed since
  // — double check we can actually load a real admin before showing data.
  if (!admin) {
    redirect("/admin/login");
  }

  const [bookings, reviews] = await Promise.all([getAllBookings(), getAllReviews()]);
  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const pendingReviewCount = reviews.filter((r) => r.status === "pending").length;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-sm text-muted">
            Signed in as <span className="font-medium text-foreground">{admin.name}</span> (
            {admin.email})
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="mt-1 text-muted">
            {pendingCount} pending booking{pendingCount === 1 ? "" : "s"} &middot;{" "}
            {pendingReviewCount} pending review{pendingReviewCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/calendar"
            className="rounded-lg border border-card-border px-3 py-1.5 text-sm font-medium hover:bg-primary-soft hover:text-primary"
          >
            Confirmed bookings calendar
          </Link>
          <LogoutButton />
        </div>
      </div>

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold">Booking requests</h2>
        <AdminBookingsList initialBookings={bookings} />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Reviews</h2>
        <AdminReviewsList initialReviews={reviews} />
      </section>
    </div>
  );
}
