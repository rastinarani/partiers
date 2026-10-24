"use client";

import { useEffect, useState } from "react";
import { ACTIVITIES, EVENT_TYPES, type Activity, type EventType } from "@/lib/eventOptions";
import {
  DEFAULT_DURATION,
  DURATION_OPTIONS,
  endsByMidnight,
  findOverlap,
  formatClock,
  formatDuration,
  formatTimeRange,
  minutesToTime,
  toRange,
  type TimeRange,
} from "@/lib/schedule";
import BookingConfirmation, { type BookingSummary } from "./BookingConfirmation";
import MonthCalendar from "./MonthCalendar";
import { Button, FormError, Input, Label, Select, Textarea } from "./ui";

const TIME_SLOTS = Array.from({ length: 27 }, (_, i) => {
  const value = minutesToTime(9 * 60 + i * 30); // 9:00am through 10:00pm
  return { value, label: formatClock(value) };
});

export default function BookingForm({
  defaultParentName = "",
  defaultContact = "",
  loggedIn = false,
  blockedDates = [],
}: {
  defaultParentName?: string;
  defaultContact?: string;
  loggedIn?: boolean;
  blockedDates?: string[];
}) {
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState<number>(DEFAULT_DURATION);
  const [parentName, setParentName] = useState(defaultParentName);
  const [contact, setContact] = useState(defaultContact);
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [numberOfChildren, setNumberOfChildren] = useState("1");
  const [eventType, setEventType] = useState<EventType | "">("");
  const [location, setLocation] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notes, setNotes] = useState("");

  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitted, setSubmitted] = useState<BookingSummary | null>(null);

  // Times already taken by confirmed bookings, for the selected date.
  const [availability, setAvailability] = useState<{
    date: string;
    taken: TimeRange[];
    blocked: boolean;
  } | null>(null);
  const [unavailableDates] = useState(() => new Set(blockedDates));
  const [availabilityVersion, setAvailabilityVersion] = useState(0);

  useEffect(() => {
    if (!date) return;
    let ignore = false;
    fetch(`/api/availability?date=${date}`)
      .then((res) => (res.ok ? res.json() : { taken: [] }))
      .then((data: { taken?: TimeRange[]; blocked?: boolean }) => {
        if (!ignore) {
          setAvailability({ date, taken: data.taken ?? [], blocked: Boolean(data.blocked) });
        }
      })
      .catch(() => {
        // The server re-checks on submit, so a failed lookup just means
        // nothing is greyed out.
        if (!ignore) setAvailability({ date, taken: [], blocked: false });
      });
    return () => {
      ignore = true;
    };
  }, [date, availabilityVersion]);

  const taken = availability?.date === date ? availability.taken : [];
  // Blocked after the page loaded (the calendar only knows about earlier blocks).
  const dateBlocked = availability?.date === date && availability.blocked;

  function isSlotAvailable(slot: string) {
    return (
      endsByMidnight(slot, durationMinutes) &&
      !findOverlap(toRange(slot, durationMinutes), taken)
    );
  }

  const selectedTimeUnavailable = Boolean(time) && !isSlotAvailable(time);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!date || !time) {
      setStatus("error");
      setErrorMessage("Please pick a date and a time.");
      return;
    }
    if (dateBlocked) {
      setStatus("error");
      setErrorMessage("Sorry, we're not available that day. Please pick another date.");
      return;
    }
    if (selectedTimeUnavailable) {
      setStatus("error");
      setErrorMessage("That time isn't available. Please pick another one.");
      return;
    }
    if (!eventType) {
      setStatus("error");
      setErrorMessage("Please choose what kind of event it is.");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    try {
      const request = {
        parentName,
        contact,
        childName,
        childAge: Number(childAge),
        numberOfChildren: Number(numberOfChildren),
        date,
        time,
        durationMinutes,
        eventType,
        location,
        activities,
        notes,
      };
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) setAvailabilityVersion((v) => v + 1);
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      const data = await res.json();
      setSubmitted({
        ...request,
        parentName: parentName.trim(),
        contact: contact.trim(),
        childName: childName.trim(),
        location: location.trim(),
        notes: notes.trim(),
        referenceCode: data.referenceCode,
      });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  function reset() {
    setStatus("idle");
    setDate("");
    setTime("");
    setDurationMinutes(DEFAULT_DURATION);
    setParentName(defaultParentName);
    setContact(defaultContact);
    setChildName("");
    setChildAge("");
    setNumberOfChildren("1");
    setEventType("");
    setLocation("");
    setActivities([]);
    setNotes("");
    setSubmitted(null);
  }

  if (status === "done" && submitted) {
    return <BookingConfirmation summary={submitted} loggedIn={loggedIn} onReset={reset} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Label>Pick a date</Label>
          <MonthCalendar
            selectedDate={date}
            onSelectDate={setDate}
            unavailableDates={unavailableDates}
          />
          {dateBlocked && (
            <p className="mt-2 text-sm font-medium text-danger">
              Sorry, we&rsquo;re not available that day. Please pick another date.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="duration">How long?</Label>
            <Select
              id="duration"
              size="lg"
              required
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {formatDuration(d)}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="time">Start time</Label>
            <Select
              id="time"
              size="lg"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
            >
              <option value="" disabled>
                Select a time&hellip;
              </option>
              {TIME_SLOTS.map((slot) => {
                const available = isSlotAvailable(slot.value);
                return (
                  <option key={slot.value} value={slot.value} disabled={!available}>
                    {slot.label}
                    {available ? "" : " (unavailable)"}
                  </option>
                );
              })}
            </Select>
            {taken.length > 0 && (
              <p className="mt-1.5 text-xs text-muted">
                Already booked this day:{" "}
                {taken.map((r) => `${formatClock(r.start)}–${formatClock(r.end)}`).join(", ")}
              </p>
            )}
            {selectedTimeUnavailable && (
              <p className="mt-1.5 text-sm font-medium text-danger">
                That time doesn&rsquo;t fit. Please pick another start time or a shorter event.
              </p>
            )}
          </div>

          {date && (
            <p className="mt-3 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-hover">
              Requesting{" "}
              <strong>
                {new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </strong>
              {time && `, ${formatTimeRange(time, durationMinutes)}`}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Your name"
          value={parentName}
          onChange={setParentName}
          required
          placeholder="Jamie Smith"
        />
        <Field
          label="Phone or email"
          value={contact}
          onChange={setContact}
          required
          placeholder="jamie@email.com"
        />
        <Field
          label="Child's name"
          value={childName}
          onChange={setChildName}
          required
          placeholder="Alex"
        />
        <Field
          label="Child's age"
          value={childAge}
          onChange={setChildAge}
          required
          type="number"
          min={0}
          max={17}
          placeholder="6"
        />
        <Field
          label="Number of children"
          value={numberOfChildren}
          onChange={setNumberOfChildren}
          required
          type="number"
          min={1}
          max={50}
          placeholder="1"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="eventType">What kind of event?</Label>
          <Select
            id="eventType"
            size="lg"
            required
            value={eventType}
            onChange={(e) => setEventType(e.target.value as EventType)}
          >
            <option value="" disabled>
              Choose one&hellip;
            </option>
            {Object.entries(EVENT_TYPES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <Field
          label="Address or general area"
          value={location}
          onChange={setLocation}
          required
          placeholder="123 Maple St, or 'near High Park'"
        />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">
          Activities you&rsquo;d like <span className="font-normal text-muted">(pick any)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(ACTIVITIES) as [Activity, string][]).map(([value, label]) => {
            const checked = activities.includes(value);
            return (
              <label
                key={value}
                className={[
                  "cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/50",
                  checked
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-card-border hover:bg-primary-soft/50",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() =>
                    setActivities((prev) =>
                      checked ? prev.filter((a) => a !== value) : [...prev, value]
                    )
                  }
                />
                {checked ? "✓ " : ""}
                {label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <Label htmlFor="notes">
          Anything we should know? <span className="font-normal text-muted">(optional)</span>
        </Label>
        <Textarea
          id="notes"
          size="lg"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Allergies, favorite games, party theme, anything else we should know."
        />
      </div>

      {status === "error" && <FormError>{errorMessage}</FormError>}

      <Button
        type="submit"
        size="lg"
        disabled={status === "submitting"}
        className="w-full sm:w-auto"
      >
        {status === "submitting" ? "Sending request..." : "Request this time"}
      </Button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        size="lg"
        type={type}
        required={required}
        value={value}
        min={min}
        max={max}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
