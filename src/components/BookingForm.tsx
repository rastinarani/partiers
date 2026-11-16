"use client";

import PublicFormProtection, { usePublicFormProtection } from "./PublicFormProtection";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ACTIVITIES,
  EVENT_TYPES,
  type Activity,
  type EventType,
} from "@/lib/eventOptions";
import {
  DURATION_OPTIONS,
  endsByMidnight,
  findOverlap,
  formatClock,
  formatDuration,
  minutesToTime,
  toRange,
  type TimeRange,
} from "@/lib/schedule";
import { todayString } from "@/lib/bookingDates";
import {
  decodeBookingDraft,
  emptyBookingDraft,
  encodeBookingDraft,
  type BookingDraftState,
} from "@/lib/bookingDraft";
import { validateBookingInput, validateBookingStep } from "@/lib/validation";
import type { BookingDraft } from "@/lib/types";
import BookingConfirmation, {
  type BookingSummary,
} from "./BookingConfirmation";
import BookingSummaryDetails from "./BookingSummaryDetails";
import MonthCalendar from "./MonthCalendar";
import FadeIn from "./motion/FadeIn";
import { Button, Card, FormError, Input, Label, Select, Textarea } from "./ui";

const STEPS = ["Date", "Time", "Event details", "Your info", "Review & send"];
const TIME_SLOTS = Array.from({ length: 27 }, (_, i) => {
  const value = minutesToTime(9 * 60 + i * 30);
  return { value, label: formatClock(value) };
});

interface BookingFormProps {
  defaultParentName?: string;
  defaultContact?: string;
  loggedIn?: boolean;
  blockedDates?: string[];
}
const subscribeToHydration = () => () => {};

export default function BookingForm(props: BookingFormProps) {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  if (!hydrated)
    return (
      <Card className="p-6">
        <p role="status">Getting your booking ready…</p>
      </Card>
    );
  return (
    <BookingWizard
      key={props.loggedIn ? props.defaultContact : "guest"}
      {...props}
    />
  );
}

