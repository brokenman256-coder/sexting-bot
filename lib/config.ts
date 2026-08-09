import { DEFAULT_LEVELS } from "./levels";

export const STORAGE_KEYS = {
  ageOk: "nightline_age_ok",
  config: "nightline_admin_config",
  adminSession: "nightline_admin_ok",
  customBg: "nightline_custom_bg",
  customAvatar: "nightline_custom_avatar",
  prefs: "nightline_prefs",
} as const;

export type TalkLevel = {
  id: "1" | "2" | "3";
  name: string;
  tagline: string;
  color: string;
  rules: string;
};

export type AdminConfig = {
  levels: TalkLevel[];
  defaultLevelId: "1" | "2" | "3";
  personaImages: Record<string, string>;
  siteTitle: string;
  welcomeNote: string;
};

export function defaultAdminConfig(): AdminConfig {
  return {
    levels: DEFAULT_LEVELS.map((l) => ({
      id: String(l.id) as "1" | "2" | "3",
      name: l.name,
      tagline: l.tagline,
      color: l.color,
      rules: l.rules,
    })),
    defaultLevelId: "3",
    personaImages: {},
    siteTitle: "Nightline",
    welcomeNote: "18+ unfiltered · pick a partner · set your level",
  };
}

export function loadAdminConfig(): AdminConfig {
  if (typeof window === "undefined") return defaultAdminConfig();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.config);
    if (!raw) return defaultAdminConfig();
    const parsed = JSON.parse(raw) as Partial<AdminConfig>;
    const base = defaultAdminConfig();
    return {
      ...base,
      ...parsed,
      levels:
        Array.isArray(parsed.levels) && parsed.levels.length === 3
          ? (parsed.levels as TalkLevel[])
          : base.levels,
      personaImages: parsed.personaImages || {},
    };
  } catch {
    return defaultAdminConfig();
  }
}

export function saveAdminConfig(cfg: AdminConfig) {
  localStorage.setItem(STORAGE_KEYS.config, JSON.stringify(cfg));
}
