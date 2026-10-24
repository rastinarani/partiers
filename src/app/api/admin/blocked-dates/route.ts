import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/auth";
import { blockDate, unblockDate } from "@/lib/blockedDates";
import { isDateString, validateBlockDateInput } from "@/lib/validation";

async function isAdmin() {
  const cookieStore = await cookies();
  return verifyAdminSessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value) !== null;
}

// Admin only: mark a date as unavailable.
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const input = validateBlockDateInput(await request.json().catch(() => null));
  if (!input) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  await blockDate(input.date, input.reason);
  return NextResponse.json({ success: true });
}

// Admin only: make a blocked date available again.
export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!isDateString(body?.date)) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  await unblockDate(body.date);
  return NextResponse.json({ success: true });
}
