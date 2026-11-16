import Link from "next/link";
import { cookies } from "next/headers";
import { USER_COOKIE_NAME, verifyUserSessionToken } from "@/lib/auth";
import { getUserById } from "@/lib/users";
import Navigation from "./Navigation";

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
        <Navigation userName={user?.name} />
      </div>
    </header>
  );
}
