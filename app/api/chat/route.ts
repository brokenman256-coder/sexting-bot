import { buildSystemPrompt, getPersona } from "@/lib/personas";
import { DEFAULT_LEVELS, getLevel } from "@/lib/levels";
import { CHAT_MODEL, friendlyApiError, getXaiClient } from "@/lib/xai";

export const runtime = "nodejs";
export const maxDuration = 60;

type IncomingMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      messages = [],
      personaId = "nova",
      customDescription = "",
      levelId = "3",
      levelRules = "",
      scenario = "",
      userName = "",
    } = body as {
      messages: IncomingMessage[];
      personaId?: string;
      customDescription?: string;
      levelId?: string;
      levelRules?: string;
      scenario?: string;
      userName?: string;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "messages required" }, { status: 400 });
    }

    const blob = JSON.stringify(body).toLowerCase();
    if (
      /\b(underage|preteen|pre-teen|pedophil|child\s*porn|loli|shota)\b/.test(blob)
    ) {
      return Response.json(
        { error: "Underage content is not allowed. Adults 18+ only." },
        { status: 400 }
      );
    }

    const persona = getPersona(personaId);
    const level = getLevel(levelId, DEFAULT_LEVELS);
    const rules = (levelRules && String(levelRules).trim()) || level.rules;

    const system = buildSystemPrompt(persona, {
      customDescription,
      levelRules: rules,
      scenario,
      userName,
    });

    const history = messages
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
      .slice(-40)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: String(m.content).slice(0, 8000),
      }));

    const client = getXaiClient();
    const stream = await client.chat.completions.create({
      model: CHAT_MODEL,
      stream: true,
      temperature: 1.05,
      max_tokens: 900,
      messages: [{ role: "system", content: system }, ...history],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          }
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
      },
    });
  } catch (err) {
    return Response.json({ error: friendlyApiError(err) }, { status: 500 });
  }
}
