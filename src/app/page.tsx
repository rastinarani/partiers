import { verifyUserSessionToken } from "@/lib/sessions";
import Link from "next/link";
import { cookies } from "next/headers";
import FadeIn from "@/components/motion/FadeIn";
import {
  HomeServices,
  HowBookingWorks,
  HomeTestimonials,
  HomeFaq,
} from "@/components/HomeSections";
import { buttonClasses } from "@/components/ui";
import { getApprovedReviews } from "@/lib/reviews";
import BookingForm from "@/components/BookingForm";
import { USER_COOKIE_NAME } from "@/lib/auth";
import { todayString } from "@/lib/bookingDates";
import { getBlockedDates } from "@/lib/blockedDates";
import { getUserById } from "@/lib/users";

export default async function Home() {
  const cookieStore = await cookies();
  const userId = await verifyUserSessionToken(
    cookieStore.get(USER_COOKIE_NAME)?.value,
  );
  const [user, blocked, reviews] = await Promise.all([
    userId ? getUserById(userId) : null,
    getBlockedDates(todayString()),
    getApprovedReviews(),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-14 px-6 py-12">
      <div className="relative overflow-hidden rounded-3xl px-6 py-14 text-center">
        <div className="blob-field">
          <span className="blob blob-1" />
          <span className="blob blob-2" />
          <span className="blob blob-3" />
        </div>

        <FadeIn className="relative">
          <span className="mb-4 inline-block rounded-full bg-primary-soft px-4 py-1 text-sm font-semibold text-primary">
            &#127881; Games &middot; parties &middot; pure chaos (the good kind)
          </span>
          <h1 className="mx-auto max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            Kids&rsquo; entertainment that turns any get-together into a party.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Pick a date and time below and tell us about your event. We&rsquo;ll
            follow up to confirm &mdash; nothing is booked automatically.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="#booking" className={buttonClasses({ size: "lg" })}>
              Plan your party
            </Link>
            <Link
              href="#services"
              className={buttonClasses({ variant: "secondary", size: "lg" })}
            >
              Explore the activities
            </Link>
          </div>
        </FadeIn>
      </div>

      <HomeServices />
      <HowBookingWorks />
      <section
        id="booking"
        aria-labelledby="booking-title"
        className="scroll-mt-6 space-y-5"
      >
        <div>
          <h2 id="booking-title" className="text-2xl font-bold">
            Let’s plan your event
          </h2>
          <p className="mt-2 text-muted">
            Send a request in five short steps. No payment is needed now.
          </p>
        </div>
        {!user && (
          <FadeIn>
            <p className="mb-6 rounded-2xl bg-secondary-soft px-5 py-3 text-center text-sm">
              <Link
                href="/login?next=/"
                className="font-semibold text-primary hover:underline"
              >
                Log in
              </Link>{" "}
              or{" "}
              <Link
                href="/signup?next=/"
                className="font-semibold text-primary hover:underline"
              >
                create an account
              </Link>{" "}
              to keep track of your bookings. You can also book as a guest.
            </p>
          </FadeIn>
        )}

        <BookingForm
          defaultParentName={user?.name ?? ""}
          defaultContact={user?.email ?? ""}
          loggedIn={Boolean(user)}
          blockedDates={blocked.map((b) => b.date)}
        />
      </section>
      <HomeTestimonials reviews={reviews} />
      <HomeFaq />
    </div>
  );
}
