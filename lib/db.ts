import { promises as fs } from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { DEFAULT_LEVELS } from "./levels";
import type {
  ChatMessage,
  ChatThread,
  LiveSession,
  PasswordResetRequest,
  PublicUser,
  SiteConfig,
  User,
  UserLevel,
} from "./types";

export type Database = {
  users: User[];
  chats: ChatThread[];
  messages: ChatMessage[];
  resets: PasswordResetRequest[];
  live: Record<string, LiveSession>;
  config: SiteConfig;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

function defaultConfig(): SiteConfig {
  return {
    siteTitle: "Nightline",
    welcomeNote: "18+ unfiltered · pick a partner · set your level",
    defaultLevel: 1,
    defaultCredits: Number(process.env.DEFAULT_CREDITS || 50),
    messageCreditCost: 1,
    voiceCreditCost: 2,
    mediaCreditCost: 2,
    allowSignup: true,
    levels: DEFAULT_LEVELS.map((l) => ({ ...l })),
  };
}

function emptyDb(): Database {
  return {
    users: [],
    chats: [],
    messages: [],
    resets: [],
    live: {},
    config: defaultConfig(),
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __nightlineDb: Database | undefined;
  // eslint-disable-next-line no-var
  var __nightlineDbReady: Promise<Database> | undefined;
}

function uid(prefix = "") {
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function ensureSeed(db: Database): Promise<void> {
  const email = (
    process.env.ADMIN_EMAIL || "brokenman256@gmail.com"
  ).toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || "changeme123";
  const hash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();

  const existing = db.users.find((u) => u.email === email);
  if (existing) {
    existing.role = "admin";
    existing.passwordHash = hash;
    existing.level = 3;
    existing.banned = false;
    existing.credits = Math.max(existing.credits, 999999);
    existing.displayName = existing.displayName || "Admin";
    existing.lastActiveAt = now;
    if (existing.godMode === undefined) {
      existing.godMode = true;
    }
  } else {
    db.users.push({
      id: uid("adm-"),
      email,
      passwordHash: hash,
      displayName: "Admin",
      credits: 999999,
      level: 3,
      role: "admin",
      banned: false,
      godMode: true,
      createdAt: now,
      lastActiveAt: now,
    });
  }
  // Migrate older users missing godMode
  for (const u of db.users) {
    if (typeof u.godMode !== "boolean") u.godMode = false;
  }
}

async function loadFromDisk(): Promise<Database> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Database;
    const base = emptyDb();
    return {
      ...base,
      ...parsed,
      config: { ...base.config, ...(parsed.config || {}) },
      live: parsed.live || {},
      users: parsed.users || [],
      chats: parsed.chats || [],
      messages: parsed.messages || [],
      resets: parsed.resets || [],
    };
  } catch {
    return emptyDb();
  }
}

async function saveToDisk(db: Database): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
  } catch {
    // On read-only serverless FS, memory still works for warm instances
  }
}

export async function getDb(): Promise<Database> {
  if (globalThis.__nightlineDb) return globalThis.__nightlineDb;
  if (!globalThis.__nightlineDbReady) {
    globalThis.__nightlineDbReady = (async () => {
      const db = await loadFromDisk();
      await ensureSeed(db);
      await saveToDisk(db);
      globalThis.__nightlineDb = db;
      return db;
    })();
  }
  return globalThis.__nightlineDbReady;
}

export async function persist(): Promise<void> {
  const db = await getDb();
  await saveToDisk(db);
}

