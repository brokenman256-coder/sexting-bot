import { NextResponse } from "next/server";
import { listSystemProfiles, pruneDuplicateBotImages } from "@/lib/db-characters";
import { PERSONAS } from "@/lib/personas";
import { imageKey } from "@/lib/profile-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Card = {
  id: string;
  name: string;
  age: number;
  gender: string;
  tags: string[];
  tagline: string;
  bio: string;
  image: string;
  minLevel: 1 | 2 | 3;
  online: boolean;
  liveHuman?: boolean;
  source: "static" | "bot" | "live";
};

function uniqueFaces(list: Card[]): Card[] {
  const seen = new Set<string>();
  const out: Card[] = [];
  for (const p of list) {
    const key = imageKey(p.image);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

export async function GET() {
  await pruneDuplicateBotImages(PERSONAS.map((p) => p.image)).catch(() => null);
  const system = await listSystemProfiles(120);
  const staticOnes: Card[] = PERSONAS.filter((p) => p.id !== "custom").map(
    (p) => ({
      id: p.id,
      name: p.name,
      age: p.age,
      gender: p.gender,
      tags: p.tags,
      tagline: p.tagline,
      bio: p.bio,
      image: p.image,
      minLevel: p.minLevel,
      online: p.online,
      source: "static" as const,
    })
  );

  const botOnes: Card[] = system.map((c) => ({
    id: c.id,
    name: c.name,
    age: c.age,
    gender: c.gender,
    tags: c.tagline.split("·").map((t) => t.trim()).filter(Boolean),
    tagline: c.tagline,
    bio: c.bio,
    image: c.image,
    minLevel: 1 as const,
    online: true,
    liveHuman: Boolean(c.liveHuman),
    source: c.liveHuman ? ("live" as const) : ("bot" as const),
  }));

  const live = botOnes.filter((p) => p.liveHuman);
  const rest = botOnes.filter((p) => !p.liveHuman);
  const personas = uniqueFaces([...live, ...rest, ...staticOnes]);
  return NextResponse.json({
    personas,
    botCount: rest.length,
    liveCount: live.length,
  });
}
