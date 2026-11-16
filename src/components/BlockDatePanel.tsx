"use client";

import { useToast } from "./ToastProvider";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, FormError, Input, Label } from "./ui";

/** Admin: block or unblock the selected calendar date. */
export default function BlockDatePanel({
  date,
  blockedReason,
  isPast,
}: {
  date: string;
  /** null when the date isn't blocked. */
  blockedReason: string | null;
  isPast: boolean;
}) {
  const router = useRouter();
  const notify = useToast();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(method: "POST" | "DELETE") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/blocked-dates", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(method === "POST" ? { date, reason } : { date }),
      });
      if (!res.ok) throw new Error("Couldn't save that. Please try again.");
      setReason("");
      notify(method === "POST" ? "Date blocked." : "Date unblocked.");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      notify(message, "error");
    } finally {
      setBusy(false);
    }
  }

  if (blockedReason !== null) {
    return (
      <Card flat className="mb-4 bg-danger-soft/40 p-4">
        <p className="text-sm font-semibold">This date is blocked</p>
        {blockedReason && (
          <p className="mt-1 text-sm text-muted">{blockedReason}</p>
        )}
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          disabled={busy}
          onClick={() => send("DELETE")}
        >
          {busy ? "Saving..." : "Unblock this date"}
        </Button>
        {error && <FormError className="mt-3">{error}</FormError>}
      </Card>
    );
  }

  if (isPast) return null;

  return (
    <Card flat className="mb-4 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send("POST");
        }}
      >
        <Label htmlFor="block-reason">
          Not available this day?{" "}
          <span className="font-normal text-muted">
            (note is only visible to admins)
          </span>
        </Label>
        <div className="flex flex-wrap gap-2">
          <Input
            id="block-reason"
            className="min-w-0 flex-1"
            maxLength={100}
            placeholder="e.g. Family vacation"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button type="submit" variant="danger" size="md" disabled={busy}>
            {busy ? "Saving..." : "Block this date"}
          </Button>
        </div>
        {error && <FormError className="mt-3">{error}</FormError>}
      </form>
    </Card>
  );
}
