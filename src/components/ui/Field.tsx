import type { ComponentProps } from "react";
import { cn } from "./cn";

const FIELD_BASE =
  "w-full rounded-xl border border-card-border bg-card px-4 text-sm focus:border-primary focus:outline-none";

const FIELD_SIZES = {
  md: "py-2.5",
  lg: "py-3",
};

type FieldSize = keyof typeof FIELD_SIZES;

// Inputs and selects have a native numeric `size` attribute, which we replace with our own.
type InputProps = Omit<ComponentProps<"input">, "size"> & { size?: FieldSize };
type SelectProps = Omit<ComponentProps<"select">, "size"> & { size?: FieldSize };
type TextareaProps = ComponentProps<"textarea"> & { size?: FieldSize };

export function Input({ size = "md", className, ...props }: InputProps) {
  return <input className={cn(FIELD_BASE, FIELD_SIZES[size], className)} {...props} />;
}

export function Select({ size = "md", className, ...props }: SelectProps) {
  return <select className={cn(FIELD_BASE, FIELD_SIZES[size], className)} {...props} />;
}

export function Textarea({ size = "md", className, ...props }: TextareaProps) {
  return <textarea className={cn(FIELD_BASE, FIELD_SIZES[size], className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("mb-2 block text-sm font-medium", className)} {...props} />;
}

export function FormError({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn("rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger", className)}
      {...props}
    />
  );
}
