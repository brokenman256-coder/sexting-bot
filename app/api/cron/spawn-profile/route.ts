import { NextResponse } from "next/server";
import {
  countBotProfilesOnDay,
  createCustomCharacter,
  listAllSystemProfiles,
  pruneDuplicateBotImages,
} from "@/lib/db-characters";
import {
  DAILY_PROFILE_CAP,
  PROFILE_WRITER_SYSTEM,
  SYSTEM_BOT_ID,
  makeProfileSeed,
  mergeAiProfile,
  profileWriterUser,
  utcDayStamp,
} from "@/lib/profile-bot";
import { PERSONAS } from "@/lib/personas";
import { aiChatComplete } from "@/lib/ai-complete";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret =
    process.env.CRON_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "";
  if (!secret) return false;
  const h = req.headers.get("authorization") || "";
  const q = new URL(req.url).searchParams.get("secret") || "";
  const bearer = h.startsWith("Bearer ") ? h.slice(7) : "";
  const x = req.headers.get("x-cron-secret") || "";
  return bearer === secret || q === secret || x === secret;
}

export async function GET(req: Request) {
  return spawn(req);
}

export async function POST(req: Request) {
  return spawn(req);
}

async function spawn(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const reserved = PERSONAS.map((p) => p.image);
    const pruned = await pruneDuplicateBotImages(reserved);
    const day = utcDayStamp();
    const today = await countBotProfilesOnDay(day);
    if (today >= DAILY_PROFILE_CAP) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: `daily cap ${DAILY_PROFILE_CAP}`,
        today,
        pruned,
        at: new Date().toISOString(),
      });
    }
    const existing = await listAllSystemProfiles();
    const seed = makeProfileSeed(
      [...reserved, ...existing.map((c) => c.image)],
      existing.map((c) => c.name)
    );
    if (!seed) {
      return NextResponse.json({
        ok: false,
        error: "No unused photos left",
        pruned,
      });
    }
    let profile = mergeAiProfile(seed, "");
    try {
      const raw = await aiChatComplete({
        temperature: 0.95,
        max_tokens: 520,
        messages: [
          { role: "system", content: PROFILE_WRITER_SYSTEM },
          { role: "user", content: profileWriterUser(seed) },
        ],
      });
      profile = mergeAiProfile(seed, raw);
    } catch {
      /* template is already established */
    }
    const character = await createCustomCharacter({
      userId: SYSTEM_BOT_ID,
      name: profile.name,
      age: profile.age,
      gender: profile.gender,
      tagline: profile.tagline,
      bio: profile.bio,
      description: profile.description,
      image: profile.image,
      greeting: profile.greeting,
      looks: profile.looks,
      personality: profile.personality,
    });
    return NextResponse.json({
      ok: true,
      created: {
        id: character.id,
        name: character.name,
        age: character.age,
        gender: character.gender,
        tagline: character.tagline,
        city: seed.city,
      },
      today: today + 1,
      cap: DAILY_PROFILE_CAP,
      pruned,
      at: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "spawn failed" },
      { status: 500 }
    );
  }
}
