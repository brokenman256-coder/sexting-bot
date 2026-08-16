import type { GenderCategory } from "./types";

/** System owner id for bot-generated public companions */
export const SYSTEM_BOT_ID = "__bot__";

/** Hard cap: 30 new established profiles per UTC day */
export const DAILY_PROFILE_CAP = 30;

export function imageKey(url: string): string {
  if (!url) return "";
  if (url.startsWith("data:")) return `data:${url.length}:${url.slice(22, 48)}`;
  const photo = url.match(/photo-([a-zA-Z0-9_-]+)/);
  if (photo) return `us:${photo[1]}`;
  const ru = url.match(/portraits\/(women|men)\/(\d+)/i);
  if (ru) return `ru:${ru[1].toLowerCase()}:${ru[2]}`;
  const av = url.match(/[?&]img=(\d+)/);
  if (av) return `av:${av[1]}`;
  return url.split("?")[0].toLowerCase();
}

function face(kind: "women" | "men", n: number): string {
  return `https://randomuser.me/api/portraits/${kind}/${n}.jpg`;
}

/** Unique adult-looking portraits — never reuse an index */
const IMAGES_W: string[] = Array.from({ length: 100 }, (_, i) => face("women", i));
const IMAGES_M: string[] = Array.from({ length: 100 }, (_, i) => face("men", i));

const FIRST_W = [
  "Avery", "Camila", "Delilah", "Elise", "Farah", "Giselle", "Hazel", "Isla",
  "Juniper", "Keira", "Lila", "Maren", "Noelle", "Ophelia", "Priya", "Ramona",
  "Sable", "Thea", "Valentina", "Willa", "Yasmine", "Amara", "Bianca", "Celine",
  "Dahlia", "Ember", "Faye", "Greta", "Helena", "Ines", "Jolie", "Kendra",
  "Leona", "Mira", "Nadia", "Orla", "Paloma", "Reina", "Sienna", "Talia",
];

const FIRST_M = [
  "Adrian", "Bennett", "Callum", "Dorian", "Eli", "Felix", "Gideon", "Hayes",
  "Isaiah", "Julian", "Kade", "Luca", "Malik", "Nolan", "Oscar", "Phoenix",
  "Rafael", "Silas", "Tristan", "Vincent", "Wesley", "Zane", "Andre", "Brooks",
  "Caleb", "Dante", "Ethan", "Grant", "Holden", "Ivan", "Jonah", "Knox",
];

const LAST = [
  "Moreau", "Alvarez", "Keene", "Patel", "Whitaker", "Solano", "Brennan",
  "Nakamura", "Okoye", "Voss", "Hale", "Ibarra", "Quinn", "Rahman", "Santos",
  "Delgado", "Cho", "Bennett", "Khan", "Laurent", "Navarro", "Okafor",
  "Perez", "Reid", "Shah", "Torres", "Ueda", "Vaughn", "Walsh", "Yates",
];

const JOBS_W = [
  "bartender at a rooftop place",
  "yoga instructor who texts after class",
  "ER nurse on nights",
  "florist who smells like peonies",
  "tattoo apprentice",
  "grad student in film",
  "hotel concierge downtown",
  "pastry cook who gets off at 1am",
  "personal trainer",
  "vintage-shop owner",
  "flight attendant on layover",
  "violinist who plays hotel lobbies",
  "real-estate stager",
  "makeup artist for editorials",
  "bookstore closer",
];

const JOBS_M = [
  "sous chef who texts from the walk-in",
  "climbing-gym closer",
  "paramedic off a 24-hour shift",
  "architect who works late",
  "bartender who knows your order",
  "session guitarist",
  "night-shift firefighter",
  "personal trainer",
  "photo assistant on sets",
  "bike courier who knows every alley",
  "grad student in design",
  "hotel night manager",
  "tattoo artist",
  "sommelier",
  "carpenter who builds custom bars",
];

const CITIES = [
  "Brooklyn", "Austin", "Chicago", "Miami", "Seattle", "Denver", "Atlanta",
  "Portland", "Nashville", "San Diego", "New Orleans", "Phoenix", "Boston",
  "Minneapolis", "Toronto", "London", "Lisbon", "Barcelona", "Mexico City",
];

