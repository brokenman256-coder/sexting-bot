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

/**
 * Optional explicit-content provider slot (levels 2+).
 * Works with any OpenAI-compatible host that permits legal adult content:
 *   Novita  -> NSFW_BASE_URL=https://api.novita.ai/v3/openai
 *   DeepInfra -> NSFW_BASE_URL=https://api.deepinfra.com/v1
 *   Local Ollama -> NSFW_BASE_URL=http://localhost:11434/v1
 * Level 1 (tease) keeps using the default Groq/xAI provider (fast, free).
 */
function defaultNsfwModel(baseURL: string): string {
  if (/novita/i.test(baseURL)) return "sao10k/l3-euryale-70b";
  if (/deepinfra/i.test(baseURL)) return "cognitivecomputations/dolphin-mixtral-8x22b";
  if (/localhost|127\.0\.0\.1/.test(baseURL)) return "local-model";
  return "meta-llama/llama-3.1-8b-instruct";
}

export type ResolvedClient = { client: OpenAI; model: string; label: string };

export function getNsfwClient(): ResolvedClient | null {
  const apiKey = process.env.NSFW_API_KEY?.trim();
  const baseURL = process.env.NSFW_BASE_URL?.trim();
  if (!apiKey || !baseURL) return null;
  return {
    client: new OpenAI({ apiKey, baseURL }),
    model:
      process.env.NSFW_CHAT_MODEL?.trim() || defaultNsfwModel(baseURL),
    label: "NSFW provider",
  };
}

/** Route by talk level: explicit levels (2+) prefer the NSFW provider. */
export function getClientForLevel(level: number): ResolvedClient {
  if (level >= 2) {
    const nsfw = getNsfwClient();
    if (nsfw) return nsfw;
  }
  return { client: getXaiClient(), model: CHAT_MODEL, label: "default" };
}

export function friendlyApiError(
  err: unknown,
  providerLabel?: string
): string {
  const e = err as {
    message?: string;
    status?: number;
    statusCode?: number;
    error?: { message?: string };
  };
  const msg = String(e?.error?.message || e?.message || err || "");
  const status = e?.status || e?.statusCode;
  let provider: Provider | "nsfw" = "xai";
  if (providerLabel === "NSFW provider") provider = "nsfw";
  else {
    try {
      provider = resolveProvider().provider;
    } catch {
      /* ignore */
    }
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
    if (provider === "nsfw") {
      return "NSFW provider balance/limit hit. Check your provider dashboard";
    }
    return "Out of xAI credits. Add credits at https://console.x.ai or use free GROQ_API_KEY";
  }
  if (
    status === 401 ||
    /Incorrect API key|Unauthorized|invalid.*key|Invalid API Key/i.test(msg)
  ) {
    if (provider === "nsfw") {
      return "Invalid NSFW_API_KEY. Check the key and NSFW_BASE_URL in environment variables";
    }
    return provider === "groq"
      ? "Invalid Groq API key. Create one at https://console.groq.com/keys"
      : "Invalid XAI_API_KEY. Create one at https://console.x.ai";
  }
  if (status === 429 || /rate.?limit|too many requests/i.test(msg)) {
    return "Rate limited — wait a few seconds and try again";
  }
  return msg || "AI request failed";
}
