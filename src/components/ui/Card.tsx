import type { ComponentProps } from "react";
import { cn } from "./cn";

type CardProps = ComponentProps<"div"> & {
  /** Drop the shadow, for quieter boxes like side notes and empty states. */
  flat?: boolean;
};

/** A rounded white card. Pass padding (e.g. `p-6`) through `className`. */
export function Card({ flat, className, ...props }: CardProps) {
  return (
    <div
      className={cn("rounded-2xl border border-card-border bg-card", !flat && "shadow-sm", className)}
      {...props}
    />
  );
}
