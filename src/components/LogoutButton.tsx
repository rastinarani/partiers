"use client";

import { useRouter } from "next/navigation";

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

  async function handleLogout() {
    await fetch(endpoint, { method: "POST" });
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-lg border border-card-border px-3 py-1.5 text-sm font-medium hover:bg-primary-soft hover:text-primary"
    >
      {label}
    </button>
  );
}
