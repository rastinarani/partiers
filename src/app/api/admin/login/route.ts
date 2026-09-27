import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, createAdminSessionToken } from "@/lib/auth";
import { verifyAdminCredentials } from "@/lib/admins";
import { validateLoginInput } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const input = validateLoginInput(body);

  if (!input) {
    return NextResponse.json({ error: "Please enter your email and password." }, { status: 400 });
  }

  const admin = await verifyAdminCredentials(input.email, input.password);
  if (!admin) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  const response = NextResponse.json({ admin });
  response.cookies.set(ADMIN_COOKIE_NAME, createAdminSessionToken(admin.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return response;
}
