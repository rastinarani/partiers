"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, FormError, Input, Label } from "./ui";

export default function ChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError("The new passwords don't match.");
      setStatus("error");
      return;
    }

    setStatus("saving");
    setError("");

    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong.");
      setStatus("error");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setStatus("saved");
    router.push("/login?next=/account&passwordChanged=1");
    router.refresh();
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold">Change password</h3>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <Label htmlFor="current-password">Current password</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-muted">At least 8 characters.</p>
        </div>
        <div>
          <Label htmlFor="confirm-password">New password again</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {status === "error" && <FormError>{error}</FormError>}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={status === "saving"}>
            {status === "saving" ? "Saving..." : "Change password"}
          </Button>
          {status === "saved" && (
            <span className="text-sm font-medium text-success" role="status">
              Password changed. Please log in again.
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}
