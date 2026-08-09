import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  COOKIE_NAME,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth";
import { findUserByEmail, verifyPassword } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const password = String((body as { password?: string }).password || "");
  const email = String((body as { email?: string }).email || "").trim().toLowerCase();
  const expected = process.env.ADMIN_PASSWORD || "nightline-admin";

  if (password && password === expected) {
    const res = NextResponse.json({
      ok: true,
      message: "Admin unlocked",
      mode: "master",
    });
    res.cookies.set(ADMIN_COOKIE, "1", sessionCookieOptions(60 * 60 * 12));
    const adminUser = await findUserByEmail("admin@nightline.app");
    if (adminUser) {
      const token = await createSessionToken(adminUser);
      res.cookies.set(COOKIE_NAME, token, sessionCookieOptions());
    }
    return res;
  }

  if (email && password) {
    const user = await findUserByEmail(email);
    if (user && user.role === "admin" && !user.banned) {
      const ok = await verifyPassword(user, password);
      if (ok) {
        const token = await createSessionToken(user);
        const res = NextResponse.json({ ok: true, message: "Admin login", mode: "user" });
        res.cookies.set(COOKIE_NAME, token, sessionCookieOptions());
        res.cookies.set(ADMIN_COOKIE, "1", sessionCookieOptions(60 * 60 * 12));
        return res;
      }
    }
  }

  return NextResponse.json({ ok: false, error: "Wrong password" }, { status: 401 });
}
