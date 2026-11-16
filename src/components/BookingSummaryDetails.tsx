import { ACTIVITIES, EVENT_TYPES } from "@/lib/eventOptions";
import { formatDuration, formatTimeRange } from "@/lib/schedule";
import type { NewBooking } from "@/lib/types";

export default function BookingSummaryDetails({
  summary,
}: {
  summary: NewBooking;
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
      s.activities.length
        ? s.activities.map((a) => ACTIVITIES[a]).join(", ")
        : "Up to you!",
    ],
    ["Your details", `${s.parentName} · ${s.contact}`],
  ];
  if (s.notes) rows.push(["Notes", s.notes]);

  return (
    <dl className="mt-8 divide-y divide-card-border rounded-2xl border border-card-border text-sm">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid gap-1 px-4 py-3 sm:grid-cols-[8rem_1fr] sm:gap-4"
        >
          <dt className="font-medium text-muted">{label}</dt>
          <dd className="break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
