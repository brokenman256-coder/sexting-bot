import { NextResponse } from "next/server";
import { getChat, getMessages } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const chat = await getChat(id);
  if (!chat || chat.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const messages = await getMessages(id);
  return NextResponse.json({ chat, messages });
}
