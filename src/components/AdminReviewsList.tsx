"use client";

import { useToast } from "./ToastProvider";

import { useState } from "react";
import { useRouter } from "next/navigation";
import HideRecordButton from "./HideRecordButton";
import type { Review, ReviewStatus } from "@/lib/types";
import StarRating from "./StarRating";
import { Button, Card, StatusBadge } from "./ui";

export default function AdminReviewsList({
  initialReviews,
}: {
  initialReviews: Review[];
}) {
  const router = useRouter();
  const notify = useToast();
  const reviews = initialReviews;
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
        notify(`Review ${status}.`);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        notify(
          data.error ?? "Couldn’t update this review. Please try again.",
          "error",
        );
      }
    } catch {
      notify("Couldn’t connect. Please try again.", "error");
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
        <Card key={r._id} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold">{r.name}</p>
                <StarRating value={r.rating} readOnly size="sm" />
              </div>
              <p className="mt-1 text-sm text-muted">{r.comment}</p>
            </div>
            <StatusBadge status={r.status} />
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              variant="success"
              size="xs"
              disabled={updatingId === r._id || r.status === "approved"}
              onClick={() => updateStatus(r._id, "approved")}
            >
              Approve
            </Button>
            <Button
              variant="danger"
              size="xs"
              disabled={updatingId === r._id || r.status === "rejected"}
              onClick={() => updateStatus(r._id, "rejected")}
            >
              Reject
            </Button>
          </div>
          <HideRecordButton
            id={r._id}
            kind="review"
            disabled={updatingId === r._id}
          />
        </Card>
      ))}
    </div>
  );
}
