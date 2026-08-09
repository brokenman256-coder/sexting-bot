import { NextResponse } from "next/server";
import {
  findUserByEmail,
  toPublicUser,
  updateUser,
  verifyPassword,
} from "@/lib/db";
import { createSessionToken, sessionCookieOptions, COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    if (user.banned) {
      return NextResponse.json({ error: "Account banned" }, { status: 403 });
    }
    const ok = await verifyPassword(user, password);
    if (!ok) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    await updateUser(user.id, { lastActiveAt: new Date().toISOString() });
    const token = await createSessionToken(user);
    const res = NextResponse.json({ ok: true, user: toPublicUser(user) });
    res.cookies.set(COOKIE_NAME, token, sessionCookieOptions());
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Login failed" },
      { status: 500 }
    );
  }
}
