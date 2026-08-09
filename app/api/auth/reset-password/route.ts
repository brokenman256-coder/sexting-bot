import { NextResponse } from "next/server";
import { consumeResetToken } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body.token || "").trim();
    const password = String(body.password || "");

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const ok = await consumeResetToken(token, password);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true, message: "Password updated. You can log in." });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
