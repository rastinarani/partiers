import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  USER_COOKIE_NAME,
  verifyAdminSessionToken,
  verifyUserSessionToken,
} from "@/lib/auth";
import {
  createBooking,
  getBookingById,
  getTakenRanges,
  updateBookingStatus,
} from "@/lib/bookings";
import { todayString } from "@/lib/bookingDates";
import { isDateBlocked } from "@/lib/blockedDates";
import { findOverlap, formatTimeRange, toRange } from "@/lib/schedule";
import { getUserById } from "@/lib/users";
import { getAdminById } from "@/lib/admins";
import { validateAdminBookingStatusInput, validateBookingInput } from "@/lib/validation";
import { rateLimitResponse } from "@/lib/rateLimit";

// Public: submit a new booking request. Always starts out "pending" —
// nothing is auto-confirmed. Guests can book; if a customer is logged in,
// the booking is linked to their account via the session cookie (never via
// the request body).
export async function POST(request: Request) {
  const limited = await rateLimitResponse(request, "booking");
  if (limited) return limited;
  const body = await request.json().catch(() => null);
  const input = validateBookingInput(body);

  if (!input) {
    return NextResponse.json(
      { error: "Please fill in all required fields correctly." },
      { status: 400 }
    );
  }

  if (input.date < todayString()) {
    return NextResponse.json({ error: "Please pick a date in the future." }, { status: 400 });
  }
  if (await isDateBlocked(input.date)) {
    return NextResponse.json(
      { error: "Sorry, we're not available that day. Please pick another date." },
      { status: 409 }
    );
  }

  // Only confirmed bookings block a slot; two pending requests for the same
  // time are fine, and the admin gets a warning when confirming the second.
  const taken = await getTakenRanges(input.date);
  if (findOverlap(toRange(input.time, input.durationMinutes), taken)) {
    return NextResponse.json(
      { error: "Sorry, that time overlaps another booking. Please pick a different time." },
      { status: 409 }
    );
  }

  const cookieStore = await cookies();
  const sessionUserId = verifyUserSessionToken(cookieStore.get(USER_COOKIE_NAME)?.value);
  // Look the user up so a validly signed id that isn't a customer (e.g. a
  // deleted account) is treated as a guest.
  const user = sessionUserId ? await getUserById(sessionUserId) : null;

  const { id, referenceCode } = await createBooking(input, user?.id);
  return NextResponse.json({ id, referenceCode }, { status: 201 });
}

// Admin only: confirm, decline or cancel a booking request.
export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const adminId = verifyAdminSessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
  if (!adminId || !(await getAdminById(adminId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const input = validateAdminBookingStatusInput(await request.json().catch(() => null));
  if (!input) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { id, status, force } = input;

  // Warn (don't block) when confirming would clash with another confirmed
  // booking; the admin can resend with force: true to confirm anyway.
  if (status === "confirmed" && !force) {
    const booking = await getBookingById(id);
    if (booking) {
      const taken = await getTakenRanges(booking.date, booking._id);
      const clash = findOverlap(toRange(booking.time, booking.durationMinutes), taken);
      if (clash) {
        const other = await getBookingById(clash.id);
        return NextResponse.json(
          {
            error: "overlap",
            overlap: {
              parentName: other?.parentName ?? "another booking",
              time: other ? formatTimeRange(other.time, other.durationMinutes) : "",
            },
          },
          { status: 409 }
        );
      }
    }
  }

  const result = await updateBookingStatus(id, status, adminId);
  if (result === "conflict") {
    return NextResponse.json(
      { error: "This booking changed while you were updating it. Refresh and try again." },
      { status: 409 }
    );
  }
  if (result === "not_found") {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  if (result === "cancelled") {
    return NextResponse.json(
      { error: "This booking has already been cancelled." },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true });
}
