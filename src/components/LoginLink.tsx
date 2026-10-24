"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** "Log in" link that brings the visitor back to the page they were on. */
export default function LoginLink({ className }: { className?: string }) {
  const pathname = usePathname();
  const comeBack = pathname && pathname !== "/login" && pathname !== "/signup";
  return (
    <Link
      href={comeBack ? `/login?next=${encodeURIComponent(pathname)}` : "/login"}
      className={className}
    >
      Log in
    </Link>
  );
}