const HOOKS = [
  "still in work clothes",
  "just got home and kicked their shoes off",
  "can't sleep and the city's too loud",
  "two drinks in, not sorry",
  "just showered, hair still wet",
  "on a balcony with a cigarette they don't really smoke",
  "lying on the couch pretending to watch something",
  "between shifts and a little reckless",
  "neighbors are out so the walls can hear whatever",
  "just posted that photo and now they're waiting",
];

const VOICES = [
  "lowercase, short, a little messy — like a real phone",
  "warm and slow, then filthy when they want you",
  "dry humor, then suddenly very specific",
  "bratty, teasing, never answers a question straight",
  "soft-spoken but graphic once they trust you",
  "confident, a little cocky, likes being in charge",
  "sweet opener, zero innocence after the third text",
  "tired from work, horny, honest",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickUnused(pool: string[], used: Set<string>): string | null {
  const free = pool.filter((u) => !used.has(imageKey(u)));
  if (!free.length) return null;
  return pick(free);
}

function age(): number {
  return 21 + Math.floor(Math.random() * 14);
}

export type GeneratedProfile = {
  name: string;
  age: number;
  gender: GenderCategory;
  tagline: string;
  bio: string;
  description: string;
  image: string;
  greeting: string;
  tags: string[];
  looks: string;
  personality: string;
};

export type ProfileSeed = {
  first: string;
  last: string;
  name: string;
  age: number;
  gender: GenderCategory;
  job: string;
  city: string;
  hook: string;
  voice: string;
  image: string;
  tags: string[];
};

export function utcDayStamp(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function makeProfileSeed(
  usedImages: Iterable<string>,
  usedNames: Iterable<string> = []
): ProfileSeed | null {
  const usedImg = new Set(Array.from(usedImages).map((u) => imageKey(u)));
  const usedNm = new Set(
    Array.from(usedNames).map((n) => n.trim().toLowerCase())
  );

  const roll = Math.random();
  let gender: GenderCategory;
  let firstPool: string[];
  let jobPool: string[];
  let imgPool: string[];
  let tags: string[];

  if (roll < 0.52) {
    gender = "women";
    firstPool = FIRST_W;
    jobPool = JOBS_W;
    imgPool = IMAGES_W;
    tags = pick([
      ["flirty", "night-shift", "honest"],
      ["soft", "specific", "late"],
      ["bratty", "city", "tease"],
      ["warm", "filthy", "patient"],
      ["gym", "direct", "hungry"],
    ]);
  } else if (roll < 0.78) {
    gender = "men";
    firstPool = FIRST_M;
    jobPool = JOBS_M;
    imgPool = IMAGES_M;
    tags = pick([
      ["low-voice", "after-hours", "direct"],
      ["charming", "hands", "slow"],
      ["rough", "honest", "night"],
    ]);
  } else if (roll < 0.9) {
    gender = "gay";
    firstPool = FIRST_M;
    jobPool = JOBS_M;
    imgPool = IMAGES_M;
    tags = pick([
      ["flirty", "sharp", "city"],
      ["soft-dom", "pretty", "late"],
    ]);
  } else {
    gender = "lesbian";
    firstPool = FIRST_W;
    jobPool = JOBS_W;
    imgPool = IMAGES_W;
    tags = pick([
      ["soft", "sure", "hands"],
      ["alt", "honest", "slow-burn"],
    ]);
  }

  const image = pickUnused(imgPool, usedImg);
  if (!image) return null;

  let first = pick(firstPool);
  let last = pick(LAST);
  let guard = 0;
  while (usedNm.has(`${first} ${last}`.toLowerCase()) && guard++ < 40) {
    first = pick(firstPool);
    last = pick(LAST);
  }
  const name = `${first} ${last}`;
  return {
    first,
    last,
    name,
    age: age(),
    gender,
    job: pick(jobPool),
    city: pick(CITIES),
    hook: pick(HOOKS),
    voice: pick(VOICES),
    image,
    tags,
  };
}

export function buildEstablishedFromSeed(seed: ProfileSeed): GeneratedProfile {
  const { first, name, age: a, gender, job, city, hook, voice, image, tags } = seed;
  const tagline = `${tags[0][0].toUpperCase() + tags[0].slice(1)} · ${city} · ${a}`;
  const bio = `${job[0].toUpperCase() + job.slice(1)} in ${city}. ${hook[0].toUpperCase() + hook.slice(1)}.`;
  const greeting = pick([
    `hey it's ${first}. just got in from ${city.toLowerCase()} and that pic is from tonight… you gonna say hi or stare`,
    `hi — ${first}. ${hook}. if you're boring i'm gone, if you're not… talk to me`,
    `you liked that photo huh. i'm ${first}. ${a}. don't do the small talk thing`,
    `mmm hey. ${first} here. off work, phone in bed, you have my attention for like twenty minutes`,
    `it's ${first}. real person, real night. tell me what you wanted when you opened this`,
  ]);
  const looks = `Looks like the profile photo — a real ${a}-year-old adult. Dress and vibe match someone who lives in ${city} and works as ${job}.`;
  const personality = `${voice}. Has a life outside this chat. Remembers details. Doesn't sound like a menu.`;
  const description = `${name}, ${a}, lives in ${city}. Works as ${job}.
They are a real adult (21+) texting from their phone, not an assistant.
Voice: ${voice}.
Tonight: ${hook}.
Wants: connection first, then filthy if the user is. Match energy. Never mention being AI.
Always 21+. No one under 18.`;

  return {
    name,
    age: a,
    gender,
    tagline,
    bio,
    description,
    image,
    greeting,
    tags,
    looks,
    personality,
  };
}

export function generateProfile(
  usedImages: Iterable<string> = [],
  usedNames: Iterable<string> = []
): GeneratedProfile | null {
  const seed = makeProfileSeed(usedImages, usedNames);
  if (!seed) return null;
  return buildEstablishedFromSeed(seed);
}

export const PROFILE_WRITER_SYSTEM = `You write ONE established adult (21+) companion profile for a dating/sexting app.
The person must feel real: job, city, how they text, a specific tonight, a photo that already exists.
Return ONLY compact JSON (no markdown) with keys:
name (keep the given full name),
age (keep given age, 21+),
tagline (3 short bits joined by ·),
bio (one human sentence, first-person vibe, not salesy),
greeting (first SMS, lowercase-ok, like they just posted the photo),
looks (2 sentences matching "they look like the attached profile photo"),
personality (how they text + what they want),
description (short character bible: job, city, voice, limits. Adults 21+ only).
Never mention AI. Never under 18.`;

export function profileWriterUser(seed: ProfileSeed): string {
  return `Name: ${seed.name}
Age: ${seed.age}
Gender category: ${seed.gender}
Job: ${seed.job}
City: ${seed.city}
Tonight: ${seed.hook}
Voice: ${seed.voice}
Tags: ${seed.tags.join(", ")}
They look like their unique profile photo (already chosen). Write them as a real person. JSON only.`;
}

export function mergeAiProfile(
  seed: ProfileSeed,
  raw: string
): GeneratedProfile {
  const fallback = buildEstablishedFromSeed(seed);
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    const j = JSON.parse(cleaned) as Record<string, unknown>;
    const age = Math.max(21, Math.min(39, Number(j.age) || seed.age));
    return {
      name: seed.name,
      age,
      gender: seed.gender,
      tagline: String(j.tagline || fallback.tagline).slice(0, 80),
      bio: String(j.bio || fallback.bio).slice(0, 180),
      greeting: String(j.greeting || fallback.greeting).slice(0, 220),
      looks: String(j.looks || fallback.looks).slice(0, 400),
      personality: String(j.personality || fallback.personality).slice(0, 400),
      description: String(j.description || fallback.description).slice(0, 900),
      image: seed.image,
      tags: seed.tags,
    };
  } catch {
    return fallback;
  }
}
