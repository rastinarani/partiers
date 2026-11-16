import { verifyAdminSessionToken } from "@/lib/sessions";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/auth";
import { getAdminById } from "@/lib/admins";
import { hideBooking } from "@/lib/bookings";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/admin/bookings/[id]">) {
  const cookieStore = await cookies();
  const adminId = await verifyAdminSessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
  if (!adminId || !(await getAdminById(adminId))) {
    return NextResponse.json({ error: "Please log in as an admin." }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!(await hideBooking(id))) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
