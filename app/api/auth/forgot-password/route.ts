import { NextResponse } from "next/server";
import { createResetRequest, findUserByEmail } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Creates a reset token. In production you'd email it.
 * Here the token is shown once in the response (dev-friendly)
 * and always visible to admin under Password resets.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const user = await findUserByEmail(email);
    // Always return ok to avoid email enumeration, but include token if found (for this private app)
    if (!user) {
      return NextResponse.json({
        ok: true,
        message:
          "If that email exists, a reset link was created. Ask admin or check the token below.",
      });
    }

    const reset = await createResetRequest(user);
    return NextResponse.json({
      ok: true,
      message: "Reset token created. Use it on the reset password page (or ask admin).",
      token: reset.token,
      expiresAt: reset.expiresAt,
      resetPath: `/reset-password?token=${encodeURIComponent(reset.token)}`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
