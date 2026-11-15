import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/auth";
import { getAdminById } from "@/lib/admins";
import { updateAdminNotes } from "@/lib/bookings";
import { validateAdminNotesInput } from "@/lib/validation";

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/bookings/[id]/notes">) {
  const cookieStore = await cookies();
  const adminId = verifyAdminSessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
  if (!adminId || !(await getAdminById(adminId))) {
    return NextResponse.json({ error: "Please log in as an admin." }, { status: 401 });
  }
  const input = validateAdminNotesInput(await request.json().catch(() => null));
  if (!input) {
    return NextResponse.json({ error: "Notes must be text, up to 5,000 characters." }, { status: 400 });
  }
  const { id } = await ctx.params;
  if (!(await updateAdminNotes(id, input.adminNotes))) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
