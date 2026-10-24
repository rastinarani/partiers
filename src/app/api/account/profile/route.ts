import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { USER_COOKIE_NAME, verifyUserSessionToken } from "@/lib/auth";
import { updateUserProfile } from "@/lib/users";
import { validateProfileInput } from "@/lib/validation";

// Customer only: update their own name and phone number.
export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const userId = verifyUserSessionToken(cookieStore.get(USER_COOKIE_NAME)?.value);
  if (!userId) {
    return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const input = validateProfileInput(body);
  if (!input) {
    return NextResponse.json(
      { error: "Please enter your name, and a valid phone number or leave it blank." },
      { status: 400 }
    );
  }

  const updated = await updateUserProfile(userId, input.name, input.phone);
  if (!updated) {
    return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  }
  return NextResponse.json({ success: true });
}
