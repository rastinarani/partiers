"use client";

import PublicFormProtection, { usePublicFormProtection } from "@/components/PublicFormProtection";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, FormError, Input, Label } from "@/components/ui";

export default function SignupForm({ next }: { next: string | null }) {
  const protection = usePublicFormProtection("signup");
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!protection.ready) return;
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, ...protection.payload(e.currentTarget) }),
    });

    if (!res.ok) {
      if (res.status === 400) protection.retry();
      setSubmitting(false);
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong.");
      return;
    }

    router.push(next ?? "/account");
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center px-6 py-24">
      <div className="text-center">
        <span className="mb-3 inline-block text-3xl">&#127882;</span>
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-muted">Save your details for faster booking next time.</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <PublicFormProtection protection={protection} />
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-muted">At least 8 characters.</p>
        </div>

        {error && <FormError>{error}</FormError>}

        <Button type="submit" disabled={submitting || !protection.ready} className="w-full">
          {submitting ? "Creating account..." : "Sign up"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
