import OpenAI from "openai";

type Provider = "groq" | "xai";

function resolveProvider(): { provider: Provider; apiKey: string } {
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const xaiKey = process.env.XAI_API_KEY?.trim();

  // Explicit Groq key
  if (groqKey) {
    return { provider: "groq", apiKey: groqKey };
  }

  // Key pasted into XAI_API_KEY but is actually a Groq key (gsk_...)
  if (xaiKey?.startsWith("gsk_")) {
    return { provider: "groq", apiKey: xaiKey };
  }

  if (xaiKey) {
    return { provider: "xai", apiKey: xaiKey };
  }

  throw new Error(
    "Missing GROQ_API_KEY (free) or XAI_API_KEY. Add one in Netlify → Environment variables"
  );
}

/**
 * Chat client: free Groq preferred, paid xAI optional.
 * OpenAI-compatible for both.
 */
export function getXaiClient() {
  const { provider, apiKey } = resolveProvider();
  return new OpenAI({
    apiKey,
    baseURL:
      provider === "groq"
        ? "https://api.groq.com/openai/v1"
        : "https://api.x.ai/v1",
  });
}

function defaultModel() {
  if (process.env.CHAT_MODEL) return process.env.CHAT_MODEL;
  if (process.env.XAI_CHAT_MODEL) return process.env.XAI_CHAT_MODEL;
  try {
    const { provider } = resolveProvider();
    if (provider === "groq") return "llama-3.3-70b-versatile";
  } catch {
    /* ignore at module load if no key yet */
  }
  return "grok-4.5";
}

export const CHAT_MODEL = defaultModel();

export function friendlyApiError(err: unknown): string {
  const e = err as {
    message?: string;
    status?: number;
    statusCode?: number;
    error?: { message?: string };
  };
  const msg = String(e?.error?.message || e?.message || err || "");
  const status = e?.status || e?.statusCode;
  let provider: Provider = "xai";
  try {
    provider = resolveProvider().provider;
  } catch {
    /* ignore */
  }

  if (
    status === 402 ||
    /credits|spending-limit|Payment Required|subscription|insufficient/i.test(
      msg
    )
  ) {
    if (provider === "groq") {
      return "Groq quota/limit hit. Check https://console.groq.com";
    }
    return "Out of xAI credits. Add credits at https://console.x.ai or use free GROQ_API_KEY";
  }
  if (
    status === 401 ||
    /Incorrect API key|Unauthorized|invalid.*key|Invalid API Key/i.test(msg)
  ) {
    return provider === "groq"
      ? "Invalid Groq API key. Create one at https://console.groq.com/keys"
      : "Invalid XAI_API_KEY. Create one at https://console.x.ai";
  }
  if (status === 429 || /rate.?limit|too many requests/i.test(msg)) {
    return "Rate limited — wait a few seconds and try again";
  }
  return msg || "AI request failed";
}
