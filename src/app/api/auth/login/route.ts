import { validPublicForm, publicFormRejection } from "@/lib/publicFormProtection";
import { NextResponse } from "next/server";
import { USER_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/auth";
import { verifyUserCredentials } from "@/lib/users";
import { validateLoginInput } from "@/lib/validation";
import { rateLimitResponse } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const limited = await rateLimitResponse(request, "login");
  if (limited) return limited;
  const body = await request.json().catch(() => null);
  if (!validPublicForm(body, "login")) return publicFormRejection();
  const input = validateLoginInput(body);

  if (!input) {
    return NextResponse.json({ error: "Please enter your email and password." }, { status: 400 });
  }

  const authenticated = await verifyUserCredentials(input.email, input.password);
  if (!authenticated) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  const { user, token } = authenticated;
  const response = NextResponse.json({ user });
  response.cookies.set(USER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
