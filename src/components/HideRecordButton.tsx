"use client";

import { useToast } from "./ToastProvider";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, FormError } from "./ui";

export default function HideRecordButton({
  id,
  kind,
  disabled = false,
  returnToDashboard = false,
}: {
  id: string;
  kind: "booking" | "review";
  disabled?: boolean;
  returnToDashboard?: boolean;
}) {
  const router = useRouter();
  const notify = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function hide() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/${kind}s/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          data.error ?? `Couldn't hide this ${kind}. Please try again.`;
        setError(message);
        notify(message, "error");
        return;
      }
      notify(`${kind === "booking" ? "Booking" : "Review"} hidden.`);
      if (returnToDashboard) router.replace("/admin");
      router.refresh();
    } catch {
      setError("Couldn't connect. Please try again.");
      notify("Couldn’t connect. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 space-y-2">
      {confirming ? (
        <div className="space-y-3 rounded-xl bg-danger-soft p-3 text-sm">
          <p>
            Hide this {kind}? It will disappear from the website, but stay saved
            in your records.
            {kind === "booking" &&
              " If confirmed, its time will become available again."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="danger"
              size="xs"
              disabled={busy || disabled}
              onClick={hide}
            >
              {busy ? "Hiding…" : `Yes, hide ${kind}`}
            </Button>
            <Button
              variant="secondary"
              size="xs"
              disabled={busy}
              onClick={() => {
                setConfirming(false);
                setError("");
              }}
            >
              Keep {kind}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="danger"
          size="xs"
          disabled={disabled}
          onClick={() => setConfirming(true)}
        >
          Hide {kind}
        </Button>
      )}
      {error && <FormError role="alert">{error}</FormError>}
    </div>
  );
}
