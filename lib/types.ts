export type UserLevel = 1 | 2 | 3;
export type UserRole = "user" | "admin";
export type GenderCategory =
  | "women"
  | "men"
  | "gay"
  | "lesbian"
  | "bi"
  | "trans"
  | "custom";

export type MediaType = "image" | "audio" | "video" | "voice_note";

export type ActivityEvent = {
  id: string;
  type:
    | "signup"
    | "login"
    | "logout"
    | "chat_start"
    | "message"
    | "ban"
    | "unban"
    | "credits"
    | "level"
    | "install"
    | "install_prompt"
    | "continuity"
    | "admin"
    | "error";
  userId?: string | null;
  email?: string | null;
  displayName?: string | null;
  chatId?: string | null;
  personaId?: string | null;
  detail: string;
  meta?: Record<string, string | number | boolean | null>;
  createdAt: string;
};

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  credits: number;
  level: UserLevel;
  role: UserRole;
  banned: boolean;
  godMode: boolean;
  favorites: string[];
  instagramHandle?: string | null;
  metaUserId?: string | null;
  trainingConsent?: boolean;
  trainingConsentAt?: string | null;
  trainingConsentVersion?: string | null;
  chainMemory?: string | null;
  createdAt: string;
  lastActiveAt: string;
  resetToken?: string | null;
  resetExpires?: string | null;
};

export const TRAINING_CONSENT_VERSION = "v1-2026-08";

export type ChatMessage = {
  id: string;
  chatId: string;
  role: "user" | "assistant" | "system";
  content: string;
  mediaUrl?: string | null;
  mediaType?: MediaType | null;
  createdAt: string;
};

export type ChatThread = {
  id: string;
  userId: string;
  personaId: string;
  roleplayId?: string | null;
  scenario?: string;
  title: string;
  levelId: UserLevel;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  active: boolean;
  customDescription?: string;
};

export type LiveSession = {
  userId: string;
  chatId: string;
  personaId: string;
  displayName: string;
  email: string;
  lastMessage: string;
  updatedAt: string;
};

export type PasswordResetRequest = {
  id: string;
  userId: string;
  email: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
};

export type CustomCharacter = {
  id: string;
  userId: string;
  name: string;
  age: number;
  gender: GenderCategory;
  tagline: string;
  bio: string;
  description: string;
  image: string;
  greeting: string;
  createdAt: string;
  liveHuman?: boolean;
  looks?: string;
  personality?: string;
};

export type SiteConfig = {
  siteTitle: string;
  welcomeNote: string;
  defaultLevel: UserLevel;
  defaultCredits: number;
  messageCreditCost: number;
  voiceCreditCost: number;
  mediaCreditCost: number;
  allowSignup: boolean;
  levels: TalkLevelConfig[];
};

export type TalkLevelConfig = {
  id: UserLevel;
  name: string;
  tagline: string;
  color: string;
  rules: string;
  allowMedia: boolean;
  allowVoice: boolean;
  allowCall: boolean;
  allowExtremeKinks: boolean;
};

export type PublicUser = Omit<
  User,
  "passwordHash" | "resetToken" | "resetExpires"
>;

export type SessionPayload = {
  sub: string;
  email: string;
  role: UserRole;
  level: UserLevel;
};
