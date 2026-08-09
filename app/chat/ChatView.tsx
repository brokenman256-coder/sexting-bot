"use client";

import Link from "next/link";
import type { RefObject } from "react";
import type { Persona } from "@/lib/personas";
import type { Roleplay } from "@/lib/roleplays";
import type { GenderCategory, PublicUser, TalkLevelConfig, UserLevel } from "@/lib/types";
import ChatSidebar from "./ChatSidebar";
import ChatMain from "./ChatMain";

type UiMsg = {
  id: string;
  role: "user" | "assistant" | "system" | "error";
  content: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
};

type ClientConfig = {
  siteTitle: string;
  welcomeNote: string;
  messageCreditCost: number;
  voiceCreditCost: number;
  mediaCreditCost: number;
  levels: TalkLevelConfig[];
};

export type ChatViewProps = {
  cfg: ClientConfig;
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
  switchRoleplay: (id: string | null) => void;
  startNewChat: (p?: Persona, rpId?: string | null, lvl?: UserLevel) => void;
  roleplayId: string | null;
  availableRoleplays: Roleplay[];
  callMode: boolean;
  setCallMode: (v: boolean | ((p: boolean) => boolean)) => void;
  canCall: boolean;
  canVoice: boolean;
  messages: UiMsg[];
  busy: boolean;
  bottomRef: RefObject<HTMLDivElement | null>;
  pendingMedia: { url: string; type: "image" | "voice_note" } | null;
  setPendingMedia: (v: { url: string; type: "image" | "voice_note" } | null) => void;
  input: string;
  setInput: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  send: (text?: string) => void;
  onUploadImage: (file: File | null) => void;
  toggleVoiceRecord: () => void;
  recording: boolean;
  logout: () => void;
};

export default function ChatView(p: ChatViewProps) {
  const {
    cfg, user, persona, personaId, gender, setGender, filteredPersonas,
    customAvatar, customDescription, setCustomDescription, scenario, setScenario,
    levels, levelId, switchPersona, switchLevel, switchRoleplay, startNewChat,
    roleplayId, availableRoleplays, callMode, setCallMode, canCall, canVoice,
    messages, busy, bottomRef, pendingMedia, setPendingMedia, input, setInput,
    onKeyDown, send, onUploadImage, toggleVoiceRecord, recording, logout,
  } = p;

  return (
    <>
      <div
        className="app-bg"
        style={{ backgroundImage: `url(${persona.image})` }}
        aria-hidden
      />
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
            <img className="brand-avatar" src={persona.image} alt={persona.name} />
            <div>
              <h1>{cfg.siteTitle}</h1>
              <span>{cfg.welcomeNote}</span>
            </div>
          </div>
          <div className="top-actions">
            <span className="credits-pill">{user.credits} credits</span>
            {user.godMode && (
              <span className="badge" style={{ borderColor: "#fbbf24", color: "#fde68a" }}>
                ⚡ GOD MODE
              </span>
            )}
            <span className="badge">L{user.level} max · using {levelId}</span>
            <span className="badge">{user.displayName}</span>

            <button className="btn btn-sm" type="button" onClick={() => void logout()}>
              Log out
            </button>
          </div>
        </header>

        <div className="layout">
          <ChatSidebar
            user={user}
            persona={persona}
            personaId={personaId}
            gender={gender}
            setGender={setGender}
            filteredPersonas={filteredPersonas}
            customAvatar={customAvatar}
            customDescription={customDescription}
            setCustomDescription={setCustomDescription}
            scenario={scenario}
            setScenario={setScenario}
            levels={levels}
            levelId={levelId}
            switchPersona={switchPersona}
            switchLevel={switchLevel}
            startNewChat={startNewChat}
            roleplayId={roleplayId}
            onUploadImage={onUploadImage}
          />
          <ChatMain
            persona={persona}
            callMode={callMode}
            setCallMode={setCallMode}
            canCall={canCall}
            canVoice={canVoice}
            messages={messages}
            busy={busy}
            bottomRef={bottomRef}
            pendingMedia={pendingMedia}
            setPendingMedia={setPendingMedia}
            input={input}
            setInput={setInput}
            onKeyDown={onKeyDown}
            send={send}
            onUploadImage={onUploadImage}
            toggleVoiceRecord={toggleVoiceRecord}
            recording={recording}
            roleplayId={roleplayId}
            availableRoleplays={availableRoleplays}
            switchRoleplay={switchRoleplay}
          />
        </div>
        <p className="footer-note">
          Adults 18+ only · Characters 21+ · {cfg.messageCreditCost} credit / message · media &amp; voice cost more
        </p>
      </div>
    </>
  );
}
