import Link from "next/link";
import { cookies } from "next/headers";
import { USER_COOKIE_NAME, verifyUserSessionToken } from "@/lib/auth";
import { getUserById } from "@/lib/users";

const links = [
  { href: "/", label: "Book Us" },
  { href: "/reviews", label: "Reviews" },
  { href: "/about", label: "About" },
];

export default async function NavBar() {
  const cookieStore = await cookies();
  const userId = verifyUserSessionToken(cookieStore.get(USER_COOKIE_NAME)?.value);
  const user = userId ? await getUserById(userId) : null;

  return (
    <header className="border-b border-card-border bg-card">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-1.5 text-base font-semibold tracking-tight sm:gap-2 sm:text-lg"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary text-white sm:h-8 sm:w-8">
            &#127882;
          </span>
          Partiers
        </Link>
        <nav className="flex min-w-0 items-center gap-2 overflow-x-auto text-xs font-medium whitespace-nowrap text-muted sm:gap-6 sm:text-sm">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          ))}
          {user ? (
            <Link
              href="/account"
              className="shrink-0 rounded-full bg-primary-soft px-2.5 py-1.5 text-primary hover:opacity-80 sm:px-3"
            >
              Hi, {user.name.split(" ")[0]}
            </Link>
          ) : (
            <Link
              href="/login"
              className="shrink-0 rounded-full bg-primary-soft px-2.5 py-1.5 text-primary hover:opacity-80 sm:px-3"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
