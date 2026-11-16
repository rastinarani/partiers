import Link from "next/link";
import type { NewBooking } from "@/lib/types";
import BookingSummaryDetails from "./BookingSummaryDetails";
import { Button, buttonClasses, Card } from "./ui";

export interface BookingSummary extends NewBooking {
  referenceCode: string;
}

export default function BookingConfirmation({
  summary,
  loggedIn,
  onReset,
}: {
  summary: BookingSummary;
  loggedIn: boolean;
  onReset: () => void;
}) {
  const s = summary;

  return (
    <Card className="p-6 sm:p-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-2xl text-success">
          &#10003;
        </div>
        <h2 className="text-xl font-semibold">Request sent!</h2>
        <p className="mt-2 text-muted">
          Keep this reference handy if you get in touch with us:
        </p>
        <p className="mt-3 inline-block rounded-xl bg-primary-soft px-5 py-2 font-mono text-2xl font-bold tracking-widest text-primary">
          {s.referenceCode}
        </p>
      </div>

      <BookingSummaryDetails summary={summary} />

      <div className="mt-8">
        <h3 className="font-semibold">What happens next</h3>
        <ol className="mt-3 space-y-2 text-sm text-muted">
          <li>
            <span className="font-semibold text-primary">1.</span> We check our
            calendar. Nothing is booked until we confirm.
          </li>
          <li>
            <span className="font-semibold text-primary">2.</span> We get in
            touch at{" "}
            <span className="font-medium text-foreground">{s.contact}</span>,
            usually within a day or two.
          </li>
          <li>
            <span className="font-semibold text-primary">3.</span> On the day,
            we bring the fun. Payment is in person, no card needed now.
          </li>
        </ol>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {loggedIn ? (
          <Link
            href="/account"
            className={buttonClasses({ className: "text-center" })}
          >
            See it in My bookings
          </Link>
        ) : (
          <p className="text-center text-sm text-muted sm:self-center">
            Want to track it?{" "}
            <Link
              href="/signup"
              className="font-medium text-primary hover:underline"
            >
              Create an account
            </Link>{" "}
            for next time.
          </p>
        )}
        <Button variant="secondary" onClick={onReset}>
          Submit another request
        </Button>
      </div>
    </Card>
  );
}