function BookingWizard({
  defaultParentName = "",
  defaultContact = "",
  loggedIn = false,
  blockedDates = [],
}: BookingFormProps) {
  const protection = usePublicFormProtection("booking");
  const storageKey = `partiers-booking-draft:v1:${loggedIn ? defaultContact : "guest"}`;
  const [initial] = useState(() => {
    try {
      const saved = decodeBookingDraft(
        sessionStorage.getItem(storageKey),
        todayString(),
      );
      return {
        form: saved ?? emptyBookingDraft(defaultParentName, defaultContact),
        restored: Boolean(saved),
        storageUnavailable: false,
      };
    } catch {
      return {
        form: emptyBookingDraft(defaultParentName, defaultContact),
        restored: false,
        storageUnavailable: true,
      };
    }
  });
  const [form, setForm] = useState(initial.form);
  const { values: draft, step } = form;
  const [storageUnavailable, setStorageUnavailable] = useState(
    initial.storageUnavailable,
  );
  const [restored, setRestored] = useState(initial.restored);
  const [clearPrompt, setClearPrompt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<BookingSummary | null>(null);
  const [availabilityVersion, setAvailabilityVersion] = useState(0);
  const [availability, setAvailability] = useState<{
    date: string;
    taken: TimeRange[];
    blocked: boolean;
    failed: boolean;
  } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const errorBox = useRef<HTMLDivElement>(null);
  const shouldFocus = useRef(false);
  const sending = useRef(false);

  useEffect(() => {
    if (shouldFocus.current) {
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView?.({ block: "start" });
      shouldFocus.current = false;
    }
  }, [step, submitted]);
  useEffect(() => {
    if (error) errorBox.current?.focus({ preventScroll: true });
  }, [error]);

  useEffect(() => {
    if (!draft.date || submitted) return;
    const controller = new AbortController();
    fetch(`/api/availability?date=${draft.date}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("lookup failed");
        return res.json();
      })
      .then((data: { taken: TimeRange[]; blocked: boolean }) => {
        if (!controller.signal.aborted)
          setAvailability({
            date: draft.date,
            taken: data.taken,
            blocked: data.blocked,
            failed: false,
          });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setAvailability({
            date: draft.date,
            taken: [],
            blocked: false,
            failed: true,
          });
      });
    return () => controller.abort();
  }, [draft.date, availabilityVersion, submitted]);

  const currentAvailability =
    availability?.date === draft.date ? availability : null;
  const checking = Boolean(draft.date) && !currentAvailability;
  const dateBlocked =
    blockedDates.includes(draft.date) || Boolean(currentAvailability?.blocked);
  const taken = currentAvailability?.taken ?? [];
  const canCheckTimes =
    Boolean(currentAvailability) &&
    !currentAvailability?.failed &&
    !dateBlocked;
  function slotAvailable(time: string) {
    return (
      endsByMidnight(time, draft.durationMinutes) &&
      !findOverlap(toRange(time, draft.durationMinutes), taken)
    );
  }
  const timeUnavailable = Boolean(draft.time) && !slotAvailable(draft.time);
  const request = validateBookingInput({
    ...draft,
    notes: draft.notes.trim(),
    childAge: Number(draft.childAge),
    numberOfChildren: Number(draft.numberOfChildren),
  });

  function save(next: BookingDraftState) {
    setForm(next);
    try {
      sessionStorage.setItem(storageKey, encodeBookingDraft(next));
    } catch {
      setStorageUnavailable(true);
    }
  }
  function update<K extends keyof BookingDraft>(
    key: K,
    value: BookingDraft[K],
  ) {
    setError("");
    save({
      step,
      values: {
        ...draft,
        [key]: value,
        ...(key === "date" ? { time: "" } : {}),
      },
    });
  }
  function go(nextStep: number) {
    setError("");
    setClearPrompt(false);
    shouldFocus.current = true;
    save({ ...form, values: draft, step: nextStep });
  }
  function check(nextStep: number) {
    if (nextStep <= 1 && dateBlocked) return "Sorry, we're not available that day. Please pick another date.";
    if (nextStep === 1 && !canCheckTimes) return "Please wait for availability, or retry the check below.";
    const invalid = validateBookingStep(nextStep, draft, todayString());
    if (invalid) return invalid;
    if (nextStep === 1 && timeUnavailable) return "That time doesn't fit. Please pick another time or a shorter event.";
    return null;
  }
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current || busy || (step === 4 && !protection.ready)) return;
    if (step < 4) {
      const invalid = check(step);
      if (invalid) {
        setError(invalid);
        return;
      }
      go(step + 1);
      return;
    }
    for (let earlier = 0; earlier < 4; earlier++) {
      const invalid = check(earlier);
      if (invalid) {
        go(earlier);
        setError(invalid);
        return;
      }
    }
    if (!request) {
      setError("Please check your details before sending.");
      return;
    }
    sending.current = true;
    const requestKey = form.requestKey ?? crypto.randomUUID();
    save({ ...form, requestKey });
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": requestKey },
        body: JSON.stringify({ ...request, ...protection.payload(event.currentTarget) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 400) protection.retry();
        if (res.status === 409) {
          setAvailability(null);
          setAvailabilityVersion((version) => version + 1);
          go(1);
        }
        throw new Error(
          data.error || "Couldn't send your request. Please try again.",
        );
      }
      setSubmitted({ ...request, referenceCode: data.referenceCode });
      shouldFocus.current = true;
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* The request is already safely saved on the server. */
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Couldn't connect. Please try again.",
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  function reset() {
    protection.retry();
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      setStorageUnavailable(true);
    }
    setForm(emptyBookingDraft(defaultParentName, defaultContact));
    setSubmitted(null);
    setError("");
    setRestored(false);
    setClearPrompt(false);
    shouldFocus.current = true;
  }

  if (submitted)
    return (
        <BookingConfirmation
          summary={submitted}
          loggedIn={loggedIn}
          onReset={reset}
        />
    );

  return (
    <Card className="p-5 sm:p-8">
      <form
        onSubmit={handleSubmit}
        noValidate
        aria-labelledby="booking-step-title"
        className="space-y-6"
      >
        <PublicFormProtection protection={protection} />
        <nav aria-label="Booking progress">
          <ol className="grid grid-cols-5 gap-1 text-center text-xs sm:gap-3 sm:text-sm">
            {STEPS.map((label, index) => (
              <li
                key={label}
                aria-current={index === step ? "step" : undefined}
              >
                <button
                  type="button"
                  disabled={busy || index >= step}
                  onClick={() => go(index)}
                  className={`w-full rounded-xl px-1 py-2 focus-visible:outline-2 focus-visible:outline-primary ${index === step ? "bg-primary-soft font-semibold text-primary" : "text-muted"}`}
                >
                  <span className="mb-1 block font-semibold">{index + 1}</span>
                  {label}
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <div>
          <p className="text-sm text-muted">
            Step {step + 1} of {STEPS.length}
          </p>
          <h2
            id="booking-step-title"
            ref={heading}
            tabIndex={-1}
            className="mt-1 scroll-mt-6 rounded-lg text-2xl font-semibold"
          >
            {STEPS[step]}
          </h2>
          <p className="mt-2 text-xs text-muted" role="status">
            {storageUnavailable
              ? "Your browser couldn't save your progress. Keep this page open until you send your request."
              : restored
                ? "Your saved draft is back. Please check it before sending."
                : "Your progress is saved in this tab for up to a day. You can clear it below."}
          </p>
        </div>
        <fieldset disabled={busy} className="min-w-0 space-y-6">
          <legend className="sr-only">{STEPS[step]}</legend>
          <FadeIn key={step} className="space-y-5">
            {step === 0 && (
              <>
                <p className="text-sm text-muted">
                  Choose a day for your event. Crossed-out dates are
                  unavailable.
                </p>
                <div className="max-w-md">
                  <MonthCalendar
                    selectedDate={draft.date}
                    onSelectDate={(value) => update("date", value)}
                    unavailableDates={new Set(blockedDates)}
                  />
                </div>
                {draft.date && (
                  <p className="text-sm font-medium">
                    Selected:{" "}
                    {new Date(`${draft.date}T12:00:00`).toLocaleDateString(
                      "en-CA",
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                  </p>
                )}
                {dateBlocked && (
                  <p className="text-sm text-danger">
                    Sorry, we’re not available that day. Please choose another
                    date.
                  </p>
                )}
              </>
            )}
            {step === 1 && (
              <>
                <p className="text-sm text-muted">
                  Choose a start time and how long you’d like us to stay.
                </p>
                {checking && <p role="status">Checking available times…</p>}
                {currentAvailability?.failed && (
                  <div role="alert" className="space-y-2">
                    <p>We couldn’t check availability. Please try again.</p>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setAvailability(null);
                        setAvailabilityVersion((version) => version + 1);
                      }}
                    >
                      Retry availability
                    </Button>
                  </div>
                )}
                {dateBlocked && (
                  <p className="text-sm text-danger">
                    This date is unavailable. Go back and pick another day.
                  </p>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="duration">How long?</Label>
                    <Select
                      id="duration"
                      size="lg"
                      value={draft.durationMinutes}
                      onChange={(event) =>
                        update("durationMinutes", Number(event.target.value))
                      }
                    >
                      {DURATION_OPTIONS.map((duration) => (
                        <option key={duration} value={duration}>
                          {formatDuration(duration)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="time">Start time</Label>
                    <Select
                      id="time"
                      size="lg"
                      disabled={!canCheckTimes}
                      value={draft.time}
                      onChange={(event) => update("time", event.target.value)}
                    >
                      <option value="" disabled>
                        Select a time…
                      </option>
                      {TIME_SLOTS.map((slot) => (
                        <option
                          key={slot.value}
                          value={slot.value}
                          disabled={!slotAvailable(slot.value)}
                        >
                          {slot.label}
                          {slotAvailable(slot.value) ? "" : " (unavailable)"}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                {taken.length > 0 && (
                  <p className="text-xs text-muted">
                    Already booked:{" "}
                    {taken
                      .map(
                        (range) =>
                          `${formatClock(range.start)}–${formatClock(range.end)}`,
                      )
                      .join(", ")}
                  </p>
                )}
                {timeUnavailable && (
                  <p className="text-sm text-danger">
                    That time doesn’t fit. Please pick another start time or a
                    shorter event.
                  </p>
                )}
              </>
            )}
            {step === 2 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="eventType">What kind of event?</Label>
                    <Select
                      id="eventType"
                      size="lg"
                      value={draft.eventType}
                      onChange={(event) =>
                        update("eventType", event.target.value as EventType)
                      }
                    >
                      <option value="" disabled>
                        Choose one…
                      </option>
                      {Object.entries(EVENT_TYPES).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Field
                    id="location"
                    label="Address or general area"
                    value={draft.location}
                    onChange={(value) => update("location", value)}
                    maxLength={200}
                    placeholder="123 Maple St, or near High Park"
                  />
                </div>
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">
                    Activities you’d like (pick any)
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {(Object.entries(ACTIVITIES) as [Activity, string][]).map(
                      ([value, label]) => {
                        const checked = draft.activities.includes(value);
                        return (
                          <label
                            key={value}
                            className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-offset-2 ${checked ? "border-primary bg-primary-soft text-primary" : "border-muted/80 hover:bg-primary-soft/50"}`}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={checked}
                              onChange={() =>
                                update(
                                  "activities",
                                  checked
                                    ? draft.activities.filter(
                                        (activity) => activity !== value,
                                      )
                                    : [...draft.activities, value],
                                )
                              }
                            />
                            {checked ? "✓ " : ""}
                            {label}
                          </label>
                        );
                      },
                    )}
                  </div>
                </fieldset>
                <div>
                  <Label htmlFor="notes">
                    Anything we should know? (optional)
                  </Label>
                  <Textarea
                    id="notes"
                    size="lg"
                    rows={3}
                    maxLength={1000}
                    value={draft.notes}
                    onChange={(event) => update("notes", event.target.value)}
                    placeholder="Allergies, favorite games or party theme"
                  />
                </div>
              </>
            )}
            {step === 3 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="parentName"
                  label="Your name"
                  value={draft.parentName}
                  onChange={(value) => update("parentName", value)}
                  maxLength={100}
                  autoComplete="name"
                />
                <Field
                  id="contact"
                  label="Phone or email"
                  value={draft.contact}
                  onChange={(value) => update("contact", value)}
                  maxLength={150}
                />
                <Field
                  id="childName"
                  label="Child's name"
                  value={draft.childName}
                  onChange={(value) => update("childName", value)}
                  maxLength={100}
                />
                <Field
                  id="childAge"
                  label="Child's age"
                  value={draft.childAge}
                  onChange={(value) => update("childAge", value)}
                  type="number"
                  min={0}
                  max={17}
                />
                <Field
                  id="numberOfChildren"
                  label="Number of children"
                  value={draft.numberOfChildren}
                  onChange={(value) => update("numberOfChildren", value)}
                  type="number"
                  min={1}
                  max={50}
                />
              </div>
            )}
            {step === 4 && (
              <>
                <p className="text-sm text-muted">
                  Check your request below. Nothing is booked until we confirm,
                  and no payment is needed now.
                </p>
                {checking && <p role="status">Checking available times…</p>}
                {currentAvailability?.failed && (
                  <div role="alert" className="space-y-2">
                    <p>
                      We couldn’t check availability. Please try again before
                      sending.
                    </p>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setAvailability(null);
                        setAvailabilityVersion((version) => version + 1);
                      }}
                    >
                      Retry availability
                    </Button>
                  </div>
                )}
                {dateBlocked && (
                  <p className="text-sm text-danger">
                    This date is unavailable. Use Edit date to choose another
                    day.
                  </p>
                )}
                {request && <BookingSummaryDetails summary={request} />}
                <div className="flex flex-wrap gap-2">
                  {["date", "time", "event", "your info"].map(
                    (label, index) => (
                      <Button
                        key={label}
                        size="sm"
                        variant="secondary"
                        onClick={() => go(index)}
                      >
                        Edit {label}
                      </Button>
                    ),
                  )}
                </div>
              </>
            )}
          </FadeIn>
          {error && (
            <div ref={errorBox} tabIndex={-1}>
              <FormError role="alert">{error}</FormError>
            </div>
          )}
          <div className="flex flex-wrap gap-3 border-t border-card-border pt-5">
            {step > 0 && (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => go(step - 1)}
              >
                Back
              </Button>
            )}
            <Button
              type="submit"
              size="lg"
              className="flex-1 sm:flex-none"
              disabled={busy || (step === 4 && (!canCheckTimes || !protection.ready))}
            >
              {busy
                ? "Sending request…"
                : step === 4
                  ? "Send booking request"
                  : "Next"}
            </Button>
          </div>
        </fieldset>
        <div className="border-t border-card-border pt-4 text-sm">
          {clearPrompt ? (
            <div className="space-y-2">
              <p>Clear this draft and start again?</p>
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  size="xs"
                  disabled={busy}
                  onClick={reset}
                >
                  Yes, clear draft
                </Button>
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => setClearPrompt(false)}
                >
                  Keep draft
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="text-muted underline underline-offset-4"
              disabled={busy}
              onClick={() => setClearPrompt(true)}
            >
              Clear draft
            </button>
          )}
        </div>
      </form>
    </Card>
  );
}

function Field({
  id,
  label,
  onChange,
  ...props
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
} & Omit<React.ComponentProps<typeof Input>, "onChange" | "id">) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        {...props}
        id={id}
        size="lg"
        required
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
