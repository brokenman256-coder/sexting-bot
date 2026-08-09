import {
  addMessage,
  getChat,
  getConfig,
  getMessages,
  spendCredits,
  touchLive,
  updateUser,
} from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { buildSystemPrompt, getPersona } from "@/lib/personas";
import { getRoleplay } from "@/lib/roleplays";
import { clampLevel, getLevel } from "@/lib/levels";
import { CHAT_MODEL, friendlyApiError, getXaiClient } from "@/lib/xai";
import type { UserLevel } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type IncomingMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!user) {
      return Response.json({ error: "Login required" }, { status: 401 });
    }
    if (user.banned) {
      return Response.json({ error: "Account banned" }, { status: 403 });
    }

    const body = await req.json();
    const {
      messages = [],
      personaId = "nova",
      customDescription = "",
      levelId = user.level,
      scenario = "",
      userName = "",
      chatId,
      roleplayId,
      callMode = false,
      mediaUrl,
      mediaType,
      isVoiceNote = false,
    } = body as {
      messages: IncomingMessage[];
      personaId?: string;
      customDescription?: string;
      levelId?: UserLevel;
      scenario?: string;
      userName?: string;
      chatId?: string;
      roleplayId?: string;
      callMode?: boolean;
      mediaUrl?: string;
      mediaType?: "image" | "audio" | "video" | "voice_note";
      isVoiceNote?: boolean;
    };

    if (!chatId) {
      return Response.json({ error: "chatId required" }, { status: 400 });
    }

    const chat = await getChat(chatId);
    if (!chat || chat.userId !== user.id) {
      return Response.json({ error: "Chat not found" }, { status: 404 });
    }

    const cfg = await getConfig();
    const effectiveLevel = clampLevel(Number(levelId) || 1, user.level);
    const level = getLevel(effectiveLevel, cfg.levels);

    const cost = isVoiceNote
      ? cfg.voiceCreditCost
      : mediaUrl
        ? cfg.mediaCreditCost
        : cfg.messageCreditCost;

    const spent = await spendCredits(user.id, cost);
    if (!spent.ok) {
      return Response.json({ error: spent.error, credits: spent.credits }, { status: 402 });
    }

    const lastUser =
      [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const blob = JSON.stringify(body).toLowerCase();
    if (
      /\b(underage|preteen|pre-teen|pedophil|child\s*porn|loli|shota)\b/.test(blob)
    ) {
      return Response.json(
        { error: "Underage content is not allowed. Adults 18+ only." },
        { status: 400 }
      );
    }

    let userContent = lastUser;
    if (mediaUrl && mediaType) {
      userContent = `${lastUser}\n\n[User shared ${mediaType}]`;
    }

    await addMessage({
      chatId,
      role: "user",
      content: userContent || lastUser || "(media)",
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || (isVoiceNote ? "voice_note" : null),
    });

    await touchLive({
      userId: user.id,
      chatId,
      personaId,
      displayName: user.displayName,
      email: user.email,
      lastMessage: (userContent || lastUser).slice(0, 200),
      updatedAt: new Date().toISOString(),
    });

    const persona = getPersona(personaId);
    const rp = getRoleplay(roleplayId || chat.roleplayId);
    const godMode = Boolean(user.godMode);
    // God Mode forces max intensity (level 3 rules) + worship/obedience layer
    const effectiveRules = godMode
      ? getLevel(3, cfg.levels).rules
      : level.rules;
    const system = buildSystemPrompt(persona, {
      customDescription,
      levelRules: effectiveRules,
      scenario: scenario || chat.scenario,
      roleplayPrompt: rp?.prompt,
      userName: userName || user.displayName,
      callMode: Boolean(callMode) && (level.allowCall || godMode),
      godMode,
    });

    // Prefer stored history for consistency
    const stored = await getMessages(chatId);
    const history = stored
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-40)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: String(m.content).slice(0, 8000),
      }));

    const client = getXaiClient();
    const stream = await client.chat.completions.create({
      model: CHAT_MODEL,
      stream: true,
      temperature: godMode || effectiveLevel >= 3 ? 1.15 : 1.0,
      max_tokens: 1000,
      messages: [{ role: "system", content: system }, ...history],
    });

    const encoder = new TextEncoder();
    let full = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              full += delta;
              controller.enqueue(encoder.encode(delta));
            }
          }
          // Parse optional AI media tags
          let content = full.trim() || "…";
          let outMediaUrl: string | null = null;
          let outMediaType: "image" | "voice_note" | null = null;
          const mediaMatch = content.match(
            /\[MEDIA:(image|voice):([^\]]+)\]/i
          );
          if (mediaMatch && level.allowMedia) {
            const kind = mediaMatch[1].toLowerCase();
            const desc = mediaMatch[2].trim();
            outMediaType = kind === "voice" ? "voice_note" : "image";
            // Visual card uses persona image + description (simulated send)
            outMediaUrl =
              kind === "image"
                ? persona.image
                : null;
            content = content.replace(mediaMatch[0], "").trim();
            if (kind === "image") {
              content = content
                ? `${content}\n\n📸 *sent a photo*\n_${desc}_`
                : `📸 *sent a photo*\n_${desc}_`;
            } else {
              content = content
                ? `${content}\n\n🎤 *voice note*\n_${desc}_`
                : `🎤 *voice note*\n_${desc}_`;
            }
          }

          await addMessage({
            chatId,
            role: "assistant",
            content,
            mediaUrl: outMediaUrl,
            mediaType: outMediaType,
          });

          await touchLive({
            userId: user.id,
            chatId,
            personaId,
            displayName: user.displayName,
            email: user.email,
            lastMessage: content.slice(0, 200),
            updatedAt: new Date().toISOString(),
          });

          await updateUser(user.id, { lastActiveAt: new Date().toISOString() });

          // trailer with credits for client
          controller.enqueue(
            encoder.encode(
              `\n\n[[META:${JSON.stringify({ credits: spent.credits, level: effectiveLevel })}]]`
            )
          );
          controller.close();
        } catch (err) {
          controller.enqueue(
            encoder.encode(`\n\n[error] ${friendlyApiError(err)}`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Credits-Remaining": String(spent.credits),
      },
    });
  } catch (err) {
    return Response.json({ error: friendlyApiError(err) }, { status: 500 });
  }
}
