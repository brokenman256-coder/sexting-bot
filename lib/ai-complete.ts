import { CHAT_MODEL, getXaiClient } from "./xai";

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

export async function aiChatComplete(opts: {
  messages: ChatMsg[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
}): Promise<string> {
  const client = getXaiClient();
  const res = await client.chat.completions.create({
    model: opts.model || CHAT_MODEL,
    messages: opts.messages,
    temperature: opts.temperature ?? 1.05,
    max_tokens: opts.max_tokens ?? 800,
  });
  return (res.choices?.[0]?.message?.content || "").trim();
}

export async function aiVisionComplete(opts: {
  prompt: string;
  imageDataUrl: string;
  max_tokens?: number;
}): Promise<string> {
  if (!opts.imageDataUrl.startsWith("data:image/")) {
    throw new Error("Need an image to humanize");
  }
  const client = getXaiClient();
  const models = [
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
    CHAT_MODEL,
  ];
  let lastErr: unknown;
  for (const model of models) {
    try {
      const res = await client.chat.completions.create({
        model,
        temperature: 0.7,
        max_tokens: opts.max_tokens ?? 700,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: opts.prompt },
              { type: "image_url", image_url: { url: opts.imageDataUrl } },
            ],
          },
        ],
      });
      const text = (res.choices?.[0]?.message?.content || "").trim();
      if (text) return text;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Vision model failed");
}

export { friendlyApiError } from "./xai";
