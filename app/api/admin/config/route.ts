import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getConfig, listResets, saveConfig } from "@/lib/db";
import { ADMIN_COOKIE, requireUser } from "@/lib/auth";
import type { SiteConfig } from "@/lib/types";

export const runtime = "nodejs";

async function assertAdmin() {
  const jar = await cookies();
  if (jar.get(ADMIN_COOKIE)?.value === "1") return true;
  const user = await requireUser();
  return !!user && user.role === "admin";
}

export async function GET() {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const config = await getConfig();
  const resets = await listResets();
  return NextResponse.json({ config, resets: resets.slice(0, 50) });
}

export async function PUT(req: Request) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as SiteConfig;
  if (!body || !body.siteTitle || !Array.isArray(body.levels)) {
    return NextResponse.json({ error: "Invalid config" }, { status: 400 });
  }
  const config = await saveConfig(body);
  return NextResponse.json({ ok: true, config });
}
