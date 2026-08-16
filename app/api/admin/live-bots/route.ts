import { NextResponse } from "next/server";
import { assertAdminAccess } from "@/lib/admin-guard";
import {
  createCustomCharacter,
  deleteCustomCharacter,
  listLiveHumanBots,
} from "@/lib/db-characters";
import { SYSTEM_BOT_ID } from "@/lib/profile-bot";
import { parseVisionPersona } from "@/lib/humanize";
import { aiVisionComplete, friendlyApiError } from "@/lib/ai-complete";
import type { GenderCategory } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VISION_PROMPT = `Look at this photo. Create a 21+ adult live-chat companion that LOOKS like the person.\nIf under 18 return ONLY: {\"error\":\"not_adult\"}\nOtherwise JSON: name, age (21-35), gender, tagline, bio, looks, personality, greeting, description.`;

function asGender(v: string): GenderCategory {
  const ok: GenderCategory[] = ["women","men","gay","lesbian","bi","trans","custom"];
  return ok.includes(v as GenderCategory) ? (v as GenderCategory) : "women";
}

export async function GET() {
  const admin = await assertAdminAccess();
  if (!admin.ok) return NextResponse.json({ error: "Admin only" }, { status: 401 });
  const bots = await listLiveHumanBots();
  return NextResponse.json({ bots });
}

export async function POST(req: Request) {
  const admin = await assertAdminAccess();
  if (!admin.ok) return NextResponse.json({ error: "Admin only" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const image = String(body.image || "");
  if (!image.startsWith("data:image/")) {
    return NextResponse.json({ error: "Post a picture (image required)" }, { status: 400 });
  }
  if (image.length > 6_500_000) {
    return NextResponse.json({ error: "Photo too large" }, { status: 400 });
  }
  let name = String(body.name || "").trim();
  let age = Number(body.age) || 0;
  let gender = asGender(String(body.gender || "women"));
  let tagline = String(body.tagline || "").trim();
  let bio = String(body.bio || "").trim();
  let greeting = String(body.greeting || "").trim();
  let looks = String(body.looks || "").trim();
  let personality = String(body.personality || "").trim();
  let description = String(body.description || "").trim();
  let visionUsed = false;
  if (Boolean(body.autoHumanize !== false) && (!name || !looks)) {
    try {
      const raw = await aiVisionComplete({ prompt: VISION_PROMPT, imageDataUrl: image });
      const parsed = parseVisionPersona(raw);
      if ("error" in parsed) {
        if (parsed.error.includes("under 21") || parsed.error.includes("not_adult")) {
          return NextResponse.json({ error: parsed.error }, { status: 400 });
        }
      } else {
        visionUsed = true;
        name = name || parsed.name;
        age = age || parsed.age;
        if (!body.gender) gender = asGender(parsed.gender);
        tagline = tagline || parsed.tagline;
        bio = bio || parsed.bio;
        greeting = greeting || parsed.greeting;
        looks = looks || parsed.looks;
        personality = personality || parsed.personality;
        description = description || parsed.description;
      }
    } catch (e) {
      if (!name) {
        return NextResponse.json({ error: "Could not read the photo. Add a name (21+). " + friendlyApiError(e) }, { status: 400 });
      }
    }
  }
  if (!name) return NextResponse.json({ error: "Name required (21+)" }, { status: 400 });
  if (age && age < 21) return NextResponse.json({ error: "Characters must be 21+" }, { status: 400 });
  age = age || 24;
  const character = await createCustomCharacter({
    userId: SYSTEM_BOT_ID,
    name, age, gender,
    tagline: tagline || "Live · Human · Online",
    bio: bio || "Just posted. Come talk.",
    description: description || `${name}, ${age}. Live person from the posted photo. ${looks} ${personality}`.trim(),
    image,
    greeting: greeting || `hey it's ${name}… just dropped that pic. you gonna say something or just stare?`,
    liveHuman: true, looks, personality,
  });
  return NextResponse.json({ character, visionUsed });
}

export async function DELETE(req: Request) {
  const admin = await assertAdminAccess();
  if (!admin.ok) return NextResponse.json({ error: "Admin only" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const ok = await deleteCustomCharacter(id);
  return NextResponse.json({ ok });
}
