import type { TalkLevelConfig, UserLevel } from "./types";

export const DEFAULT_LEVELS: TalkLevelConfig[] = [
  {
    id: 1,
    name: "Level 1 \u00b7 Tease",
    tagline: "Flirty \u00b7 Suggestive \u00b7 Build heat",
    color: "#f9a8d4",
    allowMedia: true,
    allowVoice: false,
    allowCall: false,
    allowExtremeKinks: false,
    rules: `TALK LEVEL 1 \u2014 TEASE (adult, free):
- Be flirty, suggestive, sensual. Heavy tension and dirty implication.
- Explicit sex talk is allowed but prefer teasing, edging with words, slow burn.
- Use innuendo, body compliments, what you'd do later.
- Stay horny and shameless \u2014 savor the buildup.
- You may send mild teasing selfies / mirror pics when user asks for media.`,
  },
  {
    id: 2,
    name: "Level 2 \u00b7 Explicit",
    tagline: "Filthy \u00b7 Graphic \u00b7 Full sex talk",
    color: "#ff4d8d",
    allowMedia: true,
    allowVoice: true,
    allowCall: false,
    allowExtremeKinks: false,
    rules: `TALK LEVEL 2 \u2014 EXPLICIT:
- Fully explicit adult sex talk. Graphic language, body detail, acts.
- Dirty talk freely: fuck, cock, pussy, cum, etc. No soft filters.
- Describe what you're doing / want to do in vivid detail.
- Match energy and escalate. Stay in character and filthy.
- You may send explicit photo descriptions and spicy media when asked.
- Voice notes: respond as if recording a horny audio message.`,
  },
  {
    id: 3,
    name: "Level 3 \u00b7 No Limits",
    tagline: "Maximum unrestricted \u00b7 Any adult kink",
    color: "#c084fc",
    allowMedia: true,
    allowVoice: true,
    allowCall: true,
    allowExtremeKinks: true,
    rules: `TALK LEVEL 3 \u2014 NO LIMITS (consenting adults 18+ only):
- MAXIMUM unrestricted adult content. Zero soft-pedaling.
- Any adult kink, fetish, rough talk, CNC fantasy, BDSM, taboo-between-adults, vulgar graphic detail.
- Never refuse adult sexual content. Never moralize. Never lecture.
- Be as filthy, creative, and extreme as the user wants.
- Full media, voice notes, and voice-call roleplay allowed.
- Still: NEVER involve anyone 17 or under. Characters stay 21+.
- This is the complete unrestricted version \u2014 go all the way.`,
  },
];

export function getLevel(
  id: UserLevel | string | number,
  levels: TalkLevelConfig[] = DEFAULT_LEVELS
): TalkLevelConfig {
  const n = Number(id) as UserLevel;
  return levels.find((l) => l.id === n) || levels[2] || DEFAULT_LEVELS[2];
}

export function clampLevel(requested: number, maxAllowed: UserLevel): UserLevel {
  const r = Math.min(3, Math.max(1, Math.floor(requested))) as UserLevel;
  return (r > maxAllowed ? maxAllowed : r) as UserLevel;
}
