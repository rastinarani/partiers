"use client";

import { useState } from "react";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md";
}

export default function StarRating({
  value,
  onChange,
  readOnly,
  size = "md",
}: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;
  const dimension = size === "sm" ? "text-base" : "text-2xl";
  if (readOnly)
    return (
      <span
        role="img"
        aria-label={`${value} out of 5 stars`}
        className={`flex gap-0.5 ${dimension}`}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            aria-hidden="true"
            style={{
              color: star <= value ? "var(--accent-foreground)" : "var(--muted)",
            }}
          >
            {star <= value ? "★" : "☆"}
          </span>
        ))}
      </span>
    );

  return (
    <div
      className={`flex gap-0.5 ${dimension}`}
      role="radiogroup"
      aria-label="Rating"
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          tabIndex={value === star || (value === 0 && star === 1) ? 0 : -1}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => setHover(star)}
          onKeyDown={(event) => {
            const next =
              event.key === "ArrowRight" || event.key === "ArrowUp"
                ? (star % 5) + 1
                : event.key === "ArrowLeft" || event.key === "ArrowDown"
                  ? ((star + 3) % 5) + 1
                  : event.key === "Home"
                    ? 1
                    : event.key === "End"
                      ? 5
                      : null;
            if (next !== null) {
              event.preventDefault();
              setHover(null);
              onChange?.(next);
              event.currentTarget.parentElement
                ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
                [next - 1]?.focus();
            }
          }}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          className="cursor-pointer rounded-md px-0.5 transition-transform duration-150 motion-safe:hover:scale-125 motion-safe:focus-visible:scale-110 motion-safe:active:scale-95 focus-visible:outline-2 focus-visible:outline-primary"
          style={{
            color: star <= display ? "var(--accent-foreground)" : "var(--muted)",
          }}
        >
          {star <= display ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}
