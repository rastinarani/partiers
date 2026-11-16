import { verifyUserSessionToken } from "@/lib/sessions";
import { privateMetadata } from "@/lib/seo";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { USER_COOKIE_NAME } from "@/lib/auth";
import { getBookingsForUser } from "@/lib/bookings";
import { splitUpcomingAndPast, todayString } from "@/lib/bookingDates";
import { getUserById } from "@/lib/users";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import LogoutButton from "@/components/LogoutButton";
import MyBookings from "@/components/MyBookings";
import ProfileForm from "@/components/ProfileForm";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = privateMetadata(
  "My bookings",
  "Manage your Partiers bookings and account settings.",
);

export default async function AccountPage() {
  const cookieStore = await cookies();
  const userId = await verifyUserSessionToken(
    cookieStore.get(USER_COOKIE_NAME)?.value,
  );
  const user = userId ? await getUserById(userId) : null;

  if (!user) {
    redirect("/login?next=/account");
  }

  // Query by the id from the verified session, never by anything the browser sends.
  const bookings = await getBookingsForUser(user.id);
  const { upcoming, past } = splitUpcomingAndPast(bookings, todayString());

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xl font-semibold text-primary">
            {user.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-semibold">
              Hi, {user.name}! &#127881;
            </h1>
            <p className="mt-1 text-sm text-muted">{user.email}</p>
          </div>
        </div>
        <LogoutButton endpoint="/api/auth/logout" redirectTo="/login" />
      </Card>

      <h2 className="mt-10 mb-4 text-2xl font-bold tracking-tight">
        My bookings
      </h2>
      <MyBookings upcoming={upcoming} past={past} />

      <h2 className="mt-12 mb-4 text-2xl font-bold tracking-tight">
        Account settings
      </h2>
      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        <ProfileForm initialName={user.name} initialPhone={user.phone} />
        <ChangePasswordForm />
      </div>
    </div>
  );
}
