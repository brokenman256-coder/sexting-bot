import { NextResponse } from "next/server";
import {
  addMessage,
  createChat,
  getMessages,
  listChatsByUser,
} from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getPersona } from "@/lib/personas";
import { getRoleplay } from "@/lib/roleplays";
import { clampLevel } from "@/lib/levels";
import type { UserLevel } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const chats = await listChatsByUser(user.id);
  return NextResponse.json({ chats });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const body = await req.json();
  const personaId = String(body.personaId || "nova");
  const roleplayId = body.roleplayId ? String(body.roleplayId) : null;
  const scenario = String(body.scenario || "");
  const levelId = clampLevel(Number(body.levelId) || user.level, user.level);
  const persona = getPersona(personaId);
  const rp = getRoleplay(roleplayId);

  if (persona.minLevel > user.level) {
    return NextResponse.json(
      { error: `This character requires level ${persona.minLevel}` },
      { status: 403 }
    );
  }
  if (rp && rp.minLevel > user.level) {
    return NextResponse.json(
      { error: `This roleplay requires level ${rp.minLevel}` },
      { status: 403 }
    );
  }

  const title = rp
    ? `${persona.name} · ${rp.title}`
    : `${persona.name}`;

  const chat = await createChat({
    userId: user.id,
    personaId,
    roleplayId,
    scenario,
    title,
    levelId: levelId as UserLevel,
  });

  await addMessage({
    chatId: chat.id,
    role: "system",
    content: `Connected with ${persona.name}${rp ? ` · ${rp.title}` : ""} · Level ${levelId} · adults only`,
  });
  await addMessage({
    chatId: chat.id,
    role: "assistant",
    content: persona.greeting,
  });

  const messages = await getMessages(chat.id);
  return NextResponse.json({ chat, messages });
}
