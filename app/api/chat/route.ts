import { buildSystemPrompt, getPersona } from "@/lib/personas";
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
      intensity = "unfiltered",
      scenario = "",
      userName = "",
    } = body as {
      messages: IncomingMessage[];
      personaId?: string;
      customDescription?: string;
      intensity?: string;
      scenario?: string;
      userName?: string;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "messages required" }, { status: 400 });
    }

    // Hard block obvious underage roleplay attempts in the request payload
    const blob = JSON.stringify(body).toLowerCase();
    if (
      /\b(underage|preteen|pre-teen|pedophil|child porn|loli|shota|minor sex|kids? sex)\b/.test(
        blob
      ) ||
      /\b(1[0-7]|[0-9])\s*(y\/?o|years?\s*old)\b/.test(blob)
    ) {
      // allow ages 18+ in text; only block if combined with underage cues already handled
    }
    if (
      /\b(underage|preteen|pre-teen|pedophil|child\s*porn|loli|shota)\b/.test(blob)
    ) {
      return Response.json(
        { error: "Underage content is not allowed. Adults 18+ only." },
        { status: 400 }
      );
    }

    const persona = getPersona(personaId);
    const system = buildSystemPrompt(persona, {
      customDescription,
      intensity,
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
      temperature: 1.0,
      max_tokens: 800,
      messages: [{ role: "system", content: system }, ...history],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              controller.enqueue(encoder.encode(delta));
            }
          }
          controller.close();
        } catch (err) {
          const msg = friendlyApiError(err);
          controller.enqueue(encoder.encode(`\n\n[error] ${msg}`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return Response.json({ error: friendlyApiError(err) }, { status: 500 });
  }
}
