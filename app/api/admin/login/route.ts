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
  const adminEmail = (
    process.env.ADMIN_EMAIL || "brokenman256@gmail.com"
  ).toLowerCase();
  const expected = process.env.ADMIN_PASSWORD || "changeme123";

  // Preferred: email + password for admin account
  if (email && password) {
    const user = await findUserByEmail(email);
    if (user && user.role === "admin" && !user.banned) {
      const ok = await verifyPassword(user, password);
      if (ok) {
        const token = await createSessionToken(user);
        const res = NextResponse.json({
          ok: true,
          message: "Admin login",
          mode: "user",
        });
        res.cookies.set(COOKIE_NAME, token, sessionCookieOptions());
        res.cookies.set(ADMIN_COOKIE, "1", sessionCookieOptions(60 * 60 * 12));
        return res;
      }
    }
  }

  // Master password unlock (must match env) — also signs in configured admin email
  if (password && password === expected) {
    const adminUser =
      (await findUserByEmail(email || adminEmail)) ||
      (await findUserByEmail(adminEmail));
    const res = NextResponse.json({
      ok: true,
      message: "Admin unlocked",
      mode: "master",
    });
    res.cookies.set(ADMIN_COOKIE, "1", sessionCookieOptions(60 * 60 * 12));
    if (adminUser && adminUser.role === "admin") {
      const token = await createSessionToken(adminUser);
      res.cookies.set(COOKIE_NAME, token, sessionCookieOptions());
    }
    return res;
  }

  return NextResponse.json(
    { ok: false, error: "Wrong email or password" },
    { status: 401 }
  );
}
