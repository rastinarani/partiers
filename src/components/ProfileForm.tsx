"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, FormError, Input, Label } from "./ui";

export default function ProfileForm({
  initialName,
  initialPhone,
}: {
  initialName: string;
  initialPhone: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError("");

    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong.");
      setStatus("error");
      return;
    }

    setStatus("saved");
    router.refresh();
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold">Your details</h3>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <Label htmlFor="profile-name">Name</Label>
          <Input
            id="profile-name"
            type="text"
            required
            maxLength={100}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setStatus("idle");
            }}
          />
        </div>
        <div>
          <Label htmlFor="profile-phone">
            Phone <span className="font-normal text-muted">(optional)</span>
          </Label>
          <Input
            id="profile-phone"
            type="tel"
            maxLength={30}
            placeholder="(555) 123-4567"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setStatus("idle");
            }}
          />
        </div>

        {status === "error" && <FormError>{error}</FormError>}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={status === "saving"}>
            {status === "saving" ? "Saving..." : "Save details"}
          </Button>
          {status === "saved" && (
            <span className="text-sm font-medium text-success" role="status">
              Saved!
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}
