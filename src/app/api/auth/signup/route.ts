import { validPublicForm, publicFormRejection } from "@/lib/publicFormProtection";
import { NextResponse } from "next/server";
import { USER_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/auth";
import { createUser } from "@/lib/users";
import { validateSignupInput } from "@/lib/validation";
import { rateLimitResponse } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const limited = await rateLimitResponse(request, "signup");
  if (limited) return limited;
  const body = await request.json().catch(() => null);
  if (!validPublicForm(body, "signup")) return publicFormRejection();
  const input = validateSignupInput(body);

  if (!input) {
    return NextResponse.json(
      { error: "Please enter a name, a valid email, and a password (8+ characters)." },
      { status: 400 }
    );
  }

  const authenticated = await createUser(input.name, input.email, input.password);
  if (!authenticated) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 }
    );
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
