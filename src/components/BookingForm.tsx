"use client";

import { useState } from "react";
import MonthCalendar from "./MonthCalendar";

const TIME_SLOTS = Array.from({ length: 27 }, (_, i) => {
  const minutes = 9 * 60 + i * 30; // 9:00am through 10:00pm
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const label = new Date(2000, 0, 1, h24, m).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const value = `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return { value, label };
});

export default function BookingForm() {
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [parentName, setParentName] = useState("");
  const [contact, setContact] = useState("");
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [notes, setNotes] = useState("");

  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!date || !time) {
      setStatus("error");
      setErrorMessage("Please pick a date and a time.");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentName,
          contact,
          childName,
          childAge: Number(childAge),
          date,
          time,
          notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-card-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-2xl text-success">
          &#10003;
        </div>
        <h2 className="text-xl font-semibold">Request sent!</h2>
        <p className="mt-2 text-muted">
          Thanks! We&rsquo;ll get back to you soon to confirm the date and time. Nothing is
          booked until you hear back from us.
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setDate("");
            setTime("");
            setParentName("");
            setContact("");
            setChildName("");
            setChildAge("");
            setNotes("");
          }}
          className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">Pick a date</label>
          <MonthCalendar selectedDate={date} onSelectDate={setDate} />
        </div>

        <div>
          <label htmlFor="time" className="mb-2 block text-sm font-medium">
            Pick a time
          </label>
          <select
            id="time"
            required
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full rounded-xl border border-card-border bg-card px-4 py-3 text-sm focus:border-primary focus:outline-none"
          >
            <option value="" disabled>
              Select a time&hellip;
            </option>
            {TIME_SLOTS.map((slot) => (
              <option key={slot.value} value={slot.value}>
                {slot.label}
              </option>
            ))}
          </select>

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
              {time &&
                ` at ${TIME_SLOTS.find((s) => s.value === time)?.label}`}
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
      </div>

      <div>
        <label htmlFor="notes" className="mb-2 block text-sm font-medium">
          Anything we should know? <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Allergies, favorite activities, bedtime routine, etc."
          className="w-full rounded-xl border border-card-border bg-card px-4 py-3 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      {status === "error" && (
        <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60 sm:w-auto"
      >
        {status === "submitting" ? "Sending request..." : "Request this time"}
      </button>
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
      <label className="mb-2 block text-sm font-medium">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        min={min}
        max={max}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-card-border bg-card px-4 py-3 text-sm focus:border-primary focus:outline-none"
      />
    </div>
  );
}
