"use client";
import Link from "next/link";
import { useState } from "react";
import { PERSONAS } from "@/lib/personas";
import { DEFAULT_LEVELS } from "@/lib/levels";

export default function Home() {
  const [ageOk, setAgeOk] = useState(false);
  const [personaId, setPersonaId] = useState("nova");
  const [levelId, setLevelId] = useState("3");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{role:string;content:string}[]>([]);
  const [busy, setBusy] = useState(false);
  const persona = PERSONAS.find(p=>p.id===personaId) || PERSONAS[0];

  if (!ageOk) {
    return (
      <div className="gate">
        <div className="gate-card">
          <h1>Nightline</h1>
          <p>18+ only. Unfiltered AI girl chat.</p>
          <div className="gate-actions">
            <button className="btn btn-primary" onClick={()=>setAgeOk(true)}>I am 18+</button>
          </div>
        </div>
      </div>
    );
  }

  async function send() {
    if (!input.trim() || busy) return;
    const next = [...messages, {role:"user", content: input.trim()}];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ messages: next, personaId, levelId }),
      });
      const text = await res.text();
      setMessages(m => [...m, {role:"assistant", content: text}]);
    } catch (e) {
      setMessages(m => [...m, {role:"assistant", content: "Error: "+String(e)}]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">
          <img className="brand-avatar" src={persona.image} alt="" />
          <div><h1>Nightline</h1><span>{persona.name} \u00b7 Level {levelId}</span></div>
        </div>
        <div className="top-actions">
          <Link className="btn btn-sm" href="/admin">Admin</Link>
        </div>
      </div>
      <div className="layout">
        <aside className="panel sidebar">
          <h2>Girls</h2>
          <div className="persona-grid">
            {PERSONAS.filter(p=>p.id!=="custom").map(p=>(
              <button key={p.id} className={"persona-card"+(p.id===personaId?" active":"")} onClick={()=>setPersonaId(p.id)}>
                <img src={p.image} alt="" /><div><strong>{p.name}</strong><small>{p.tagline}</small></div>
              </button>
            ))}
          </div>
          <h2>Talk level</h2>
          <div className="level-grid">
            {DEFAULT_LEVELS.map(l=>(
              <button key={l.id} className={"level-btn"+(l.id===levelId?" active":"")} style={{"--lvl":l.color} as any} onClick={()=>setLevelId(l.id)}>
                <strong>{l.name}</strong><small>{l.tagline}</small>
              </button>
            ))}
          </div>
        </aside>
        <section className="panel chat">
          <div className="chat-header">
            <div className="who"><img src={persona.image} alt="" /><div><strong>{persona.name}</strong><span>{persona.bio}</span></div></div>
          </div>
          <div className="messages">
            {messages.length===0 && <div className="msg system">{persona.greeting}</div>}
            {messages.map((m,i)=>(<div key={i} className={"msg "+m.role}>{m.content}</div>))}
          </div>
          <div className="composer">
            <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="Type something filthy..." onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void send();}}} />
            <button className="send-btn" disabled={busy} onClick={()=>void send()}>{busy?"...":"Send"}</button>
          </div>
        </section>
      </div>
      <p className="footer-note">18+ only \u00b7 Adults only \u00b7 Set XAI_API_KEY on Vercel</p>
    </div>
  );
}
