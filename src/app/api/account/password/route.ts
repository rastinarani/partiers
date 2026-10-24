import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { USER_COOKIE_NAME, verifyUserSessionToken } from "@/lib/auth";
import { changeUserPassword } from "@/lib/users";
import { validateChangePasswordInput } from "@/lib/validation";

// Customer only: change their password. Requires the current one.
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const userId = verifyUserSessionToken(cookieStore.get(USER_COOKIE_NAME)?.value);
  if (!userId) {
    return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const input = validateChangePasswordInput(body);
  if (!input) {
    return NextResponse.json(
      { error: "Please enter your current password and a new one (8+ characters)." },
      { status: 400 }
    );
  }

  const result = await changeUserPassword(userId, input.currentPassword, input.newPassword);
  if (result === "not_found") {
    return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  }
  if (result === "wrong_password") {
    return NextResponse.json({ error: "Your current password isn't right." }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
