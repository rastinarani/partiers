"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, FormError } from "./ui";

interface LogoutButtonProps {
  endpoint?: string;
  redirectTo?: string;
  label?: string;
}

export default function LogoutButton({
  endpoint = "/api/admin/logout",
  redirectTo = "/admin/login",
  label = "Log out",
}: LogoutButtonProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleLogout() {
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch(endpoint, { method: "POST" });
      if (!response.ok) throw new Error("Logout failed");
    } catch {
      setError("We couldn’t log you out. Please try again.");
      setSubmitting(false);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div>
      <Button variant="secondary" size="sm" onClick={handleLogout} disabled={submitting}>
        {label}
      </Button>
      {error && <FormError>{error}</FormError>}
    </div>
  );
}
