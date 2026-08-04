import OpenAI from "openai";

export function getXaiClient() {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing XAI_API_KEY. Add it in Vercel → Settings → Environment Variables"
    );
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://api.x.ai/v1",
  });
}

export const CHAT_MODEL = process.env.XAI_CHAT_MODEL || "grok-4.5";

export function friendlyApiError(err: unknown): string {
  const e = err as { message?: string; status?: number; statusCode?: number };
  const msg = String(e?.message || err || "");
  const status = e?.status || e?.statusCode;
  if (
    status === 402 ||
    /credits|spending-limit|Payment Required|subscription/i.test(msg)
  ) {
    return "Out of xAI credits. Add credits at https://console.x.ai";
  }
  if (status === 401 || /Incorrect API key|Unauthorized|invalid.*key/i.test(msg)) {
    return "Invalid XAI_API_KEY. Create one at https://console.x.ai";
  }
  return msg || "AI request failed";
}
