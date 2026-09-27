"use client";

import { useState } from "react";
import StarRating from "./StarRating";

export default function ReviewForm() {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, rating, comment }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-card-border bg-card p-6 text-center shadow-sm">
        <p className="font-medium">Thanks for the review!</p>
        <p className="mt-1 text-sm text-muted">
          It&rsquo;ll show up here once we&rsquo;ve approved it.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-card-border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">Leave a review</h2>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Your name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jamie Smith"
            className="w-full rounded-xl border border-card-border bg-card px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Rating</label>
          <StarRating value={rating} onChange={setRating} />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Comment</label>
          <textarea
            required
            rows={3}
            maxLength={1000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="How did it go?"
            className="w-full rounded-xl border border-card-border bg-card px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        {status === "error" && (
          <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{errorMessage}</p>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="rounded-xl bg-gradient-to-r from-primary to-secondary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
        >
          {status === "submitting" ? "Submitting..." : "Submit review"}
        </button>
      </div>
    </form>
  );
}
