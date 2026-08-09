"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type {
  PasswordResetRequest,
  PublicUser,
  SiteConfig,
  UserLevel,
} from "@/lib/types";

type AdminChat = {
  id: string;
  userId: string;
  personaId: string;
  title: string;
  levelId: number;
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
  personaId: string;
  displayName: string;
  email: string;
  lastMessage: string;
  updatedAt: string;
  personaName?: string;
  personaImage?: string;
};

type LogMsg = {
  id: string;
  role: string;
  content: string;
  mediaType?: string | null;
  createdAt: string;
};

type Tab = "users" | "live" | "history" | "config" | "resets";

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [email, setEmail] = useState("brokenman256@gmail.com");
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
    setConfig(data.config);
    setResets(data.resets || []);
  }, []);

  const loadChatLog = useCallback(async (chatId: string) => {
    setSelectedChatId(chatId);
    const res = await fetch(`/api/admin/live?chatId=${encodeURIComponent(chatId)}`);
    if (!res.ok) {
      const res2 = await fetch(`/api/admin/chats?chatId=${encodeURIComponent(chatId)}`);
      if (res2.ok) {
        const d = await res2.json();
        setLog(d.messages || []);
      }
      return;
    }
    const data = await res.json();
    setLog(data.messages || []);
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    void loadUsers();
    void loadLive();
    void loadChats();
    void loadConfig();
  }, [unlocked, loadUsers, loadLive, loadChats, loadConfig]);

  // poll live every 4s
  useEffect(() => {
    if (!unlocked || tab !== "live") return;
    const t = setInterval(() => {
      void loadLive();
      if (selectedChatId) void loadChatLog(selectedChatId);
    }, 4000);
    return () => clearInterval(t);
  }, [unlocked, tab, selectedChatId, loadLive, loadChatLog]);

  async function login(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      setUnlocked(true);
      setOkMsg(data.message || "Unlocked");
    } catch {
      setError("Could not reach admin API");
    }
  }

  async function patchUser(
    userId: string,
    body: Record<string, unknown>
  ) {
    setOkMsg("");
    setError("");
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
    void loadUsers();
  }

  async function saveConfig() {
    if (!config) return;
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
      <div className="admin-wrap">
        <div className="admin-card" style={{ maxWidth: 420, margin: "40px auto" }}>
          <h2>Staff login</h2>
          <p className="muted">Authorized staff only</p>
          <form onSubmit={login} className="admin-grid">
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary" type="submit">
              Unlock dashboard
            </button>
          </form>
          <p style={{ marginTop: 12 }}>
            <Link href="/">Back</Link>
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
            <Link className="btn btn-sm" href="/chat">
              Open chat
            </Link>
            <Link className="btn btn-sm" href="/">
              Home
            </Link>
          </div>
        </div>
        {okMsg && <p className="success">{okMsg}</p>}
        {error && <p className="error-text">{error}</p>}

        <div className="admin-tabs">
          {(
            [
              ["users", "Users · credits · levels"],
              ["live", "Live chats"],
              ["history", "Chat history"],
              ["config", "Site · levels"],
              ["resets", "Password resets"],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "users" && (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Credits</th>
                  <th>Level</th>
                  <th>God Mode</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.displayName}</strong>
                      <br />
                      <span className="muted">{u.email}</span>
                      <br />
                      <span className="muted">{u.role}</span>
                    </td>
                    <td>
                      <div className="row">
                        <strong>{u.credits}</strong>
                        <input
                          className="inline-input"
                          placeholder="+/-"
                          value={creditDraft[u.id] || ""}
                          onChange={(e) =>
                            setCreditDraft((d) => ({ ...d, [u.id]: e.target.value }))
                          }
                        />
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => {
                            const n = Number(creditDraft[u.id]);
                            if (!Number.isFinite(n)) return;
                            void patchUser(u.id, { addCredits: n });
                          }}
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => {
                            const n = Number(creditDraft[u.id]);
                            if (!Number.isFinite(n) || n < 0) return;
                            void patchUser(u.id, { credits: n });
                          }}
                        >
                          Set
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="row">
                        <select
                          className="inline-input"
                          style={{ width: 70 }}
                          value={levelDraft[u.id] ?? String(u.level)}
                          onChange={(e) =>
                            setLevelDraft((d) => ({ ...d, [u.id]: e.target.value }))
                          }
                        >
                          <option value="1">L1</option>
                          <option value="2">L2</option>
                          <option value="3">L3</option>
                        </select>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() =>
                            void patchUser(u.id, {
                              level: Number(levelDraft[u.id] ?? u.level) as UserLevel,
                            })
                          }
                        >
                          Save
                        </button>
                      </div>
                      <small className="muted">L3 = full unrestricted</small>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`btn btn-sm ${u.godMode ? "btn-primary" : ""}`}
                        title="Companion worships user and obeys any adult request"
                        onClick={() =>
                          void patchUser(u.id, {
                            godMode: !u.godMode,
                            // God Mode users should also sit at L3
                            ...( !u.godMode ? { level: 3 } : {}),
                          })
                        }
                      >
                        {u.godMode ? "⚡ GOD ON" : "God off"}
                      </button>
                      <div className="muted" style={{ fontSize: "0.7rem", marginTop: 4 }}>
                        worship + zero refusal
                      </div>
                    </td>
                    <td>{u.banned ? "🚫 banned" : "✅ active"}</td>
                    <td>
                      <div className="row">
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => void patchUser(u.id, { banned: !u.banned })}
                        >
                          {u.banned ? "Unban" : "Ban"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => {
                            const pw = prompt("New password (min 6 chars)");
                            if (pw && pw.length >= 6) void patchUser(u.id, { password: pw });
                          }}
                        >
                          Set password
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => {
                            setTab("history");
                            void loadChats(u.id);
                          }}
                        >
                          Chats
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!users.length && <p className="muted">No users yet. They appear after signup.</p>}
          </div>
        )}

        {tab === "live" && (
          <div className="layout" style={{ gridTemplateColumns: "1fr 1.2fr", maxHeight: "none" }}>
            <div>
              <p className="muted">Active in last 5 minutes · auto-refresh</p>
              {live.map((s) => (
                <div
                  key={s.userId + s.chatId}
                  className={`live-card ${selectedChatId === s.chatId ? "active" : ""}`}
                  onClick={() => void loadChatLog(s.chatId)}
                >
                  <strong>
                    {s.displayName} · {s.personaName}
                  </strong>
                  <div className="muted" style={{ fontSize: "0.78rem" }}>
                    {s.email}
                  </div>
                  <div style={{ marginTop: 6, fontSize: "0.85rem" }}>
                    {s.lastMessage || "…"}
                  </div>
                  <div className="muted" style={{ fontSize: "0.72rem", marginTop: 4 }}>
                    {new Date(s.updatedAt).toLocaleString()}
                  </div>
                </div>
              ))}
              {!live.length && <p className="muted">No live sessions right now.</p>}
              <button type="button" className="btn btn-sm" onClick={() => void loadLive()}>
                Refresh
              </button>
            </div>
            <div>
              <h3 style={{ marginTop: 0 }}>Live thread</h3>
              <div className="chat-log">
                {log.map((m) => (
                  <div key={m.id} className="line">
                    <div className="role">
                      {m.role} · {new Date(m.createdAt).toLocaleTimeString()}
                      {m.mediaType ? ` · ${m.mediaType}` : ""}
                    </div>
                    <div>{m.content}</div>
                  </div>
                ))}
                {!log.length && <p className="muted">Select a live session</p>}
              </div>
            </div>
          </div>
        )}

        {tab === "history" && (
          <div className="layout" style={{ gridTemplateColumns: "1fr 1.2fr", maxHeight: "none" }}>
            <div>
              <button type="button" className="btn btn-sm" onClick={() => void loadChats()}>
                Load all chats
              </button>
              <div style={{ marginTop: 10 }}>
                {chats.map((c) => (
                  <div
                    key={c.id}
                    className={`live-card ${selectedChatId === c.id ? "active" : ""}`}
                    onClick={() => void loadChatLog(c.id)}
                  >
                    <strong>
                      {c.userName || c.userId} · {c.personaName || c.personaId}
                    </strong>
                    <div className="muted" style={{ fontSize: "0.78rem" }}>
                      {c.userEmail} · L{c.levelId} · {c.messageCount} msgs
                    </div>
                    <div style={{ fontSize: "0.85rem", marginTop: 4 }}>
                      {(c.preview || "").slice(0, 120)}
                    </div>
                    <div className="muted" style={{ fontSize: "0.72rem" }}>
                      {new Date(c.lastMessageAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 style={{ marginTop: 0 }}>History</h3>
              <div className="chat-log">
                {log.map((m) => (
                  <div key={m.id} className="line">
                    <div className="role">
                      {m.role} · {new Date(m.createdAt).toLocaleString()}
                    </div>
                    <div>{m.content}</div>
                  </div>
                ))}
                {!log.length && <p className="muted">Pick a chat</p>}
              </div>
            </div>
          </div>
        )}

        {tab === "config" && config && (
          <div className="admin-grid">
            <div className="field">
              <label>Site title</label>
              <input
                value={config.siteTitle}
                onChange={(e) => setConfig({ ...config, siteTitle: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Welcome note</label>
              <input
                value={config.welcomeNote}
                onChange={(e) => setConfig({ ...config, welcomeNote: e.target.value })}
              />
            </div>
            <div className="row">
              <div className="field">
                <label>Default credits (new users)</label>
                <input
                  type="number"
                  value={config.defaultCredits}
                  onChange={(e) =>
                    setConfig({ ...config, defaultCredits: Number(e.target.value) })
                  }
                />
              </div>
              <div className="field">
                <label>Default level</label>
                <select
                  value={config.defaultLevel}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      defaultLevel: Number(e.target.value) as UserLevel,
                    })
                  }
                >
                  <option value={1}>1 Tease</option>
                  <option value={2}>2 Explicit</option>
                  <option value={3}>3 No Limits</option>
                </select>
              </div>
              <div className="field">
                <label>Msg cost</label>
                <input
                  type="number"
                  value={config.messageCreditCost}
                  onChange={(e) =>
                    setConfig({ ...config, messageCreditCost: Number(e.target.value) })
                  }
                />
              </div>
              <div className="field">
                <label>Voice cost</label>
                <input
                  type="number"
                  value={config.voiceCreditCost}
                  onChange={(e) =>
                    setConfig({ ...config, voiceCreditCost: Number(e.target.value) })
                  }
                />
              </div>
              <div className="field">
                <label>Media cost</label>
                <input
                  type="number"
                  value={config.mediaCreditCost}
                  onChange={(e) =>
                    setConfig({ ...config, mediaCreditCost: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <label className="age-check">
              <input
                type="checkbox"
                checked={config.allowSignup}
                onChange={(e) => setConfig({ ...config, allowSignup: e.target.checked })}
              />
              Allow public signups
            </label>

            {config.levels.map((lvl, i) => (
              <div key={lvl.id} className="admin-card" style={{ marginBottom: 8 }}>
                <h3 style={{ margin: "0 0 8px" }}>
                  Level {lvl.id}: {lvl.name}
                </h3>
                <div className="field">
                  <label>Name</label>
                  <input
                    value={lvl.name}
                    onChange={(e) => {
                      const levels = [...config.levels];
                      levels[i] = { ...lvl, name: e.target.value };
                      setConfig({ ...config, levels });
                    }}
                  />
                </div>
                <div className="field">
                  <label>Tagline</label>
                  <input
                    value={lvl.tagline}
                    onChange={(e) => {
                      const levels = [...config.levels];
                      levels[i] = { ...lvl, tagline: e.target.value };
                      setConfig({ ...config, levels });
                    }}
                  />
                </div>
                <div className="field">
                  <label>AI rules (system prompt injection)</label>
                  <textarea
                    rows={5}
                    value={lvl.rules}
                    onChange={(e) => {
                      const levels = [...config.levels];
                      levels[i] = { ...lvl, rules: e.target.value };
                      setConfig({ ...config, levels });
                    }}
                  />
                </div>
              </div>
            ))}

            <button type="button" className="btn btn-primary" onClick={() => void saveConfig()}>
              Save config
            </button>
          </div>
        )}

        {tab === "resets" && (
          <div className="table-wrap">
            <p className="muted">
              Forgot-password tokens. You can also set a password directly on the Users tab.
            </p>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Token</th>
                  <th>Expires</th>
                  <th>Used</th>
                </tr>
              </thead>
              <tbody>
                {resets.map((r) => (
                  <tr key={r.id}>
                    <td>{r.email}</td>
                    <td style={{ wordBreak: "break-all", maxWidth: 240 }}>
                      <code>{r.token}</code>
                    </td>
                    <td>{new Date(r.expiresAt).toLocaleString()}</td>
                    <td>{r.used ? "yes" : "no"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!resets.length && <p className="muted">No reset requests yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
