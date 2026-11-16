"use client";

import PublicFormProtection, { usePublicFormProtection } from "@/components/PublicFormProtection";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, FormError, Input, Label } from "@/components/ui";

export default function LoginForm({ next, passwordChanged = false }: { next: string | null; passwordChanged?: boolean }) {
  const protection = usePublicFormProtection("login");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!protection.ready) return;
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, ...protection.payload(e.currentTarget) }),
    });

    if (!res.ok) {
      if (res.status === 400) protection.retry();
      setSubmitting(false);
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Incorrect email or password.");
      return;
    }

    router.push(next ?? "/account");
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center px-6 py-24">
      <div className="text-center">
        <span className="mb-3 inline-block text-3xl">&#128075;</span>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
      </div>

      {passwordChanged && <p role="status" className="mt-4 text-sm text-success">Password changed. Please log in again with your new password.</p>}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <PublicFormProtection protection={protection} />
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <FormError>{error}</FormError>}

        <Button type="submit" disabled={submitting || !protection.ready} className="w-full">
          {submitting ? "Logging in..." : "Log in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Don&rsquo;t have an account?{" "}
        <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"} className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
