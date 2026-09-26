"use client";

import { useState } from "react";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md";
}

export default function StarRating({ value, onChange, readOnly, size = "md" }: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;
  const dimension = size === "sm" ? "text-base" : "text-2xl";

  return (
    <div className={`flex gap-0.5 ${dimension}`} role={readOnly ? undefined : "radiogroup"}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(null)}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          className={readOnly ? "cursor-default" : "cursor-pointer"}
          style={{ color: star <= display ? "var(--accent)" : "var(--card-border)" }}
        >
          &#9733;
        </button>
      ))}
    </div>
  );
}
