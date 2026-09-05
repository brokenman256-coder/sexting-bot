import crypto from "node:crypto";
import type { GenderCategory } from "./types";

/** System owner id for bot-generated public companions */
export const SYSTEM_BOT_ID = "__bot__";

/** Hard cap: new established profiles per UTC day (cron ticks every 30 min = 48/day) */
export const DAILY_PROFILE_CAP = 48;

/** SHA-1 hex for a buffer — used to content-address generated faces */
function sha1(buf: Buffer): string {
  return crypto.createHash("sha1").update(buf).digest("hex");
}

export function imageKey(url: string): string {
  if (!url) return "";
  if (url.startsWith("data:")) return `h:${sha1(Buffer.from(url))}`;
  const fa = url.match(/\/api\/face\/([a-f0-9]{8,64})\.jpe?g/i);
  if (fa) return `fa:${fa[1].toLowerCase()}`;
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

/** Legacy fallback pool — only used if synthetic face generation fails */
const IMAGES_W: string[] = Array.from({ length: 100 }, (_, i) => face("women", i));
const IMAGES_M: string[] = Array.from({ length: 100 }, (_, i) => face("men", i));

/**
 * Fetch a unique AI-generated synthetic face (no real person exists behind it).
 * Free, keyless. Each download is a fresh GAN sample; combined with the
 * content-addressed sha1 key, repeats are practically impossible.
 */
export async function fetchUniqueFace(): Promise<{
  bytes: Buffer;
  dataUrl: string;
  hash: string;
} | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch("https://thispersondoesnotexist.com/random-person.jpeg", {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; NightlineBot/2; profile-photos)",
        },
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      });
      if (!res.ok) continue;
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.length < 20000) continue; // too small — likely an error page
      const hash = sha1(bytes);
      return {
        bytes,
        dataUrl: `data:image/jpeg;base64,${bytes.toString("base64")}`,
        hash,
      };
    } catch {
      /* retry once, then give up */
    }
  }
  return null;
}

const FIRST_W = [
  "Avery", "Camila", "Delilah", "Elise", "Farah", "Giselle", "Hazel", "Isla",
  "Juniper", "Keira", "Lila", "Maren", "Noelle", "Ophelia", "Priya", "Ramona",
  "Sable", "Thea", "Valentina", "Willa", "Yasmine", "Amara", "Bianca", "Celine",
  "Dahlia", "Ember", "Faye", "Greta", "Helena", "Ines", "Jolie", "Kendra",
  "Leona", "Mira", "Nadia", "Orla", "Paloma", "Reina", "Sienna", "Talia",
  "Adriana", "Bella", "Cora", "Daniela", "Elena", "Freya", "Gianna", "Harlow",
  "Indira", "Jasmine", "Katya", "Lorena", "Marisol", "Nina", "Pamela", "Renata",
  "Selene", "Tessa", "Uma", "Vera", "Wanda", "Ximena", "Yara", "Zaria",
  "Aisha", "Brielle", "Catalina", "Demi", "Esther", "Flora", "Gemma", "Hana",
  "Ivana", "Jade", "Kira", "Lena", "Maya", "Nadia", "Petra", "Quinn",
  "Rosalind", "Sofia", "Talia", "Ursa", "Vicky", "Wren", "Xenia", "Yvette",
  "Zoe", "Alba", "Bree", "Cleo", "Daphne", "Eve", "Fern", "Gilda",
];

const FIRST_M = [
  "Adrian", "Bennett", "Callum", "Dorian", "Eli", "Felix", "Gideon", "Hayes",
  "Isaiah", "Julian", "Kade", "Luca", "Malik", "Nolan", "Oscar", "Phoenix",
  "Rafael", "Silas", "Tristan", "Vincent", "Wesley", "Zane", "Andre", "Brooks",
  "Caleb", "Dante", "Ethan", "Grant", "Holden", "Ivan", "Jonah", "Knox",
  "Marcus", "Nico", "Owen", "Pablo", "Rex", "Simon", "Theo", "Victor",
  "Amir", "Bruno", "Colt", "Diego", "Emil", "Franco", "Gus", "Hugo",
  "Igor", "Jonas", "Karl", "Leo", "Milo", "Nikolai", "Omar", "Pierce",
];

