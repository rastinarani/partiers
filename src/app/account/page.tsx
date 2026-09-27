import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { USER_COOKIE_NAME, verifyUserSessionToken } from "@/lib/auth";
import { getUserById } from "@/lib/users";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const cookieStore = await cookies();
  const userId = verifyUserSessionToken(cookieStore.get(USER_COOKIE_NAME)?.value);
  const user = userId ? await getUserById(userId) : null;

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center px-6 py-24">
      <div className="rounded-2xl border border-card-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-xl font-semibold text-primary">
          {user.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <h1 className="text-xl font-semibold">Hi, {user.name}! &#127881;</h1>
        <p className="mt-1 text-sm text-muted">{user.email}</p>

        <div className="mt-6">
          <LogoutButton endpoint="/api/auth/logout" redirectTo="/login" />
        </div>
      </div>
    </div>
  );
}
