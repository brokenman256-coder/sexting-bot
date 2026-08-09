import { NextResponse } from "next/server";
import { createUser, getConfig, toPublicUser } from "@/lib/db";
import { createSessionToken, sessionCookieOptions, COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const displayName = String(body.displayName || "").trim();
    const ageOk = Boolean(body.ageOk);

    if (!ageOk) {
      return NextResponse.json(
        { error: "You must confirm you are 18+" },
        { status: 400 }
      );
    }
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const cfg = await getConfig();
    if (!cfg.allowSignup) {
      return NextResponse.json(
        { error: "Signups are closed. Contact admin." },
        { status: 403 }
      );
    }

    const user = await createUser({ email, password, displayName });
    const token = await createSessionToken(user);
    const res = NextResponse.json({ ok: true, user: toPublicUser(user) });
    res.cookies.set(COOKIE_NAME, token, sessionCookieOptions());
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Signup failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
