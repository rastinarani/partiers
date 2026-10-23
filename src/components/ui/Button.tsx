import type { ComponentProps } from "react";
import { cn } from "./cn";

const VARIANTS = {
  primary:
    "bg-gradient-to-r from-primary to-secondary font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60",
  secondary: "border border-card-border font-medium hover:bg-primary-soft hover:text-primary",
  success: "bg-success font-semibold text-white hover:opacity-90 disabled:opacity-40",
  danger: "bg-danger font-semibold text-white hover:opacity-90 disabled:opacity-40",
};

const SIZES = {
  xs: "rounded-lg px-3 py-1.5 text-xs",
  sm: "rounded-lg px-3 py-1.5 text-sm",
  md: "rounded-xl px-4 py-2.5 text-sm",
  lg: "rounded-xl px-4 py-3 text-sm",
};

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

/** For links that should look like buttons, e.g. `<Link className={buttonClasses({ variant: "secondary" })}>`. */
export function buttonClasses({ variant = "primary", size = "md", className }: ButtonStyleOptions = {}) {
  return cn(SIZES[size], VARIANTS[variant], className);
}

type ButtonProps = ComponentProps<"button"> & ButtonStyleOptions;

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}
