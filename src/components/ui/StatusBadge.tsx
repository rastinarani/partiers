import type { BookingStatus, ReviewStatus } from "@/lib/types";

const STATUS_STYLES: Record<BookingStatus | ReviewStatus, string> = {
  pending: "bg-accent/15 text-accent",
  confirmed: "bg-success-soft text-success",
  approved: "bg-success-soft text-success",
  declined: "bg-danger-soft text-danger",
  rejected: "bg-danger-soft text-danger",
};

export function StatusBadge({ status }: { status: BookingStatus | ReviewStatus }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}
