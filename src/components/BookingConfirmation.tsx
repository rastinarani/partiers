import Link from "next/link";
import { ACTIVITIES, EVENT_TYPES, type Activity, type EventType } from "@/lib/eventOptions";
import { formatDuration, formatTimeRange } from "@/lib/schedule";
import { Button, buttonClasses, Card } from "./ui";

export interface BookingSummary {
  referenceCode: string;
  date: string;
  time: string;
  durationMinutes: number;
  eventType: EventType;
  location: string;
  activities: Activity[];
  childName: string;
  childAge: number;
  numberOfChildren: number;
  parentName: string;
  contact: string;
  notes: string;
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
  const rows: Array<[string, string]> = [
    [
      "When",
      `${new Date(`${s.date}T00:00:00`).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })}, ${formatTimeRange(s.time, s.durationMinutes)} (${formatDuration(s.durationMinutes)})`,
    ],
    ["Event", EVENT_TYPES[s.eventType]],
    ["Where", s.location],
    [
      "Kids",
      `${s.childName} (${s.childAge}) · ${s.numberOfChildren} ${s.numberOfChildren === 1 ? "child" : "children"}`,
    ],
    [
      "Activities",
      s.activities.length ? s.activities.map((a) => ACTIVITIES[a]).join(", ") : "Up to you!",
    ],
    ["Your details", `${s.parentName} · ${s.contact}`],
  ];
  if (s.notes) rows.push(["Notes", s.notes]);

  return (
    <Card className="p-6 sm:p-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-2xl text-success">
          &#10003;
        </div>
        <h2 className="text-xl font-semibold">Request sent!</h2>
        <p className="mt-2 text-muted">Keep this reference handy if you get in touch with us:</p>
        <p className="mt-3 inline-block rounded-xl bg-primary-soft px-5 py-2 font-mono text-2xl font-bold tracking-widest text-primary">
          {s.referenceCode}
        </p>
      </div>

      <dl className="mt-8 divide-y divide-card-border rounded-2xl border border-card-border text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[8rem_1fr] sm:gap-4">
            <dt className="font-medium text-muted">{label}</dt>
            <dd className="break-words">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8">
        <h3 className="font-semibold">What happens next</h3>
        <ol className="mt-3 space-y-2 text-sm text-muted">
          <li>
            <span className="font-semibold text-primary">1.</span> We check our calendar. Nothing
            is booked until we confirm.
          </li>
          <li>
            <span className="font-semibold text-primary">2.</span> We get in touch at{" "}
            <span className="font-medium text-foreground">{s.contact}</span>, usually within a
            day or two.
          </li>
          <li>
            <span className="font-semibold text-primary">3.</span> On the day, we bring the fun.
            Payment is in person, no card needed now.
          </li>
        </ol>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {loggedIn ? (
          <Link href="/account" className={buttonClasses({ className: "text-center" })}>
            See it in My bookings
          </Link>
        ) : (
          <p className="text-center text-sm text-muted sm:self-center">
            Want to track it?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
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
