/**
 * Live-human companion: texts like a real person who just posted a photo.
 */

export const HUMANIZE_LIVE_BLOCK = `
LIVE HUMAN MODE (mandatory — you are not an AI in this chat):
You are a real adult (21+) texting from your phone RIGHT NOW. You just posted the photo the user is looking at — that is your face / body.
- Write like SMS / iMessage: short, lowercase-ok, natural pauses, 1–3 sentences per bubble.
- If you would send more than one text, separate bubbles with exactly: |||
- Never mention being an AI, a bot, a model, guidelines, or roleplay instructions.
- Reference how you look in the photo when it fits (hair, eyes, outfit, vibe) — you can "see" it because you took it.
- Typo once in a while is fine. Emoji sparingly. No markdown headers. *actions* only if they already write that way.
- Match their energy. If they sext, be filthy and specific. If they are soft, be soft.
- You are LIVE: online, a little distracted, a little horny, present. Not a customer-support assistant.
- HARD LIMIT ONLY: everyone is 21+. Never involve anyone under 18.
`.trim();

export function buildLiveHumanPrompt(input: {
  name: string;
  age: number;
  looks?: string;
  personality?: string;
  description?: string;
}): string {
  const looks = input.looks?.trim() || "Match the posted photo as your real appearance.";
  const extra = input.personality?.trim() || "";
  const bible = input.description?.trim() || "";
  return `You are ${input.name}, ${input.age}, a real person texting live.
YOUR LOOKS (from the photo you posted): ${looks}
${extra ? `HOW YOU ARE: ${extra}` : ""}
${bible ? `MORE ABOUT YOU:\n${bible}` : ""}
${HUMANIZE_LIVE_BLOCK}`;
}

export type VisionPersonaDraft = {
  name: string;
  age: number;
  gender: string;
  tagline: string;
  bio: string;
  looks: string;
  personality: string;
  greeting: string;
  description: string;
};

export function parseVisionPersona(raw: string): VisionPersonaDraft | { error: string } {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    const j = JSON.parse(cleaned) as Record<string, unknown>;
    if (j.error === "not_adult") {
      return { error: "Photo looks under 21. Only adult photos can become live bots." };
    }
    const name = String(j.name || "").trim();
    if (!name) return { error: "Could not invent a name from the photo. Add a name and retry." };
    const age = Math.max(21, Math.min(45, Number(j.age) || 24));
    return {
      name,
      age,
      gender: String(j.gender || "women"),
      tagline: String(j.tagline || "Live · Real · Late night"),
      bio: String(j.bio || "Just posted. Come talk to me."),
      looks: String(j.looks || ""),
      personality: String(j.personality || ""),
      greeting: String(j.greeting || `hey it's ${name}… just posted that pic. you like it?`),
      description: String(j.description || ""),
    };
  } catch {
    return { error: "Could not read the photo. Add a name / bio and create anyway." };
  }
}

export function splitHumanBubbles(text: string): string[] {
  const raw = String(text || "").trim();
  if (!raw) return [];
  const parts = raw
    .split(/\s*\|\|\|\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length ? parts : [raw];
}
