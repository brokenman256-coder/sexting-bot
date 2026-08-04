import { NextResponse } from "next/server";

/**
 * Validates admin password. Config itself is stored client-side (localStorage)
 * so it works on Vercel without a database. Password lives in ADMIN_PASSWORD env.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const password = String((body as { password?: string }).password || "");
  const expected = process.env.ADMIN_PASSWORD || "nightline-admin";

  if (!password || password !== expected) {
    return NextResponse.json({ ok: false, error: "Wrong password" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    message: "Admin unlocked. Edit levels & save in this browser.",
    hint:
      "Set ADMIN_PASSWORD in Vercel env to change the default password (nightline-admin).",
  });
}
