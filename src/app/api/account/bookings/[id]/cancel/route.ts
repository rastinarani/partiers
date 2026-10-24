import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { USER_COOKIE_NAME, verifyUserSessionToken } from "@/lib/auth";
import { todayString } from "@/lib/bookingDates";
import { cancelBookingForUser } from "@/lib/bookings";

// Customer only: cancel one of their own upcoming bookings.
export async function POST(
  _request: NextRequest,
  ctx: RouteContext<"/api/account/bookings/[id]/cancel">
) {
  const cookieStore = await cookies();
  const userId = verifyUserSessionToken(cookieStore.get(USER_COOKIE_NAME)?.value);
  if (!userId) {
    return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const result = await cancelBookingForUser(id, userId, todayString());

  if (result === "not_found") {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  if (result === "not_cancellable") {
    return NextResponse.json(
      { error: "This booking can no longer be cancelled." },
      { status: 409 }
    );
  }
  return NextResponse.json({ success: true });
}
