"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PERSONAS, type Persona } from "@/lib/personas";
import { ROLEPLAYS } from "@/lib/roleplays";
import type { GenderCategory, PublicUser, TalkLevelConfig, UserLevel } from "@/lib/types";

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

const QUICK = [
  "be filthy with me",
  "don't hold back",
  "describe yourself right now",
  "send me something spicy",
  "what would you do to me",
  "voice note me",
];

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

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [cfg, setCfg] = useState<ClientConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [gender, setGender] = useState<GenderCategory | "all">("all");
  const [personaId, setPersonaId] = useState("nova");
  const [levelId, setLevelId] = useState<UserLevel>(1);
  const [roleplayId, setRoleplayId] = useState<string | null>(null);
  const [scenario, setScenario] = useState("");
  const [customDescription, setCustomDescription] = useState(
    "24, insanely hot, long hair, perfect body, lingerie, filthy mouth, obsessed with me"
  );
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [callMode, setCallMode] = useState(false);
  const [recording, setRecording] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<{ url: string; type: "image" | "voice_note" } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const levels = cfg?.levels || [];
  const persona = useMemo(() => {
    const p = PERSONAS.find((x) => x.id === personaId) || PERSONAS[0];
    if (p.id === "custom" && customAvatar) return { ...p, image: customAvatar };
    return p;
  }, [personaId, customAvatar]);

  const filteredPersonas = useMemo(() => {
    if (gender === "all") return PERSONAS.filter((p) => p.id !== "custom");
    return PERSONAS.filter((p) => p.gender === gender);
  }, [gender]);

  const availableRoleplays = useMemo(() => {
    if (!user) return [];
    return ROLEPLAYS.filter((r) => r.minLevel <= user.level);
  }, [user]);

  const loadMe = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    if (!res.ok) {
      router.push("/login?next=/chat");
      return;
    }
    const data = await res.json();
    setUser(data.user);
    setCfg(data.config);
    setLevelId(data.user.level as UserLevel);
    setLoading(false);
  }, [router]);

  useEffect(() => { void loadMe(); }, [loadMe]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  async function startNewChat(p?: Persona, rpId?: string | null, lvl?: UserLevel) {
    if (!user) return;
    const pid = p?.id || personaId;
    const rid = rpId !== undefined ? rpId : roleplayId;
    const lv = lvl || levelId;
    setBusy(true);
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId: pid, roleplayId: rid, scenario, levelId: lv }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start chat");
      setChatId(data.chat.id);
      setMessages((data.messages || []).map((m: UiMsg & { id: string }) => ({
        id: m.id, role: m.role, content: m.content, mediaUrl: m.mediaUrl, mediaType: m.mediaType,
      })));
    } catch (e) {
      setMessages([{ id: uid(), role: "error", content: e instanceof Error ? e.message : "Failed to start chat" }]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (user && cfg && !chatId) void startNewChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, cfg]);

  function switchPersona(id: string) {
    setPersonaId(id);
    const p = PERSONAS.find((x) => x.id === id) || PERSONAS[0];
    if (p.minLevel > (user?.level || 1)) {
      setMessages((m) => [...m, { id: uid(), role: "error", content: `Needs level ${p.minLevel}. Ask admin to upgrade you.` }]);
      return;
    }
    void startNewChat(p, roleplayId, levelId);
  }

  function switchLevel(id: UserLevel) {
    if (!user || id > user.level) return;
    setLevelId(id);
    setMessages((m) => [...m, { id: uid(), role: "system", content: `Talk level set to ${levels.find((l) => l.id === id)?.name || id}` }]);
  }

  function switchRoleplay(id: string | null) {
    setRoleplayId(id);
    void startNewChat(persona, id, levelId);
  }

  async function onUploadImage(file: File | null) {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 4 * 1024 * 1024) {
      setMessages((m) => [...m, { id: uid(), role: "error", content: "Image max 4MB" }]);
      return;
    }
    const data = await readFileAsDataUrl(file);
    if (personaId === "custom") setCustomAvatar(data);
    setPendingMedia({ url: data, type: "image" });
  }

  async function toggleVoiceRecord() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => setPendingMedia({ url: String(reader.result), type: "voice_note" });
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setMessages((m) => [...m, { id: uid(), role: "error", content: "Microphone permission denied" }]);
    }
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if ((!content && !pendingMedia) || busy || !chatId || !user) return;
    const userMsg: UiMsg = {
      id: uid(),
      role: "user",
      content: content || (pendingMedia?.type === "voice_note" ? "Voice note" : "Photo"),
      mediaUrl: pendingMedia?.url,
      mediaType: pendingMedia?.type,
    };
    const history = [...messages, userMsg]
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    setMessages((m) => [...m, userMsg]);
    setInput("");
    const media = pendingMedia;
    setPendingMedia(null);
    setBusy(true);
    const assistantId = uid();
    setMessages((m) => [...m, { id: assistantId, role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          personaId,
          customDescription: personaId === "custom" ? customDescription : "",
          levelId,
          scenario,
          userName: user.displayName,
          chatId,
          roleplayId,
          callMode,
          mediaUrl: media?.url,
          mediaType: media?.type,
          isVoiceNote: media?.type === "voice_note",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        const clean = full.replace(/\n\n\[\[META:[\s\S]*?\]\]$/, "");
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: clean } : m)));
      }
      const metaMatch = full.match(/\[\[META:([\s\S]*?)\]\]$/);
      if (metaMatch) {
        try {
          const meta = JSON.parse(metaMatch[1]);
          if (typeof meta.credits === "number") setUser((u) => (u ? { ...u, credits: meta.credits } : u));
        } catch { /* ignore */ }
        const clean = full.replace(/\n\n\[\[META:[\s\S]*?\]\]$/, "");
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: clean || "…" } : m)));
      }
      const me = await fetch("/api/auth/me");
      if (me.ok) {
        const d = await me.json();
        setUser(d.user);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) => [...prev.filter((m) => m.id !== assistantId || m.content), { id: uid(), role: "error", content: msg }]);
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  if (loading || !user || !cfg) {
    return (<div className="auth-page"><p className="muted">Loading Nightline…</p></div>);
  }

  const levelCfg = levels.find((l) => l.id === levelId);
  const canVoice = levelCfg?.allowVoice || user.level >= 2;
  const canCall = levelCfg?.allowCall || user.level >= 3;

  return (
    <>
      <div className="app-bg" style={{ backgroundImage: `url(${persona.image})` }} aria-hidden />
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
            <span className="credits-pill">💎 {user.credits} credits</span>
            <span className="badge">L{user.level} max · using {levelId}</span>
            <span className="badge">{user.displayName}</span>
            {user.role === "admin" && <Link className="btn btn-sm" href="/admin">Admin</Link>}
            <button className="btn btn-sm" type="button" onClick={() => void logout()}>Log out</button>
          </div>
        </header>
        <div className="layout">
          <aside className="panel sidebar">
            <h2>Category</h2>
            <div className="filters">
              {GENDERS.map((g) => (
                <button key={g.id} type="button" className={`chip ${gender === g.id ? "active" : ""}`} onClick={() => setGender(g.id)}>{g.label}</button>
              ))}
            </div>
            <h2>Companions</h2>
            <div className="persona-grid">
              {filteredPersonas.map((p) => {
                const locked = p.minLevel > user.level;
                return (
                  <button key={p.id} type="button" className={`persona-card ${personaId === p.id ? "active" : ""}`} style={{ ["--persona-accent" as string]: p.accent }} onClick={() => switchPersona(p.id)} disabled={locked} title={locked ? `Requires level ${p.minLevel}` : p.bio}>
                    <img src={p.id === "custom" && customAvatar ? customAvatar : p.image} alt={p.name} />
                    <div>
                      <strong>{p.online && <span className="online-dot" />}{p.name} · {p.age}{locked ? ` L${p.minLevel}` : ""}</strong>
                      <small>{p.tagline}</small>
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
                  <button key={l.id} type="button" className={`level-btn ${levelId === l.id ? "active" : ""}`} style={{ ["--lvl" as string]: l.color }} disabled={locked} onClick={() => switchLevel(l.id)}>
                    <strong>{l.name}{locked ? " locked" : ""}</strong>
                    <small>{l.tagline}</small>
                  </button>
                );
              })}
            </div>
            {personaId === "custom" && (
              <>
                <h2>Custom character</h2>
                <label className="file-btn">Upload face / body photo<input type="file" accept="image/*" onChange={(e) => void onUploadImage(e.target.files?.[0] || null)} /></label>
                <div className="field"><label>Description</label><textarea value={customDescription} onChange={(e) => setCustomDescription(e.target.value)} /></div>
              </>
            )}
            <div className="field"><label>Extra scenario (optional)</label><textarea value={scenario} onChange={(e) => setScenario(e.target.value)} placeholder="hotel after drinks, video call…" /></div>
            <button type="button" className="btn" onClick={() => void startNewChat(persona, roleplayId, levelId)}>New chat</button>
          </aside>
          <section className="panel chat">
            {callMode && (
              <div className="call-banner">
                <span><span className="call-pulse" />Voice call with {persona.name}</span>
                <button className="btn btn-sm btn-danger" type="button" onClick={() => setCallMode(false)}>End call</button>
              </div>
            )}
            <div className="chat-header">
              <div className="who">
                <img src={persona.image} alt={persona.name} />
                <div>
                  <strong>{persona.name} · {persona.age}</strong>
                  <span>{persona.bio}</span>
                </div>
              </div>
              <div className="row">
                {canCall && (
                  <button type="button" className="btn btn-sm" onClick={() => setCallMode((v) => !v)}>{callMode ? "In call" : "Call"}</button>
                )}
              </div>
            </div>
            <div className="messages">
              {messages.map((m) => (
                <div key={m.id} className={`msg ${m.role}`}>
                  {m.content || (busy && m.role === "assistant" ? "…" : "")}
                  {m.mediaUrl && m.mediaType === "image" && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="msg-media" src={m.mediaUrl} alt="shared" />
                  )}
                  {m.mediaType === "voice_note" && (
                    <div className="voice-bubble">Voice note{m.mediaUrl && <audio controls src={m.mediaUrl} style={{ maxWidth: 180, height: 32 }} />}</div>
                  )}
                </div>
              ))}
              {busy && <div className="typing">typing…</div>}
              <div ref={bottomRef} />
            </div>
            <div className="quick">
              {QUICK.map((q) => (
                <button key={q} type="button" disabled={busy} onClick={() => void send(q)}>{q}</button>
              ))}
            </div>
            {pendingMedia && (
              <div className="row" style={{ padding: "0 12px" }}>
                <span className="badge">{pendingMedia.type === "image" ? "Photo ready" : "Voice ready"} — will send with next message</span>
                <button className="btn btn-sm" type="button" onClick={() => setPendingMedia(null)}>Clear</button>
              </div>
            )}
            <div className="composer">
              <div className="composer-tools">
                <label className="file-btn">Media<input type="file" accept="image/*" onChange={(e) => void onUploadImage(e.target.files?.[0] || null)} /></label>
                {canVoice && (
                  <button type="button" className={`btn btn-sm ${recording ? "btn-danger" : ""}`} onClick={() => void toggleVoiceRecord()}>{recording ? "Stop" : "Voice note"}</button>
                )}
              </div>
              <div className="composer-row">
                <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown} placeholder={callMode ? `Talk to ${persona.name}…` : `Message ${persona.name}…`} rows={2} disabled={busy} />
                <button className="send-btn" type="button" disabled={busy || (!input.trim() && !pendingMedia)} onClick={() => void send()}>Send</button>
              </div>
            </div>
          </section>
          <aside className="panel rightbar">
            <h2>Roleplays</h2>
            <div className="roleplay-list">
              <button type="button" className={`rp-btn ${!roleplayId ? "active" : ""}`} onClick={() => switchRoleplay(null)}>Free chat<small>No scripted scenario</small></button>
              {availableRoleplays.map((r) => (
                <button key={r.id} type="button" className={`rp-btn ${roleplayId === r.id ? "active" : ""}`} onClick={() => switchRoleplay(r.id)}>
                  {r.emoji} {r.title}
                  <small>{r.blurb}{r.minLevel > 1 ? ` · L${r.minLevel}+` : ""}</small>
                </button>
              ))}
            </div>
            <p className="muted" style={{ fontSize: "0.75rem" }}>
              Level 3 unlocks CNC / extreme roleplays, voice calls, and full unrestricted mode. Admin assigns your max level and credits.
            </p>
          </aside>
        </div>
        <p className="footer-note">Adults 18+ only · Characters 21+ · {cfg.messageCreditCost} credit / message · media and voice cost more</p>
      </div>
    </>
  );
}
