import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/auth";
import { createBooking, updateBookingStatus } from "@/lib/bookings";
import { validateBookingInput } from "@/lib/validation";

// Public: submit a new booking request. Always starts out "pending" —
// nothing is auto-confirmed.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const input = validateBookingInput(body);

  if (!input) {
    return NextResponse.json(
      { error: "Please fill in all required fields correctly." },
      { status: 400 }
    );
  }

  const id = await createBooking(input);
  return NextResponse.json({ id }, { status: 201 });
}

// Admin only: confirm or decline a booking request.
export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  if (!verifyAdminSessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : null;
  const status = body?.status;

  if (!id || (status !== "confirmed" && status !== "declined")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const updated = await updateBookingStatus(id, status);
  if (!updated) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
