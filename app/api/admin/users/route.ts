import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  findUserById,
  listUsers,
  toPublicUser,
  updateUser,
} from "@/lib/db";
import { ADMIN_COOKIE, requireUser } from "@/lib/auth";
import type { UserLevel } from "@/lib/types";
import bcrypt from "bcryptjs";

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
  const users = await listUsers();
  return NextResponse.json({ users });
}

export async function PATCH(req: Request) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const userId = String(body.userId || "");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.credits === "number") {
    patch.credits = Math.max(0, Math.floor(body.credits));
  }
  if (body.addCredits != null) {
    const u = await findUserById(userId);
    if (u) patch.credits = Math.max(0, u.credits + Number(body.addCredits));
  }
  if (body.level != null) {
    const lv = Math.min(3, Math.max(1, Number(body.level))) as UserLevel;
    patch.level = lv;
  }
  if (typeof body.banned === "boolean") patch.banned = body.banned;
  if (typeof body.godMode === "boolean") patch.godMode = body.godMode;
  if (typeof body.displayName === "string") patch.displayName = body.displayName;
  if (typeof body.password === "string" && body.password.length >= 6) {
    patch.passwordHash = await bcrypt.hash(body.password, 10);
  }
  if (body.role === "user" || body.role === "admin") patch.role = body.role;

  const updated = await updateUser(userId, patch as never);
  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, user: toPublicUser(updated) });
}
