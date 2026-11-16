import { cookies } from "next/headers";
import { invalidateSession } from "@/lib/sessions";
import { NextResponse } from "next/server";
import { USER_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  try {
    await invalidateSession("user", cookieStore.get(USER_COOKIE_NAME)?.value);
  } catch {
    return NextResponse.json({ error: "We couldn’t log you out. Please try again." }, { status: 503 });
  }
  const response = NextResponse.json({ success: true });
  response.cookies.delete(USER_COOKIE_NAME);
  return response;
}
