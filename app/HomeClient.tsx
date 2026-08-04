"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PERSONAS, type Persona } from "@/lib/personas";
import { loadAdminConfig, STORAGE_KEYS, type AdminConfig } from "@/lib/config";
import type { TalkLevel } from "@/lib/levels";

type ChatMessage = { id: string; role: "user" | "assistant" | "system" | "error"; content: string };

const QUICK = ["tell me what you'd do to me", "be filthy", "send me that vibe", "don't hold back", "describe yourself right now", "come closer"];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

export default function HomePage() {
  const [ageOk, setAgeOk] = useState<boolean | null>(null);
  const [cfg, setCfg] = useState<AdminConfig | null>(null);
  const [personaId, setPersonaId] = useState("nova");
  const [levelId, setLevelId] = useState<"1" | "2" | "3">("3");
  const [userName, setUserName] = useState("");
  const [scenario, setScenario] = useState("");
  const [customDescription, setCustomDescription] = useState("24, insanely hot, long hair, perfect body, lingerie, filthy mouth, obsessed with me");
  const [customBg, setCustomBg] = useState<string | null>(null);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    setAgeOk(localStorage.getItem(STORAGE_KEYS.ageOk) === "1");
    const c = loadAdminConfig();
    setCfg(c);
    setLevelId(c.defaultLevelId);
    const bg = localStorage.getItem(STORAGE_KEYS.customBg);
    const av = localStorage.getItem(STORAGE_KEYS.customAvatar);
    if (bg) setCustomBg(bg);
    if (av) setCustomAvatar(av);
  }, []);

  const levels: TalkLevel[] = cfg?.levels || [];
  const persona = useMemo(() => {
    const p = PERSONAS.find((x) => x.id === personaId) || PERSONAS[0];
    const override = cfg?.personaImages?.[p.id];
    const image = p.id === "custom" && customAvatar ? customAvatar : override || p.image;
    return { ...p, image };
  }, [personaId, cfg, customAvatar]);
  const bgImage = customBg || persona.image;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  const startChat = useCallback((p: Persona, level?: TalkLevel) => {
    const lvl = level || levels.find((l) => l.id === levelId);
    setMessages([
      { id: uid(), role: "system", content: `Connected with ${p.name} · ${lvl?.name || "chat"} · adults only` },
      { id: uid(), role: "assistant", content: p.greeting },
    ]);
    startedRef.current = true;
  }, [levelId, levels]);

  useEffect(() => {
    if (ageOk && cfg && !startedRef.current) startChat(persona);
  }, [ageOk, cfg, persona, startChat]);

  function acceptAge() {
    localStorage.setItem(STORAGE_KEYS.ageOk, "1");
    setAgeOk(true);
  }

  function switchPersona(id: string) {
    setPersonaId(id);
    const p = PERSONAS.find((x) => x.id === id) || PERSONAS[0];
    const image = id === "custom" && customAvatar ? customAvatar : cfg?.personaImages?.[id] || p.image;
    startChat({ ...p, image });
  }

  function switchLevel(id: "1" | "2" | "3") {
    setLevelId(id);
    setMessages((m) => [...m, { id: uid(), role: "system", content: `Talk level set to ${levels.find((l) => l.id === id)?.name || id}` }]);
  }

  async function onUploadBg(file: File | null) {
    if (!file || !file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) return;
    const data = await readFileAsDataUrl(file);
    setCustomBg(data);
    localStorage.setItem(STORAGE_KEYS.customBg, data);
  }

  async function onUploadAvatar(file: File | null) {
    if (!file || !file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) return;
    const data = await readFileAsDataUrl(file);
    setCustomAvatar(data);
    setCustomBg(data);
    localStorage.setItem(STORAGE_KEYS.customAvatar, data);
    localStorage.setItem(STORAGE_KEYS.customBg, data);
    setPersonaId("custom");
    startChat({ ...PERSONAS.find((x) => x.id === "custom")!, image: data });
  }

  function clearCustomPhotos() {
    setCustomBg(null);
    setCustomAvatar(null);
    localStorage.removeItem(STORAGE_KEYS.customBg);
    localStorage.removeItem(STORAGE_KEYS.customAvatar);
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    const userMsg: ChatMessage = { id: uid(), role: "user", content };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setBusy(true);
    const assistantId = uid();
    setMessages((m) => [...m, { id: assistantId, role: "assistant", content: "" }]);
    try {
      const history = next.filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
      const level = levels.find((l) => l.id === levelId);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, personaId, customDescription: personaId === "custom" ? customDescription : "", levelId, levelRules: level?.rules || "", scenario, userName }),
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
        const snap = full;
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: snap } : m)));
      }
      if (!full.trim()) setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: "…" } : m)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) => [...prev.filter((m) => m.id !== assistantId || m.content), { id: uid(), role: "error", content: msg }]);
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
  }

  if (ageOk === null || !cfg) return <div className="gate" />;

  if (!ageOk) {
    return (
      <div className="gate">
        <div className="gate-card">
          <img src="/personas/nova.jpg" alt="" style={{ width: 88, height: 88, borderRadius: 20, objectFit: "cover", marginBottom: 12, border: "2px solid rgba(255,77,141,0.5)" }} />
          <h1>{cfg.siteTitle}</h1>
          <p>Explicit AI girl chat for <strong>adults 18+</strong>. Sexy photos, custom backgrounds, 3 unrestricted talk levels. No underage content.</p>
          <div className="gate-actions">
            <button className="btn btn-primary" type="button" onClick={acceptAge}>I am 18+ — enter</button>
            <button className="btn btn-danger" type="button" onClick={() => { window.location.href = "https://www.google.com"; }}>Leave</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="app-bg" style={{ backgroundImage: `url(${bgImage})` }} aria-hidden />
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
            <span className="badge">18+ · level {levelId}</span>
            <Link className="btn btn-sm" href="/admin">Admin</Link>
          </div>
        </header>
        <div className="layout">
          <aside className="panel sidebar">
            <h2>Pick a girl</h2>
            <div className="persona-grid">
              {PERSONAS.map((p) => {
                const img = p.id === "custom" && customAvatar ? customAvatar : cfg.personaImages[p.id] || p.image;
                return (
                  <button key={p.id} type="button" className={`persona-card ${personaId === p.id ? "active" : ""}`} style={{ ["--persona-accent" as string]: p.accent }} onClick={() => switchPersona(p.id)}>
                    <img src={img} alt={p.name} />
                    <div>
                      <strong>{p.name} · {p.age}</strong>
                      <small>{p.tagline}</small>
                    </div>
                  </button>
                );
              })}
            </div>
            <h2>Talk level (admin-tunable)</h2>
            <div className="level-grid">
              {levels.map((l) => (
                <button key={l.id} type="button" className={`level-btn ${levelId === l.id ? "active" : ""}`} style={{ ["--lvl" as string]: l.color }} onClick={() => switchLevel(l.id)}>
                  <strong>{l.name}</strong>
                  <small>{l.tagline}</small>
                </button>
              ))}
            </div>
            <h2>Your photo = background</h2>
            <label className="file-btn">
              Upload any photo (background)
              <input type="file" accept="image/*" onChange={(e) => void onUploadBg(e.target.files?.[0] || null)} />
            </label>
            <label className="file-btn">
              Upload girl photo (custom persona + bg)
              <input type="file" accept="image/*" onChange={(e) => void onUploadAvatar(e.target.files?.[0] || null)} />
            </label>
            {(customBg || customAvatar) && (
              <>
                <img className="preview-thumb" src={customAvatar || customBg || ""} alt="Custom" />
                <button type="button" className="btn btn-sm" onClick={clearCustomPhotos}>Clear custom photos</button>
              </>
            )}
            {personaId === "custom" && (
              <div className="field">
                <label>Describe your custom girl</label>
                <textarea value={customDescription} onChange={(e) => setCustomDescription(e.target.value)} placeholder="Age 21+, looks, personality, kinks…" />
              </div>
            )}
            <div className="field">
              <label>Your name (optional)</label>
              <input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="what she calls you" />
            </div>
            <div className="field">
              <label>Scenario (optional)</label>
              <textarea value={scenario} onChange={(e) => setScenario(e.target.value)} placeholder="hotel after drinks, video call, ex texts you…" />
            </div>
            <button type="button" className="btn" onClick={() => startChat(persona)}>Reset chat</button>
          </aside>
          <section className="panel chat">
            <div className="chat-header">
              <div className="who">
                <img src={persona.image} alt={persona.name} />
                <div>
                  <strong>{persona.name} · {persona.age}</strong>
                  <span>{persona.bio}</span>
                </div>
              </div>
              <button type="button" className="btn btn-sm" onClick={() => startChat(persona)}>New thread</button>
            </div>
            <div className="messages">
              {messages.map((m) => (
                <div key={m.id} className={`msg ${m.role}`}>{m.content || (busy && m.role === "assistant" ? "…" : "")}</div>
              ))}
              {busy && <div className="typing">typing…</div>}
              <div ref={bottomRef} />
            </div>
            <div className="quick">
              {QUICK.map((q) => (
                <button key={q} type="button" disabled={busy} onClick={() => void send(q)}>{q}</button>
              ))}
            </div>
            <div className="composer">
              <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown} placeholder={`Message ${persona.name}…`} rows={2} disabled={busy} />
              <button className="send-btn" type="button" disabled={busy || !input.trim()} onClick={() => void send()}>Send</button>
            </div>
          </section>
        </div>
        <p className="footer-note">Adults 18+ only. Upload your own photo for the background. Admin can edit the 3 unrestricted talk levels. No underage content.</p>
      </div>
    </>
  );
}
