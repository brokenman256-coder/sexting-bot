import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/admin/login",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // allow static & next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const isPublic =
    pathname === "/" ||
    PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"));

  const session = req.cookies.get("nightline_session")?.value;
  const admin = req.cookies.get("nightline_admin")?.value;

  if (pathname.startsWith("/admin")) {
    // admin page handles its own login UI; allow through
    return NextResponse.next();
  }

  if (pathname.startsWith("/chat") && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", "/chat");
    return NextResponse.redirect(url);
  }

  if ((pathname === "/login" || pathname === "/signup") && session) {
    const url = req.nextUrl.clone();
    url.pathname = "/chat";
    return NextResponse.redirect(url);
  }

  if (!isPublic && pathname.startsWith("/api/") && !session && !admin) {
    // let API routes return 401 themselves for finer control
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
