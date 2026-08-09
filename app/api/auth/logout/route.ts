import { NextResponse } from "next/server";
import { COOKIE_NAME, ADMIN_COOKIE, sessionCookieOptions } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { ...sessionCookieOptions(0), maxAge: 0 });
  res.cookies.set(ADMIN_COOKIE, "", { ...sessionCookieOptions(0), maxAge: 0 });
  return res;
}
