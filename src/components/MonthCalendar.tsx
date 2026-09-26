"use client";

import { useState } from "react";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

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
}

export default function MonthCalendar({
  selectedDate,
  onSelectDate,
  markedDates,
  disablePast = true,
}: MonthCalendarProps) {
  const initial = selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date();
  const [viewDate, setViewDate] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));

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

  return (
    <div className="rounded-2xl border border-card-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="rounded-lg px-2 py-1 text-muted hover:bg-primary-soft hover:text-primary"
          aria-label="Previous month"
        >
          &larr;
        </button>
        <p className="text-sm font-semibold">{monthLabel}</p>
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="rounded-lg px-2 py-1 text-muted hover:bg-primary-soft hover:text-primary"
          aria-label="Next month"
        >
          &rarr;
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={i} className="py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map(({ date, inMonth }, i) => {
          const key = toDateKey(date);
          const isToday = key === toDateKey(today);
          const isSelected = key === selectedDate;
          const isPast = disablePast && startOfDay(date) < today;
          const isMarked = markedDates?.has(key);
          const disabled = isPast || !inMonth;

          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(key)}
              className={[
                "relative aspect-square rounded-lg text-sm transition-colors",
                !inMonth ? "text-muted/30" : "",
                isPast && inMonth ? "text-muted/40 cursor-not-allowed" : "",
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
                    isSelected ? "bg-white" : "bg-accent",
                  ].join(" ")}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
