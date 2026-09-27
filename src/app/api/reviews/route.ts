import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/auth";
import { createReview, updateReviewStatus } from "@/lib/reviews";
import { validateReviewInput } from "@/lib/validation";

// Public: submit a new review. Starts "pending" until an admin approves it.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const input = validateReviewInput(body);

  if (!input) {
    return NextResponse.json(
      { error: "Please fill in all fields (a name, a 1-5 star rating, and a comment)." },
      { status: 400 }
    );
  }

  const id = await createReview(input);
  return NextResponse.json({ id }, { status: 201 });
}

// Admin only: approve or reject a submitted review.
export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  if (!verifyAdminSessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : null;
  const status = body?.status;

  if (!id || (status !== "approved" && status !== "rejected")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const updated = await updateReviewStatus(id, status);
  if (!updated) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
