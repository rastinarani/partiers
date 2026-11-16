"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import FadeIn from "./motion/FadeIn";
import { Card } from "./ui";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

interface MonthCalendarProps {
  selectedDate?: string; // "YYYY-MM-DD"
  onSelectDate: (date: string) => void;
  /** Dates that should show a small marker dot, e.g. confirmed bookings. */
  markedDates?: Set<string>;
  /** Disable dates before today. Defaults to true. */
  disablePast?: boolean;
  /** Dates shown crossed out, e.g. blocked days. */
  unavailableDates?: Set<string>;
  /** Whether crossed-out dates can still be clicked (admins can). Defaults to false. */
  allowSelectingUnavailable?: boolean;
}

export default function MonthCalendar({
  selectedDate,
  onSelectDate,
  markedDates,
  disablePast = true,
  unavailableDates,
  allowSelectingUnavailable = false,
}: MonthCalendarProps) {
  const initial = selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date();
  const [viewDate, setViewDate] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const [focusedDate, setFocusedDate] = useState(toDateKey(initial));
  const dayButtons = useRef(new Map<string, HTMLButtonElement>());
  const shouldFocus = useRef(false);
  const id = useId();

  useEffect(() => {
    if (shouldFocus.current) {
      dayButtons.current.get(focusedDate)?.focus();
      shouldFocus.current = false;
    }
  }, [focusedDate, viewDate]);

  const today = startOfDay(new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstOfMonth.getDay();

  const cells: Array<{ date: Date; inMonth: boolean }> = [];
  for (let i = 0; i < startWeekday; i++) {
    const d = new Date(year, month, 1 - (startWeekday - i));
    cells.push({ date: d, inMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: new Date(year, month, day), inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
  }

  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  function selectable(date: Date) {
    return (!disablePast || startOfDay(date) >= today)
      && (allowSelectingUnavailable || !unavailableDates?.has(toDateKey(date)));
  }
  const availableKeys = cells.filter(({ date, inMonth }) => inMonth && selectable(date)).map(({ date }) => toDateKey(date));
  const tabDate = availableKeys.includes(focusedDate) ? focusedDate
    : selectedDate && availableKeys.includes(selectedDate) ? selectedDate : availableKeys[0];

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, date: Date) {
    const target = new Date(date);
    let direction = 1;
    switch (event.key) {
      case "ArrowLeft": target.setDate(date.getDate() - 1); direction = -1; break;
      case "ArrowRight": target.setDate(date.getDate() + 1); break;
      case "ArrowUp": target.setDate(date.getDate() - 7); direction = -1; break;
      case "ArrowDown": target.setDate(date.getDate() + 7); break;
      case "Home": target.setDate(date.getDate() - date.getDay()); break;
      case "End": target.setDate(date.getDate() + 6 - date.getDay()); direction = -1; break;
      case "PageUp":
      case "PageDown": {
        direction = event.key === "PageUp" ? -1 : 1;
        target.setDate(1);
        target.setMonth(date.getMonth() + direction);
        target.setDate(Math.min(date.getDate(), new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()));
        break;
      }
      default: return;
    }
    event.preventDefault();
    if (disablePast && startOfDay(target) < today) {
      if (direction < 0) return;
      target.setTime(today.getTime());
    }
    // Skip unavailable dates without trapping keyboard users in an empty month.
    for (let skipped = 0; skipped <= (unavailableDates?.size ?? 0); skipped++) {
      if (disablePast && startOfDay(target) < today) return;
      if (selectable(target)) {
        shouldFocus.current = true;
        setFocusedDate(toDateKey(target));
        if (target.getFullYear() !== year || target.getMonth() !== month)
          setViewDate(new Date(target.getFullYear(), target.getMonth(), 1));
        return;
      }
      target.setDate(target.getDate() + direction);
    }
  }

  function renderDay({ date, inMonth }: { date: Date; inMonth: boolean }) {
    const key = toDateKey(date);
    const isToday = key === toDateKey(today);
    const isSelected = key === selectedDate;
    const isPast = disablePast && startOfDay(date) < today;
    const isMarked = markedDates?.has(key);
    const isUnavailable = inMonth && Boolean(unavailableDates?.has(key));
    const disabled = !inMonth || !selectable(date);

    return (
      <div key={key} role="gridcell" aria-selected={isSelected}>
        <button
          ref={(element) => {
            if (element) dayButtons.current.set(key, element);
            else dayButtons.current.delete(key);
          }}
          type="button"
          disabled={disabled}
          tabIndex={key === tabDate ? 0 : -1}
          aria-pressed={isSelected}
          aria-current={isToday ? "date" : undefined}
          onFocus={() => setFocusedDate(key)}
          onKeyDown={(event) => moveFocus(event, date)}
          onClick={() => onSelectDate(key)}
          aria-label={`${date.toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}${isUnavailable ? " (unavailable)" : ""}${isMarked ? " (confirmed events)" : ""}`}
          className={[
            "relative aspect-square w-full rounded-lg text-sm transition-colors",
            !inMonth ? "text-muted/30" : "",
            isPast && inMonth ? "text-muted/40 cursor-not-allowed" : "",
            isUnavailable && !isSelected ? "bg-danger-soft/60 text-muted line-through" : "",
            isUnavailable && disabled ? "cursor-not-allowed" : "",
            !disabled && !isSelected ? "hover:bg-primary-soft" : "",
            isSelected ? "bg-primary text-white font-semibold" : "",
            isToday && !isSelected ? "ring-1 ring-primary/50" : "",
          ].join(" ")}
        >
          {date.getDate()}
          {isMarked && (
            <span
              className={[
                "absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full",
                isSelected ? "bg-white" : "bg-accent-foreground",
              ].join(" ")}
            />
          )}
        </button>
      </div>
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="min-h-11 min-w-11 rounded-lg px-2 py-1 text-muted hover:bg-primary-soft hover:text-primary"
          aria-label="Previous month"
        >
          &larr;
        </button>
        <p id={`${id}-month`} className="text-sm font-semibold" aria-live="polite" aria-atomic="true">{monthLabel}</p>
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="min-h-11 min-w-11 rounded-lg px-2 py-1 text-muted hover:bg-primary-soft hover:text-primary"
          aria-label="Next month"
        >
          &rarr;
        </button>
      </div>

      <p id={`${id}-help`} className="sr-only">
        Use arrow keys to move between available dates. Enter or Space selects a date.
        Home and End move within the week. Page Up and Page Down change month.
      </p>
      <div role="grid" aria-labelledby={`${id}-month`} aria-describedby={`${id}-help`}>
        <div role="row" className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted">
          {WEEKDAYS.map((label) => (
            <div key={label} role="columnheader" aria-label={label} className="py-1">{label.slice(0, 2)}</div>
          ))}
        </div>
        <FadeIn key={`${year}-${month}`} className="grid gap-1">
          {Array.from({ length: cells.length / 7 }, (_, week) => (
            <div key={week} role="row" className="grid grid-cols-7 gap-1">
              {cells.slice(week * 7, week * 7 + 7).map(renderDay)}
            </div>
          ))}
        </FadeIn>
      </div>
    </Card>
  );
}
