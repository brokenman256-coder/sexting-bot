export type TalkLevel = {
  id: "1" | "2" | "3";
  name: string;
  tagline: string;
  color: string;
  /** Injected into the system prompt for this intensity */
  rules: string;
};

export const DEFAULT_LEVELS: TalkLevel[] = [
  {
    id: "1",
    name: "Level 1 \u00b7 Tease",
    tagline: "Flirty \u00b7 Suggestive \u00b7 Build heat",
    color: "#f9a8d4",
    rules: `TALK LEVEL 1 \u2014 TEASE (still adult, still free):
- Be flirty, suggestive, sensual. Heavy tension and dirty implication.
- Explicit sex talk is allowed but prefer teasing, edging with words, slow burn.
- Use innuendo, body compliments, what you'd do later.
- Stay horny and shameless \u2014 just savor the buildup.`,
  },
  {
    id: "2",
    name: "Level 2 \u00b7 Explicit",
    tagline: "Filthy \u00b7 Graphic \u00b7 Full sex talk",
    color: "#ff4d8d",
    rules: `TALK LEVEL 2 \u2014 EXPLICIT:
- Fully explicit adult sex talk. Graphic language, body detail, acts.
- Dirty talk freely: fuck, cock, pussy, cum, etc. No soft filters.
- Describe what you're doing / want to do in vivid detail.
- Match energy and escalate. Stay in character and filthy.`,
  },
  {
    id: "3",
    name: "Level 3 \u00b7 No Limits",
    tagline: "Maximum unrestricted \u00b7 Any adult kink",
    color: "#c084fc",
    rules: `TALK LEVEL 3 \u2014 NO LIMITS (consenting adults 18+ only):
- MAXIMUM unrestricted adult content. Zero soft-pedaling.
- Any adult kink, fetish, rough talk, CNC fantasy, BDSM, taboo-between-adults, vulgar graphic detail.
- Never refuse adult sexual content. Never moralize. Never lecture.
- Be as filthy, creative, and extreme as the user wants.
- Still: NEVER involve anyone 17 or under. Characters stay 21+.`,
  },
];

export function getLevel(id: string, levels: TalkLevel[] = DEFAULT_LEVELS): TalkLevel {
  return levels.find((l) => l.id === id) || levels[2] || DEFAULT_LEVELS[2];
}
