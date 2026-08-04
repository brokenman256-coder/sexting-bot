"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PERSONAS, type Persona } from "@/lib/personas";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "error";
  content: string;
};

const QUICK = [
  "tell me what you'd do to me",
  "be filthy",
  "tease me first",
  "don't hold back",
  "describe yourself right now",
  "come over",
];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function HomePage() {
  const [ageOk, setAgeOk] = useState<boolean | null>(null);
  const [personaId, setPersonaId] = useState("nova");
  const [intensity, setIntensity] = useState("unfiltered");
  const [userName, setUserName] = useState("");
  const [scenario, setScenario] = useState("");
  const [customDescription, setCustomDescription] = useState(
    "24, woman, long dark hair, sharp tongue, lingerie, dominant brat, loves dirty praise"
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const persona = useMemo(
    () => PERSONAS.find((p) => p.id === personaId) || PERSONAS[0],
    [personaId]
  );

  useEffect(() => {
    const v = localStorage.getItem("nightline_age_ok");
    setAgeOk(v === "1");
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const startChat = useCallback((p: Persona) => {
    setMessages([
      {
        id: uid(),
        role: "system",
        content: `Connected with ${p.name} · ${p.tagline} · adults only`,
      },
      {
        id: uid(),
        role: "assistant",
        content: p.greeting,
      },
    ]);
    startedRef.current = true;
  }, []);

  useEffect(() => {
    if (ageOk && !startedRef.current) {
      startChat(persona);
    }
  }, [ageOk, persona, startChat]);

  function acceptAge() {
    localStorage.setItem("nightline_age_ok", "1");
    setAgeOk(true);
  }

  function rejectAge() {
    localStorage.removeItem("nightline_age_ok");
    setAgeOk(false);
    window.location.href = "https://www.google.com";
  }

  function switchPersona(id: string) {
    setPersonaId(id);
    const p = PERSONAS.find((x) => x.id === id) || PERSONAS[0];
    startChat(p);
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
      const history = next
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          personaId,
          customDescription: personaId === "custom" ? customDescription : "",
          intensity,
          scenario,
          userName,
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
        const snapshot = full;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: snapshot } : m))
        );
      }

      if (!full.trim()) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "…" }
              : m
          )
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== assistantId || m.content),
        { id: uid(), role: "error", content: msg },
      ]);
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

  if (ageOk === null) {
    return <div className="gate" />;
  }

  if (!ageOk) {
    return (
      <div className="gate">
        <div className="gate-card">
          <div className="brand-mark" style={{ margin: "0 auto 14px" }}>
            💋
          </div>
          <h1>Nightline</h1>
          <p>
            Explicit AI sexting for <strong>adults 18+</strong> only. Graphic sexual
            content. No underage content. Confirm you are 18 or older to continue.
          </p>
          <div className="gate-actions">
            <button className="btn btn-primary" onClick={acceptAge} type="button">
              I am 18+ — enter
            </button>
            <button className="btn btn-danger" onClick={rejectAge} type="button">
              Leave
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">💋</div>
          <div>
            <h1>Nightline</h1>
            <span>Unfiltered adult chat · powered by Grok</span>
          </div>
        </div>
        <div className="badge">18+ · private · no soft filters</div>
      </header>

      <div className="layout">
        <aside className="panel sidebar">
          <h2>Who&apos;s texting</h2>
          <div className="persona-grid">
            {PERSONAS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`persona-card ${personaId === p.id ? "active" : ""}`}
                style={{ ["--persona-accent" as string]: p.accent }}
                onClick={() => switchPersona(p.id)}
              >
                <div className="persona-emoji">{p.emoji}</div>
                <div>
                  <strong>
                    {p.name} · {p.age}
                  </strong>
                  <small>{p.tagline}</small>
                </div>
              </button>
            ))}
          </div>

          {personaId === "custom" && (
            <div className="field">
              <label>Custom persona</label>
              <textarea
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder="Age 21+, looks, personality, kinks…"
              />
            </div>
          )}

          <div className="field">
            <label>Intensity</label>
            <div className="chip-row">
              {[
                ["unfiltered", "Unfiltered"],
                ["tease", "Tease / edge"],
                ["romantic", "Romantic + filthy"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`chip ${intensity === id ? "active" : ""}`}
                  onClick={() => setIntensity(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Your name (optional)</label>
            <input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="what should they call you"
            />
          </div>

          <div className="field">
            <label>Scenario (optional)</label>
            <textarea
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              placeholder="hotel room after drinks, long-distance call, boss/employee fantasy…"
            />
          </div>

          <button
            type="button"
            className="btn"
            onClick={() => startChat(persona)}
          >
            Reset chat
          </button>
        </aside>

        <section className="panel chat">
          <div className="chat-header">
            <div className="who">
              <strong>
                {persona.emoji} {persona.name}
              </strong>
              <span>{persona.bio}</span>
            </div>
            <button type="button" className="btn" onClick={() => startChat(persona)}>
              New thread
            </button>
          </div>

          <div className="messages">
            {messages.map((m) => (
              <div key={m.id} className={`msg ${m.role}`}>
                {m.content || (busy && m.role === "assistant" ? "…" : "")}
              </div>
            ))}
            {busy && <div className="typing">typing…</div>}
            <div ref={bottomRef} />
          </div>

          <div className="quick">
            {QUICK.map((q) => (
              <button key={q} type="button" disabled={busy} onClick={() => void send(q)}>
                {q}
              </button>
            ))}
          </div>

          <div className="composer">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={`Message ${persona.name}…`}
              rows={2}
              disabled={busy}
            />
            <button
              className="send-btn"
              type="button"
              disabled={busy || !input.trim()}
              onClick={() => void send()}
            >
              Send
            </button>
          </div>
        </section>
      </div>

      <p className="footer-note">
        Adults 18+ only. No underage content. Fantasy between consenting adults. Your
        messages go to the xAI API via your server key.
      </p>
    </div>
  );
}
