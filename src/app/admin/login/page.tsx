"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      setSubmitting(false);
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Incorrect email or password.");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center px-6 py-24">
      <h1 className="text-center text-2xl font-bold tracking-tight">Admin Login</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-card-border bg-card px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-card-border bg-card px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        {error && (
          <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-gradient-to-r from-primary to-secondary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </form>
    </div>
  );
}
