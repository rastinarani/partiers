"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "./ui";

export default function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function cancel() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/account/bookings/${encodeURIComponent(bookingId)}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong. Please try again.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <Button variant="secondary" size="xs" onClick={() => setConfirming(true)}>
        Cancel booking
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium">Are you sure?</span>
      <Button variant="danger" size="xs" disabled={busy} onClick={cancel}>
        {busy ? "Cancelling..." : "Yes, cancel"}
      </Button>
      <Button variant="secondary" size="xs" disabled={busy} onClick={() => setConfirming(false)}>
        Keep it
      </Button>
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </div>
  );
}
