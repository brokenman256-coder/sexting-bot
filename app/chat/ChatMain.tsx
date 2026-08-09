"use client";

import type { Persona } from "@/lib/personas";
import type { Roleplay } from "@/lib/roleplays";
import type { RefObject } from "react";

type UiMsg = {
  id: string;
  role: "user" | "assistant" | "system" | "error";
  content: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
};

const QUICK = [
  "be filthy with me",
  "don't hold back",
  "describe yourself right now",
  "send me something spicy",
  "what would you do to me",
  "voice note me",
];

export type ChatMainProps = {
  persona: Persona;
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
  roleplayId: string | null;
  availableRoleplays: Roleplay[];
  switchRoleplay: (id: string | null) => void;
};

export default function ChatMain(p: ChatMainProps) {
  const {
    persona, callMode, setCallMode, canCall, canVoice, messages, busy, bottomRef,
    pendingMedia, setPendingMedia, input, setInput, onKeyDown, send, onUploadImage,
    toggleVoiceRecord, recording, roleplayId, availableRoleplays, switchRoleplay,
  } = p;
  return (
    <>
      <section className="panel chat">
        {callMode && (
          <div className="call-banner">
            <span>
              <span className="call-pulse" />
              Voice call with {persona.name}
            </span>
            <button className="btn btn-sm btn-danger" type="button" onClick={() => setCallMode(false)}>
              End call
            </button>
          </div>
        )}
        <div className="chat-header">
          <div className="who">
            <img src={persona.image} alt={persona.name} />
            <div>
              <strong>
                {persona.name} · {persona.age}
              </strong>
              <span>{persona.bio}</span>
            </div>
          </div>
          <div className="row">
            {canCall && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setCallMode((v) => !v)}
              >
                {callMode ? "In call" : "Call"}
              </button>
            )}
          </div>
        </div>

        <div className="messages">
          {messages.map((m) => (
            <div key={m.id} className={`msg ${m.role}`}>
              {m.content || (busy && m.role === "assistant" ? "..." : "")}
              {m.mediaUrl && m.mediaType === "image" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="msg-media" src={m.mediaUrl} alt="shared" />
              )}
              {m.mediaType === "voice_note" && (
                <div className="voice-bubble">
                  Voice note
                  {m.mediaUrl && (
                    <audio controls src={m.mediaUrl} style={{ maxWidth: 180, height: 32 }} />
                  )}
                </div>
              )}
            </div>
          ))}
          {busy && <div className="typing">typing...</div>}
          <div ref={bottomRef} />
        </div>

        <div className="quick">
          {QUICK.map((q) => (
            <button key={q} type="button" disabled={busy} onClick={() => void send(q)}>
              {q}
            </button>
          ))}
        </div>

        {pendingMedia && (
          <div className="row" style={{ padding: "0 12px" }}>
            <span className="badge">
              {pendingMedia.type === "image" ? "Photo ready" : "Voice ready"} - will send with next message
            </span>
            <button className="btn btn-sm" type="button" onClick={() => setPendingMedia(null)}>
              Clear
            </button>
          </div>
        )}

        <div className="composer">
          <div className="composer-tools">
            <label className="file-btn">
              Media
              <input
                type="file"
                accept="image/*"
                onChange={(e) => void onUploadImage(e.target.files?.[0] || null)}
              />
            </label>
            {canVoice && (
              <button
                type="button"
                className={`btn btn-sm ${recording ? "btn-danger" : ""}`}
                onClick={() => void toggleVoiceRecord()}
              >
                {recording ? "Stop" : "Voice note"}
              </button>
            )}
          </div>
          <div className="composer-row">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={
                callMode
                  ? `Talk to ${persona.name}...`
                  : `Message ${persona.name}...`
              }
              rows={2}
              disabled={busy}
            />
            <button
              className="send-btn"
              type="button"
              disabled={busy || (!input.trim() && !pendingMedia)}
              onClick={() => void send()}
            >
              Send
            </button>
          </div>
        </div>
      </section>

      <aside className="panel rightbar">
        <h2>Roleplays</h2>
        <div className="roleplay-list">
          <button
            type="button"
            className={`rp-btn ${!roleplayId ? "active" : ""}`}
            onClick={() => switchRoleplay(null)}
          >
            Free chat
            <small>No scripted scenario</small>
          </button>
          {availableRoleplays.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`rp-btn ${roleplayId === r.id ? "active" : ""}`}
              onClick={() => switchRoleplay(r.id)}
            >
              {r.emoji} {r.title}
              <small>
                {r.blurb}
                {r.minLevel > 1 ? ` · L${r.minLevel}+` : ""}
              </small>
            </button>
          ))}
        </div>
        <p className="muted" style={{ fontSize: "0.75rem" }}>
          Level 3 unlocks CNC / extreme roleplays, voice calls, and full unrestricted mode.
          Admin assigns your max level &amp; credits.
        </p>
      </aside>
    </>
  );
}
