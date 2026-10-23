"use client";

import { useState } from "react";
import StarRating from "./StarRating";
import { Button, Card, FormError, Input, Label, Textarea } from "./ui";

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
      <Card className="p-6 text-center">
        <p className="font-medium">Thanks for the review!</p>
        <p className="mt-1 text-sm text-muted">
          It&rsquo;ll show up here once we&rsquo;ve approved it.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit}>
        <h2 className="mb-4 text-lg font-semibold">Leave a review</h2>

        <div className="space-y-4">
          <div>
            <Label>Your name</Label>
            <Input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jamie Smith"
            />
          </div>

          <div>
            <Label>Rating</Label>
            <StarRating value={rating} onChange={setRating} />
          </div>

          <div>
            <Label>Comment</Label>
            <Textarea
              required
              rows={3}
              maxLength={1000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How did it go?"
            />
          </div>

          {status === "error" && <FormError>{errorMessage}</FormError>}

          <Button type="submit" disabled={status === "submitting"}>
            {status === "submitting" ? "Submitting..." : "Submit review"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
