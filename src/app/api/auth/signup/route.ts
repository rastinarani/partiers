import { NextResponse } from "next/server";
import { USER_COOKIE_NAME, createUserSessionToken } from "@/lib/auth";
import { createUser } from "@/lib/users";
import { validateSignupInput } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const input = validateSignupInput(body);

  if (!input) {
    return NextResponse.json(
      { error: "Please enter a name, a valid email, and a password (8+ characters)." },
      { status: 400 }
    );
  }

  const user = await createUser(input.name, input.email, input.password);
  if (!user) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 }
    );
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
