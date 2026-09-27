import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  USER_COOKIE_NAME,
  verifyAdminSessionToken,
  verifyUserSessionToken,
} from "@/lib/auth";

// Gate every /admin page behind admin login (except the login page
// itself), and every /account page behind a customer login. API routes
// verify their own session cookie too (see app/api/*/route.ts) rather
// than relying on this alone.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      return NextResponse.next();
    }
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!verifyAdminSessionToken(token)) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/account")) {
    const token = request.cookies.get(USER_COOKIE_NAME)?.value;
    if (!verifyUserSessionToken(token)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
