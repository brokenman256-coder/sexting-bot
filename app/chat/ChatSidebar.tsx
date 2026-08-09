"use client";

import type { Persona } from "@/lib/personas";
import type { GenderCategory, PublicUser, TalkLevelConfig, UserLevel } from "@/lib/types";

const GENDERS: { id: GenderCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "women", label: "Women" },
  { id: "men", label: "Men" },
  { id: "gay", label: "Gay" },
  { id: "lesbian", label: "Lesbian" },
  { id: "bi", label: "Bi" },
  { id: "trans", label: "Trans" },
  { id: "custom", label: "Custom" },
];

export type ChatSidebarProps = {
  user: PublicUser;
  persona: Persona;
  personaId: string;
  gender: GenderCategory | "all";
  setGender: (g: GenderCategory | "all") => void;
  filteredPersonas: Persona[];
  customAvatar: string | null;
  customDescription: string;
  setCustomDescription: (v: string) => void;
  scenario: string;
  setScenario: (v: string) => void;
  levels: TalkLevelConfig[];
  levelId: UserLevel;
  switchPersona: (id: string) => void;
  switchLevel: (id: UserLevel) => void;
  startNewChat: (p?: Persona, rpId?: string | null, lvl?: UserLevel) => void;
  roleplayId: string | null;
  onUploadImage: (file: File | null) => void;
};

export default function ChatSidebar(p: ChatSidebarProps) {
  const {
    user, persona, personaId, gender, setGender, filteredPersonas,
    customAvatar, customDescription, setCustomDescription, scenario, setScenario,
    levels, levelId, switchPersona, switchLevel, startNewChat, roleplayId, onUploadImage,
  } = p;
  return (
    <aside className="panel sidebar">
      <h2>Category</h2>
      <div className="filters">
        {GENDERS.map((g) => (
          <button
            key={g.id}
            type="button"
            className={`chip ${gender === g.id ? "active" : ""}`}
            onClick={() => setGender(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>

      <h2>Companions</h2>
      <div className="persona-grid">
        {filteredPersonas.map((per) => {
          const locked = per.minLevel > user.level;
          return (
            <button
              key={per.id}
              type="button"
              className={`persona-card ${personaId === per.id ? "active" : ""}`}
              style={{ ["--persona-accent" as string]: per.accent }}
              onClick={() => switchPersona(per.id)}
              disabled={locked}
              title={locked ? `Requires level ${per.minLevel}` : per.bio}
            >
              <img src={per.id === "custom" && customAvatar ? customAvatar : per.image} alt={per.name} />
              <div>
                <strong>
                  {per.online && <span className="online-dot" />}
                  {per.name} · {per.age}
                  {locked ? ` L${per.minLevel}` : ""}
                </strong>
                <small>{per.tagline}</small>
              </div>
            </button>
          );
        })}
      </div>

      <h2>Your level (max L{user.level})</h2>
      <div className="level-grid">
        {levels.map((l) => {
          const locked = l.id > user.level;
          return (
            <button
              key={l.id}
              type="button"
              className={`level-btn ${levelId === l.id ? "active" : ""}`}
              style={{ ["--lvl" as string]: l.color }}
              disabled={locked}
              onClick={() => switchLevel(l.id)}
            >
              <strong>
                {l.name}
                {locked ? " locked" : ""}
              </strong>
              <small>{l.tagline}</small>
            </button>
          );
        })}
      </div>

      {personaId === "custom" && (
        <>
          <h2>Custom character</h2>
          <label className="file-btn">
            Upload face / body photo
            <input
              type="file"
              accept="image/*"
              onChange={(e) => void onUploadImage(e.target.files?.[0] || null)}
            />
          </label>
          <div className="field">
            <label>Description</label>
            <textarea
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
            />
          </div>
        </>
      )}

      <div className="field">
        <label>Extra scenario (optional)</label>
        <textarea
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          placeholder="hotel after drinks, video call"
        />
      </div>
      <button
        type="button"
        className="btn"
        onClick={() => void startNewChat(persona, roleplayId, levelId)}
      >
        New chat
      </button>
    </aside>
  );
}
