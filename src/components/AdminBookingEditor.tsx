"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { BookingStatus } from "@/lib/types";
import { Button, Card, FormError, Label, Textarea } from "./ui";

export default function AdminBookingEditor({ id, status, initialNotes }: {
  id: string; status: BookingStatus; initialNotes: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [busy, setBusy] = useState(false);
  const [cancelPrompt, setCancelPrompt] = useState(false);
  const [overlap, setOverlap] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function changeStatus(nextStatus: BookingStatus, force = false) {
    setBusy(true);
    setError("");
    setMessage("");
    setOverlap(null);
    setCancelPrompt(false);
    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus, force }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.overlap) setOverlap(`This overlaps ${data.overlap.parentName}’s confirmed booking (${data.overlap.time}).`);
        else setError(data.error ?? "Couldn't update this booking. Please try again.");
        return;
      }
      setMessage(`Booking ${nextStatus}.`);
      router.refresh();
    } catch {
      setError("Couldn't connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function saveNotes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/bookings/${id}/notes`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes: notes }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't save your notes. Please try again.");
        return;
      }
      setMessage("Private notes saved.");
      router.refresh();
    } catch {
      setError("Couldn't connect. Your notes are still here; please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-5 p-6">
      <h2 className="text-xl font-semibold">Manage booking</h2>
      {status === "cancelled" ? <p className="text-sm text-muted">This booking has been cancelled.</p> : (
        <div className="flex flex-wrap gap-2">
          <Button variant="success" disabled={busy || status === "confirmed"} onClick={() => changeStatus("confirmed")}>Confirm</Button>
          <Button variant="danger" disabled={busy || status === "declined"} onClick={() => changeStatus("declined")}>Decline</Button>
          <Button variant="secondary" disabled={busy} onClick={() => { setCancelPrompt(true); setOverlap(null); }}>Cancel booking</Button>
        </div>
      )}
      {overlap && (
        <div className="space-y-3 rounded-xl bg-accent/10 p-4 text-sm" role="alert">
          <p>{overlap} Confirm anyway?</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="success" disabled={busy} onClick={() => changeStatus("confirmed", true)}>Confirm anyway</Button>
            <Button variant="secondary" disabled={busy} onClick={() => setOverlap(null)}>Never mind</Button>
          </div>
        </div>
      )}
      {cancelPrompt && (
        <div className="space-y-3 rounded-xl bg-danger-soft p-4 text-sm">
          <p>Cancel this booking? It will stay in your records and cannot be reopened.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" disabled={busy} onClick={() => changeStatus("cancelled")}>Yes, cancel booking</Button>
            <Button variant="secondary" disabled={busy} onClick={() => setCancelPrompt(false)}>Keep booking</Button>
          </div>
        </div>
      )}
      <form onSubmit={saveNotes} className="space-y-3 border-t border-card-border pt-5">
        <div>
          <Label htmlFor="admin-notes">Private admin notes</Label>
          <p id="notes-help" className="mb-2 text-sm text-muted">Only admins can see these. Up to 5,000 characters.</p>
          <Textarea id="admin-notes" aria-describedby="notes-help" rows={5} maxLength={5000} disabled={busy} value={notes} onChange={(event) => { setNotes(event.target.value); setMessage(""); }} />
        </div>
        <Button type="submit" disabled={busy}>{busy ? "Please wait…" : "Save private notes"}</Button>
      </form>
      {error && <FormError role="alert">{error}</FormError>}
      <p role="status" className="text-sm text-success">{message}</p>
    </Card>
  );
}
