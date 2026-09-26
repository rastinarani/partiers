"use client";

import { useState } from "react";
import type { Review, ReviewStatus } from "@/lib/types";
import StarRating from "./StarRating";

const STATUS_STYLES: Record<ReviewStatus, string> = {
  pending: "bg-accent/15 text-accent",
  approved: "bg-success-soft text-success",
  rejected: "bg-danger-soft text-danger",
};

export default function AdminReviewsList({ initialReviews }: { initialReviews: Review[] }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function updateStatus(id: string, status: ReviewStatus) {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setReviews((prev) => prev.map((r) => (r._id === id ? { ...r, status } : r)));
      }
    } finally {
      setUpdatingId(null);
    }
  }

  if (reviews.length === 0) {
    return <p className="text-muted">No reviews yet.</p>;
  }

  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <div key={r._id} className="rounded-2xl border border-card-border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold">{r.name}</p>
                <StarRating value={r.rating} readOnly size="sm" />
              </div>
              <p className="mt-1 text-sm text-muted">{r.comment}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[r.status]}`}>
              {r.status}
            </span>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={updatingId === r._id || r.status === "approved"}
              onClick={() => updateStatus(r._id, "approved")}
              className="rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={updatingId === r._id || r.status === "rejected"}
              onClick={() => updateStatus(r._id, "rejected")}
              className="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
