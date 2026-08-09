import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  findUserById,
  getMessages,
  listAllChats,
  listChatsByUser,
} from "@/lib/db";
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
  const userId = url.searchParams.get("userId");
  const chatId = url.searchParams.get("chatId");

  if (chatId) {
    const messages = await getMessages(chatId);
    return NextResponse.json({ messages });
  }

  const chats = userId ? await listChatsByUser(userId) : await listAllChats();
  const enriched = await Promise.all(
    chats.slice(0, 100).map(async (c) => {
      const u = await findUserById(c.userId);
      const msgs = await getMessages(c.id);
      const persona = getPersona(c.personaId);
      return {
        ...c,
        userEmail: u?.email,
        userName: u?.displayName,
        personaName: persona.name,
        messageCount: msgs.length,
        preview: msgs.filter((m) => m.role !== "system").slice(-1)[0]?.content || "",
      };
    })
  );

  return NextResponse.json({ chats: enriched });
}