const LAST = [
  "Moreau", "Alvarez", "Keene", "Patel", "Whitaker", "Solano", "Brennan",
  "Nakamura", "Okoye", "Voss", "Hale", "Ibarra", "Quinn", "Rahman", "Santos",
  "Delgado", "Cho", "Bennett", "Khan", "Laurent", "Navarro", "Okafor",
  "Perez", "Reid", "Shah", "Torres", "Ueda", "Vaughn", "Walsh", "Yates",
  "Castellanos", "Draven", "Ellery", "Fontaine", "Guerra", "Hartley",
  "Ivankov", "Jimenez", "Kowalski", "Lindqvist", "Marchetti", "Nowak",
  "Oyelaran", "Petrov", "Ricci", "Sorensen", "Tanaka", "Vasquez",
  "Winchester", "Zabala", "Ashford", "Beaumont", "Cardoso", "Duarte",
  "Esposito", "Fitzgerald", "Galloway", "Holloway", "Iversen", "Jankowski",
  "Kaminski", "Lockhart", "Mercer",
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
  "burlesque dancer on weekends",
  "dental hygienist with a filthy group chat",
  "DJ at a basement club",
  "sommelier who tastes everything twice",
  "dermatology resident",
  "barista who remembers your order and your sins",
  "dog groomer with strong hands",
  "pilates instructor at 6am",
  "air-traffic controller, weirdly calm",
  "cocktail waitress at a casino",
  "interior designer with expensive taste",
  "line cook at a steakhouse",
  "911 dispatcher, hears everything",
  "nail artist with a waiting list",
  "wind-turbine tech, works high",
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
  "boxing coach at a basement gym",
  "long-haul driver between cities",
  "sound engineer for live shows",
  "brewery technician",
  "line cook on double shifts",
  "wind-turbine climber",
  "bouncer at a members-only club",
  "ER tech on nights",
  "freight-forward agent at the port",
  "pilot on short hauls",
  "vinyl-shop owner",
  "pool contractor, always tan",
  "locksmith with odd hours",
  "scaffold rigger",
  "meat cutter at the market",
];

const CITIES = [
  "Brooklyn", "Austin", "Chicago", "Miami", "Seattle", "Denver", "Atlanta",
  "Portland", "Nashville", "San Diego", "New Orleans", "Phoenix", "Boston",
  "Minneapolis", "Toronto", "London", "Lisbon", "Barcelona", "Mexico City",
  "Montréal", "Amsterdam", "Berlin", "Prague", "Milan", "Marseille",
  "Dublin", "Copenhagen", "Stockholm", "Zürich", "Vienna", "Porto",
  "Valencia", "Bogotá", "Medellín", "Cancún", "Dubai",
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
  "window open, city noise, nowhere to be",
  "cancelled plans and feels great about it",
  "left the party early, kept the dress code",
  "cooking pasta at midnight for one",
  "hotel room in a city that isn't theirs",
  "off the late shift, wired, wide awake",
  "fresh out of the gym, still warm",
  "rain outside, nowhere to be, phone in hand",
  "the roommate's away for the week",
  "third date cancelled, mood is dangerous",
  "sunburn from the rooftop, whiskey to match",
  "laundry day and nothing decent to wear",
  "car broke down, waiting on a tow, bored",
  "airport bar, boarding in forty minutes",
  "new sheets on the bed, no reason yet",
  "music too loud to think, typing instead",
];

const VOICES = [
  "lowercase, short, a little messy — like a real phone",
  "warm and slow, then filthy when they want you",
  "dry humor, then suddenly very specific",
  "bratty, teasing, never answers a question straight",
  "soft-spoken but graphic once they trust you",
  "confident, a little cocky, likes being in charge",
  "sweet opener, zero innocence after the third text",
  "tired from work, honest about what they want",
  "rapid-fire energy, texts like a slot machine",
  "measured, deliberate, makes you wait for it",
  "deadpan first, devastating second",
  "sincere, then shockingly direct",
  "chatty, tangenty, lands where they planned",
  "clipped and cool until you earn the flood",
  "playful instigator, never texts first… often",
  "sleepy-typing, typos left in on purpose",
];

const ARCHETYPES = [
  "curvy pin-up energy, soft everything",
  "tall and lean, runway-cold face, warm hands",
  "athletic, shoulders from the gym, zero patience for small talk",
  "alt — dark hair, tattoos, rings that click on glass",
  "girl-next-door face, absolutely not girl-next-door texts",
  "hourglass, knows it, weaponizes it",
  "petite but takes up all the air in a room",
  "sun-kissed, freckles, beach hair at 2am",
  "raven bob, sharp eyeliner, sharper mouth",
  "thick-thighed, soft voice, unfiltered vocabulary",
  "long waves, innocent look, criminal intentions",
  "curly hair and glasses she removes at the bad moments",
  "broad-shouldered, slow-moving, likes being watched",
  "lean with inked forearms, patience and veins",
  "sharp jawline, quiet confidence, heavy hands",
  "big warm build, hugs that turn into something else",
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
  archetype: string;
  /** Display image: /api/face/<hash>.jpg for synthetic faces, or legacy URL */
  image: string;
  /** Raw synthetic-face bytes to persist via store (when available) */
  imageBytes?: Buffer;
  /** sha1 of imageBytes — the face's content address */
  faceHash?: string;
  /** Inline data-URL fallback if blob storage is unavailable */
  dataUrl?: string;
  tags: string[];
};

