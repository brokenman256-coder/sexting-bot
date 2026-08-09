"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { PasswordResetRequest, PublicUser, SiteConfig, UserLevel } from "@/lib/types";

type AdminChat = {
  id: string;
  userId: string;
  title: string;
  lastMessageAt: string;
  userEmail?: string;
  userName?: string;
  personaName?: string;
  messageCount?: number;
  preview?: string;
};

type LiveSession = {
  userId: string;
  chatId: string;
  displayName: string;
  email: string;
  lastMessage: string;
  updatedAt: string;
  personaName?: string;
};

type LogMsg = { id: string; role: string; content: string; createdAt: string };
type Tab = "users" | "live" | "history" | "config" | "resets";

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [live, setLive] = useState<LiveSession[]>([]);
  const [chats, setChats] = useState<AdminChat[]>([]);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [resets, setResets] = useState<PasswordResetRequest[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [log, setLog] = useState<LogMsg[]>([]);
  const [creditDraft, setCreditDraft] = useState<Record<string, string>>({});
  const [levelDraft, setLevelDraft] = useState<Record<string, string>>({});

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (!res.ok) return;
    const data = await res.json();
    setUsers(data.users || []);
  }, []);

  const loadLive = useCallback(async () => {
    const res = await fetch("/api/admin/live");
    if (!res.ok) return;
    const data = await res.json();
    setLive(data.sessions || []);
  }, []);

  const loadChats = useCallback(async (userId?: string) => {
    const q = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    const res = await fetch(`/api/admin/chats${q}`);
    if (!res.ok) return;
    const data = await res.json();
    setChats(data.chats || []);
  }, []);

  const loadConfig = useCallback(async () => {
    const res = await fetch("/api/admin/config");
    if (!res.ok) return;
    const data = await res.json();
    setConfig(data.config || null);
    setResets(data.resets || []);
  }, []);

  const loadLog = useCallback(async (chatId: string) => {
    setSelectedChatId(chatId);
    const res = await fetch(`/api/admin/chats?chatId=${encodeURIComponent(chatId)}`);
    if (!res.ok) return;
    const data = await res.json();
    setLog(data.messages || []);
  }, []);

  async function unlock(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Wrong password");
      return;
    }
    setUnlocked(true);
    await Promise.all([loadUsers(), loadLive(), loadChats(), loadConfig()]);
  }

  useEffect(() => {
    if (!unlocked) return;
    const t = setInterval(() => {
      if (tab === "live") void loadLive();
    }, 4000);
    return () => clearInterval(t);
  }, [unlocked, tab, loadLive]);

  async function patchUser(userId: string, body: Record<string, unknown>) {
    setError("");
    setOkMsg("");
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...body }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Update failed");
      return;
    }
    setOkMsg("User updated");
    await loadUsers();
  }

  async function saveConfig() {
    if (!config) return;
    setError("");
    const res = await fetch("/api/admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Save failed");
      return;
    }
    setOkMsg("Config saved");
    setConfig(data.config);
  }

  if (!unlocked) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Admin</h1>
          <p className="sub">Enter ADMIN_PASSWORD to unlock the dashboard.</p>
          <form onSubmit={unlock}>
            <div className="field">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary" type="submit">Unlock dashboard</button>
          </form>
          <p style={{ marginTop: 12 }}>
            <Link href="/">Back</Link> · <Link href="/chat">Chat</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-wrap">
      <div className="admin-card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>Nightline Admin</h2>
          <div className="row">
            <Link className="btn btn-sm" href="/chat">Open chat</Link>
            <Link className="btn btn-sm" href="/">Home</Link>
          </div>
        </div>
        {okMsg && <p className="success">{okMsg}</p>}
        {error && <p className="error-text">{error}</p>}
        <div className="admin-tabs">
          {([
            ["users", "Users"],
            ["live", "Live"],
            ["history", "History"],
            ["config", "Config"],
            ["resets", "Resets"],
          ] as [Tab, string][]).map(([id, label]) => (
            <button key={id} type="button" className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>

        {tab === "users" && (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>User</th><th>Credits</th><th>Level</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.displayName}</strong><br />
                      <span className="muted">{u.email}</span>
                    </td>
                    <td>
                      <div className="row">
                        <strong>{u.credits}</strong>
                        <input className="inline-input" placeholder="+/-" value={creditDraft[u.id] || ""}
                          onChange={(e) => setCreditDraft((d) => ({ ...d, [u.id]: e.target.value }))} />
                        <button type="button" className="btn btn-sm" onClick={() => {
                          const n = Number(creditDraft[u.id]);
                          if (Number.isFinite(n)) void patchUser(u.id, { addCredits: n });
                        }}>Add</button>
                        <button type="button" className="btn btn-sm" onClick={() => {
                          const n = Number(creditDraft[u.id]);
                          if (Number.isFinite(n) && n >= 0) void patchUser(u.id, { credits: n });
                        }}>Set</button>
                      </div>
                    </td>
                    <td>
                      <div className="row">
                        <select className="inline-input" style={{ width: 70 }}
                          value={levelDraft[u.id] ?? String(u.level)}
                          onChange={(e) => setLevelDraft((d) => ({ ...d, [u.id]: e.target.value }))}>
                          <option value="1">L1</option>
                          <option value="2">L2</option>
                          <option value="3">L3</option>
                        </select>
                        <button type="button" className="btn btn-sm" onClick={() =>
                          void patchUser(u.id, { level: Number(levelDraft[u.id] ?? u.level) as UserLevel })
                        }>Save</button>
                      </div>
                    </td>
                    <td>{u.banned ? "banned" : "active"}</td>
                    <td>
                      <button type="button" className="btn btn-sm" onClick={() => void patchUser(u.id, { banned: !u.banned })}>
                        {u.banned ? "Unban" : "Ban"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "live" && (
          <div>
            <p className="muted">Auto-refreshes every 4s</p>
            {live.length === 0 && <p className="muted">No live sessions</p>}
            {live.map((s) => (
              <div key={s.userId + s.chatId} className={`live-card ${selectedChatId === s.chatId ? "active" : ""}`}
                onClick={() => void loadLog(s.chatId)}>
                <strong>{s.displayName}</strong> · {s.personaName || "chat"}
                <div className="muted">{s.email}</div>
                <div>{s.lastMessage}</div>
              </div>
            ))}
            {selectedChatId && (
              <div className="chat-log" style={{ marginTop: 12 }}>
                {log.map((m) => (
                  <div key={m.id} className="line">
                    <div className="role">{m.role}</div>
                    <div>{m.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "history" && (
          <div>
            <button type="button" className="btn btn-sm" onClick={() => void loadChats()}>Refresh</button>
            {chats.map((c) => (
              <div key={c.id} className="live-card" onClick={() => void loadLog(c.id)}>
                <strong>{c.title}</strong> · {c.userName || c.userEmail}
                <div className="muted">{c.preview}</div>
              </div>
            ))}
            {selectedChatId && (
              <div className="chat-log" style={{ marginTop: 12 }}>
                {log.map((m) => (
                  <div key={m.id} className="line">
                    <div className="role">{m.role}</div>
                    <div>{m.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "config" && config && (
          <div className="admin-grid">
            <div className="field">
              <label>Site title</label>
              <input value={config.siteTitle} onChange={(e) => setConfig({ ...config, siteTitle: e.target.value })} />
            </div>
            <div className="field">
              <label>Welcome note</label>
              <textarea value={config.welcomeNote} onChange={(e) => setConfig({ ...config, welcomeNote: e.target.value })} />
            </div>
            <div className="field">
              <label>Default credits</label>
              <input type="number" value={config.defaultCredits}
                onChange={(e) => setConfig({ ...config, defaultCredits: Number(e.target.value) })} />
            </div>
            <label className="age-check">
              <input type="checkbox" checked={config.allowSignup}
                onChange={(e) => setConfig({ ...config, allowSignup: e.target.checked })} />
              <span>Allow signups</span>
            </label>
            <button type="button" className="btn btn-primary" onClick={() => void saveConfig()}>Save config</button>
          </div>
        )}

        {tab === "resets" && (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Email</th><th>Token</th><th>Expires</th><th>Used</th></tr>
              </thead>
              <tbody>
                {resets.map((r) => (
                  <tr key={r.id}>
                    <td>{r.email}</td>
                    <td style={{ wordBreak: "break-all" }}><code>{r.token}</code></td>
                    <td>{r.expiresAt}</td>
                    <td>{r.used ? "yes" : "no"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
