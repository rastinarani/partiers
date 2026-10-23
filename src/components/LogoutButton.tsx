"use client";

import { useRouter } from "next/navigation";
import { Button } from "./ui";

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
    <Button variant="secondary" size="sm" onClick={handleLogout}>
      {label}
    </Button>
  );
}