export function toPublicUser(u: User): PublicUser {
  const { passwordHash: _, resetToken: __, resetExpires: ___, ...rest } = u;
  return rest;
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const db = await getDb();
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export async function findUserById(id: string): Promise<User | undefined> {
  const db = await getDb();
  return db.users.find((u) => u.id === id);
}

export async function createUser(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<User> {
  const db = await getDb();
  const exists = db.users.find(
    (u) => u.email.toLowerCase() === input.email.toLowerCase()
  );
  if (exists) throw new Error("Email already registered");

  const hash = await bcrypt.hash(input.password, 10);
  const user: User = {
    id: uid("usr-"),
    email: input.email.toLowerCase().trim(),
    passwordHash: hash,
    displayName: input.displayName.trim() || "User",
    credits: db.config.defaultCredits,
    level: db.config.defaultLevel,
    role: "user",
    banned: false,
    godMode: false,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  };
  db.users.push(user);
  await persist();
  return user;
}

export async function verifyPassword(
  user: User,
  password: string
): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

export async function updateUser(
  id: string,
  patch: Partial<
    Pick<
      User,
      | "credits"
      | "level"
      | "banned"
      | "displayName"
      | "passwordHash"
      | "lastActiveAt"
      | "resetToken"
      | "resetExpires"
      | "role"
      | "godMode"
    >
  >
): Promise<User | null> {
  const db = await getDb();
  const idx = db.users.findIndex((u) => u.id === id);
  if (idx < 0) return null;
  db.users[idx] = { ...db.users[idx], ...patch };
  await persist();
  return db.users[idx];
}

export async function listUsers(): Promise<PublicUser[]> {
  const db = await getDb();
  return db.users.map(toPublicUser);
}

export async function createChat(input: {
  userId: string;
  personaId: string;
  roleplayId?: string | null;
  scenario?: string;
  title: string;
  levelId: UserLevel;
}): Promise<ChatThread> {
  const db = await getDb();
  const now = new Date().toISOString();
  // mark other chats inactive for live tracking simplicity
  for (const c of db.chats) {
    if (c.userId === input.userId) c.active = false;
  }
  const chat: ChatThread = {
    id: uid("cht-"),
    userId: input.userId,
    personaId: input.personaId,
    roleplayId: input.roleplayId || null,
    scenario: input.scenario || "",
    title: input.title,
    levelId: input.levelId,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    active: true,
  };
  db.chats.push(chat);
  await persist();
  return chat;
}

export async function getChat(id: string): Promise<ChatThread | undefined> {
  const db = await getDb();
  return db.chats.find((c) => c.id === id);
}

export async function listChatsByUser(userId: string): Promise<ChatThread[]> {
  const db = await getDb();
  return db.chats
    .filter((c) => c.userId === userId)
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}

export async function listAllChats(): Promise<ChatThread[]> {
  const db = await getDb();
  return [...db.chats].sort((a, b) =>
    b.lastMessageAt.localeCompare(a.lastMessageAt)
  );
}

export async function addMessage(input: {
  chatId: string;
  role: "user" | "assistant" | "system";
  content: string;
  mediaUrl?: string | null;
  mediaType?: ChatMessage["mediaType"];
}): Promise<ChatMessage> {
  const db = await getDb();
  const now = new Date().toISOString();
  const msg: ChatMessage = {
    id: uid("msg-"),
    chatId: input.chatId,
    role: input.role,
    content: input.content,
    mediaUrl: input.mediaUrl || null,
    mediaType: input.mediaType || null,
    createdAt: now,
  };
  db.messages.push(msg);
  const chat = db.chats.find((c) => c.id === input.chatId);
  if (chat) {
    chat.lastMessageAt = now;
    chat.updatedAt = now;
    chat.active = true;
  }
  await persist();
  return msg;
}

export async function getMessages(chatId: string): Promise<ChatMessage[]> {
  const db = await getDb();
  return db.messages
    .filter((m) => m.chatId === chatId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function touchLive(session: LiveSession): Promise<void> {
  const db = await getDb();
  db.live[session.userId] = session;
  await persist();
}

export async function listLive(): Promise<LiveSession[]> {
  const db = await getDb();
  const cutoff = Date.now() - 5 * 60 * 1000;
  return Object.values(db.live)
    .filter((s) => new Date(s.updatedAt).getTime() >= cutoff)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createResetRequest(
  user: User
): Promise<PasswordResetRequest> {
  const db = await getDb();
  const token = uid("rst-") + Math.random().toString(36).slice(2);
  const req: PasswordResetRequest = {
    id: uid("pr-"),
    userId: user.id,
    email: user.email,
    token,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    used: false,
  };
  db.resets.push(req);
  await updateUser(user.id, {
    resetToken: token,
    resetExpires: req.expiresAt,
  });
  await persist();
  return req;
}

export async function listResets(): Promise<PasswordResetRequest[]> {
  const db = await getDb();
  return [...db.resets].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export async function consumeResetToken(
  token: string,
  newPassword: string
): Promise<boolean> {
  const db = await getDb();
  const req = db.resets.find((r) => r.token === token && !r.used);
  if (!req) return false;
  if (new Date(req.expiresAt).getTime() < Date.now()) return false;
  const hash = await bcrypt.hash(newPassword, 10);
  await updateUser(req.userId, {
    passwordHash: hash,
    resetToken: null,
    resetExpires: null,
  });
  req.used = true;
  await persist();
  return true;
}

export async function getConfig(): Promise<SiteConfig> {
  const db = await getDb();
  return db.config;
}

export async function saveConfig(cfg: SiteConfig): Promise<SiteConfig> {
  const db = await getDb();
  db.config = cfg;
  await persist();
  return db.config;
}

export async function spendCredits(
  userId: string,
  amount: number
): Promise<{ ok: boolean; credits: number; error?: string }> {
  const user = await findUserById(userId);
  if (!user) return { ok: false, credits: 0, error: "User not found" };
  if (user.credits < amount) {
    return {
      ok: false,
      credits: user.credits,
      error: "Not enough credits. Ask admin to top up.",
    };
  }
  const updated = await updateUser(userId, {
    credits: user.credits - amount,
    lastActiveAt: new Date().toISOString(),
  });
  return { ok: true, credits: updated?.credits ?? 0 };
}
