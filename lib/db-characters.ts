import { getDb, persist } from "./db";
import type { CustomCharacter } from "./types";

type LooseDb = {
  customCharacters?: CustomCharacter[];
};

function uid(prefix = "") {
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function bag(): Promise<CustomCharacter[]> {
  const db = (await getDb()) as LooseDb;
  if (!Array.isArray(db.customCharacters)) db.customCharacters = [];
  return db.customCharacters;
}

export async function listCustomCharacters(
  userId: string
): Promise<CustomCharacter[]> {
  const all = await bag();
  return all
    .filter((c) => c.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listSystemProfiles(
  limit = 80
): Promise<CustomCharacter[]> {
  const all = await bag();
  return all
    .filter((c) => c.userId === "__bot__")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function listAllSystemProfiles(): Promise<CustomCharacter[]> {
  const all = await bag();
  return all
    .filter((c) => c.userId === "__bot__")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function countBotProfilesOnDay(dayUtc: string): Promise<number> {
  const all = await bag();
  return all.filter(
    (c) =>
      c.userId === "__bot__" &&
      !c.liveHuman &&
      (c.createdAt || "").slice(0, 10) === dayUtc
  ).length;
}

export async function pruneDuplicateBotImages(
  reservedKeys: Iterable<string> = []
): Promise<{ removed: number; kept: number }> {
  const { imageKey } = await import("./profile-bot");
  const db = (await getDb()) as LooseDb;
  if (!Array.isArray(db.customCharacters)) db.customCharacters = [];
  const reserved = new Set(Array.from(reservedKeys).map((k) => imageKey(k)));
  const bots = [...db.customCharacters]
    .filter((c) => c.userId === "__bot__")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const seen = new Set<string>(reserved);
  const drop = new Set<string>();
  for (const c of bots) {
    const key = imageKey(c.image || "");
    if (!key) {
      drop.add(c.id);
      continue;
    }
    if (c.liveHuman) {
      seen.add(key);
      continue;
    }
    if (seen.has(key)) drop.add(c.id);
    else seen.add(key);
  }
  if (drop.size === 0) return { removed: 0, kept: bots.length };
  db.customCharacters = db.customCharacters.filter((c) => !drop.has(c.id));
  await persist();
  return { removed: drop.size, kept: bots.length - drop.size };
}

export async function createCustomCharacter(input: {
  userId: string;
  name: string;
  age: number;
  gender: CustomCharacter["gender"];
  tagline: string;
  bio: string;
  description: string;
  image: string;
  greeting: string;
  liveHuman?: boolean;
  looks?: string;
  personality?: string;
}): Promise<CustomCharacter> {
  const db = (await getDb()) as LooseDb;
  if (!Array.isArray(db.customCharacters)) db.customCharacters = [];
  const c: CustomCharacter = {
    id: uid("cc-"),
    userId: input.userId,
    name: input.name.trim() || "Custom",
    age: Math.max(21, Math.min(99, input.age || 24)),
    gender: input.gender || "custom",
    tagline: input.tagline || "Your creation",
    bio: input.bio || "",
    description: input.description || "",
    image: input.image || "",
    greeting: input.greeting || "hey… I was made just for you 😈",
    createdAt: new Date().toISOString(),
    liveHuman: Boolean(input.liveHuman),
    looks: input.looks || "",
    personality: input.personality || "",
  };
  db.customCharacters.push(c);
  if (input.userId === "__bot__") {
    const bots = db.customCharacters
      .filter((x) => x.userId === "__bot__" && !x.liveHuman)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (bots.length > 210) {
      const drop = new Set(bots.slice(210).map((x) => x.id));
      db.customCharacters = db.customCharacters.filter((x) => !drop.has(x.id));
    }
  }
  await persist();
  return c;
}

export async function listLiveHumanBots(): Promise<CustomCharacter[]> {
  const all = await bag();
  return all
    .filter((c) => c.liveHuman && c.userId === "__bot__")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteCustomCharacter(id: string): Promise<boolean> {
  const db = (await getDb()) as LooseDb;
  if (!Array.isArray(db.customCharacters)) db.customCharacters = [];
  const before = db.customCharacters.length;
  db.customCharacters = db.customCharacters.filter((c) => c.id !== id);
  await persist();
  return db.customCharacters.length < before;
}

export async function getCustomCharacter(
  id: string
): Promise<CustomCharacter | undefined> {
  const all = await bag();
  return all.find((c) => c.id === id);
}

export async function resolveCompanion(
  personaId: string,
  userId: string
): Promise<CustomCharacter | null> {
  if (!personaId.startsWith("cc-")) return null;
  const cc = await getCustomCharacter(personaId);
  if (!cc) return null;
  if (cc.userId === userId || cc.userId === "__bot__") return cc;
  return null;
}