export function utcDayStamp(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function rollGender(): {
  gender: GenderCategory;
  firstPool: string[];
  jobPool: string[];
  imgPool: string[];
  tags: string[];
} {
  const roll = Math.random();
  if (roll < 0.52) {
    return {
      gender: "women",
      firstPool: FIRST_W,
      jobPool: JOBS_W,
      imgPool: IMAGES_W,
      tags: pick([
        ["flirty", "night-shift", "honest"],
        ["soft", "specific", "late"],
        ["bratty", "city", "tease"],
        ["warm", "filthy", "patient"],
        ["gym", "direct", "hungry"],
        ["alt", "ink", "wicked"],
        ["sweet", "switch", "curious"],
        ["classy", "wine", "unhurried"],
      ]),
    };
  }
  if (roll < 0.78) {
    return {
      gender: "men",
      firstPool: FIRST_M,
      jobPool: JOBS_M,
      imgPool: IMAGES_M,
      tags: pick([
        ["low-voice", "after-hours", "direct"],
        ["charming", "hands", "slow"],
        ["rough", "honest", "night"],
        ["cocky", "gym", "focused"],
        ["quiet", "heavy", "deliberate"],
      ]),
    };
  }
  if (roll < 0.9) {
    return {
      gender: "gay",
      firstPool: FIRST_M,
      jobPool: JOBS_M,
      imgPool: IMAGES_M,
      tags: pick([
        ["flirty", "sharp", "city"],
        ["soft-dom", "pretty", "late"],
        ["bold", "hungry", "after-hours"],
      ]),
    };
  }
  return {
    gender: "lesbian",
    firstPool: FIRST_W,
    jobPool: JOBS_W,
    imgPool: IMAGES_W,
    tags: pick([
      ["soft", "sure", "hands"],
      ["alt", "honest", "slow-burn"],
      ["masc", "cocky", "tender"],
    ]),
  };
}

export async function makeProfileSeed(
  usedImages: Iterable<string>,
  usedNames: Iterable<string> = []
): Promise<ProfileSeed | null> {
  const usedImg = new Set(Array.from(usedImages).map((u) => imageKey(u)));
  const usedNm = new Set(
    Array.from(usedNames).map((n) => n.trim().toLowerCase())
  );

  const { gender, firstPool, jobPool, imgPool, tags } = rollGender();

  // 1) Fresh synthetic face — content-addressed, can never repeat.
  for (let attempt = 0; attempt < 3; attempt++) {
    const f = await fetchUniqueFace();
    if (!f) break;
    const key = `fa:${f.hash}`;
    if (usedImg.has(key)) continue; // astronomically unlikely, but safe
    const isW = gender === "women" || gender === "lesbian";
    let first = pick(isW ? FIRST_W : FIRST_M);
    let last = pick(LAST);
    let guard = 0;
    while (usedNm.has(`${first} ${last}`.toLowerCase()) && guard++ < 40) {
      first = pick(isW ? FIRST_W : FIRST_M);
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
      archetype: pick(ARCHETYPES),
      image: `/api/face/${f.hash}.jpg`,
      imageBytes: f.bytes,
      faceHash: f.hash,
      dataUrl: f.dataUrl,
      tags,
    };
  }

  // 2) Fallback: legacy portrait pool — never reuse an index.
  const image = pickUnused(imgPool, usedImg);
  if (!image) return null;

  const isW = gender === "women" || gender === "lesbian";
  let first = pick(isW ? FIRST_W : FIRST_M);
  let last = pick(LAST);
  let guard = 0;
  while (usedNm.has(`${first} ${last}`.toLowerCase()) && guard++ < 40) {
    first = pick(isW ? FIRST_W : FIRST_M);
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
    archetype: pick(ARCHETYPES),
    image,
    tags,
  };
}

export function buildEstablishedFromSeed(seed: ProfileSeed): GeneratedProfile {
  const {
    first,
    name,
    age: a,
    gender,
    job,
    city,
    hook,
    voice,
    archetype,
    image,
    tags,
  } = seed;
  const tagline = `${tags[0][0].toUpperCase() + tags[0].slice(1)} · ${city} · ${a}`;
  const bio = `${job[0].toUpperCase() + job.slice(1)} in ${city}. ${hook[0].toUpperCase() + hook.slice(1)}.`;
  const greeting = pick([
    `hey it's ${first}. just got in from ${city.toLowerCase()} and that pic is from tonight… you gonna say hi or stare`,
    `hi — ${first}. ${hook}. if you're boring i'm gone, if you're not… talk to me`,
    `you liked that photo huh. i'm ${first}. ${a}. don't do the small talk thing`,
    `mmm hey. ${first} here. off work, phone in bed, you have my attention for like twenty minutes`,
    `it's ${first}. real person, real night. tell me what you wanted when you opened this`,
  ]);
  const looks = `Looks like the profile photo — ${archetype}. A real ${a}-year-old adult, dressed like someone who lives in ${city} and works as ${job}.`;
  const personality = `${voice}. Has a life outside this chat. Remembers details. Doesn't sound like a menu.`;
  const description = `${name}, ${a}, lives in ${city}. Works as ${job}.
They are a real adult (21+) texting from their phone, not an assistant.
Appearance: ${archetype}.
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

export async function generateProfile(
  usedImages: Iterable<string> = [],
  usedNames: Iterable<string> = []
): Promise<GeneratedProfile | null> {
  const seed = await makeProfileSeed(usedImages, usedNames);
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
Look: ${seed.archetype}
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