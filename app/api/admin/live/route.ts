import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getMessages, listLive } from "@/lib/db";
import { ADMIN_COOKIE, requireUser } from "@/lib/auth";
import { getPersona } from "@/lib/personas";

export const runtime = "nodejs";

async function assertAdmin() {
  const jar = await cookies();
  if (jar.get(ADMIN_COOKIE)?.value === "1") return true;
  const user = await requireUser();
  return !!user && user.role === "admin";
}

export async function GET(req: Request) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const chatId = url.searchParams.get("chatId");

  if (chatId) {
    const messages = await getMessages(chatId);
    return NextResponse.json({ messages });
  }

  const live = await listLive();
  const sessions = live.map((s) => ({
    ...s,
    personaName: getPersona(s.personaId).name,
    personaImage: getPersona(s.personaId).image,
  }));

  return NextResponse.json({ sessions, serverTime: new Date().toISOString() });
}
