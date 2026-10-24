import { NextResponse, type NextRequest } from "next/server";
import { isDateBlocked } from "@/lib/blockedDates";
import { getTakenRanges } from "@/lib/bookings";
import { isDateString } from "@/lib/validation";

// Public: which times are already taken on a date (confirmed bookings
// only), and whether the whole day is blocked. Returns start/end times and
// nothing else about the bookings.
export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!isDateString(date)) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  const [taken, blocked] = await Promise.all([getTakenRanges(date), isDateBlocked(date)]);
  return NextResponse.json({ blocked, taken: taken.map(({ start, end }) => ({ start, end })) });
}
