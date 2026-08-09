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

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  credits: number;
  /** Max talk level admin assigned (1–3). Level 3 = full unrestricted. */
  level: UserLevel;
  role: UserRole;
  banned: boolean;
  createdAt: string;
  lastActiveAt: string;
  resetToken?: string | null;
  resetExpires?: string | null;
};

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
