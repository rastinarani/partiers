import { NextResponse, type NextRequest } from "next/server";
import { getTakenRanges } from "@/lib/bookings";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Public: which times are already taken on a date (confirmed bookings
// only). Returns start/end times and nothing else about the bookings.
export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  const taken = await getTakenRanges(date);
  return NextResponse.json({ taken: taken.map(({ start, end }) => ({ start, end })) });
}
