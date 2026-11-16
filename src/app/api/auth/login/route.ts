import { validPublicForm, publicFormRejection } from "@/lib/publicFormProtection";
import { NextResponse } from "next/server";
import { USER_COOKIE_NAME, createUserSessionToken } from "@/lib/auth";
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

  const user = await verifyUserCredentials(input.email, input.password);
  if (!user) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  const response = NextResponse.json({ user });
  response.cookies.set(USER_COOKIE_NAME, createUserSessionToken(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return response;
}
