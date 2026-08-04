"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  defaultAdminConfig,
  loadAdminConfig,
  saveAdminConfig,
  STORAGE_KEYS,
  type AdminConfig,
} from "@/lib/config";
import { PERSONAS } from "@/lib/personas";
import type { TalkLevel } from "@/lib/levels";

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [cfg, setCfg] = useState<AdminConfig>(defaultAdminConfig());

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEYS.adminSession) === "1") {
      setUnlocked(true);
    }
    setCfg(loadAdminConfig());
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOkMsg("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      sessionStorage.setItem(STORAGE_KEYS.adminSession, "1");
      setUnlocked(true);
      setOkMsg(data.message || "Unlocked");
    } catch {
      setError("Could not reach admin API");
    }
  }

  function updateLevel(idx: number, patch: Partial<TalkLevel>) {
    setCfg((c) => {
      const levels = c.levels.map((l, i) => (i === idx ? { ...l, ...patch } : l));
      return { ...c, levels };
    });
  }

  function save() {
    saveAdminConfig(cfg);
    setOkMsg("Saved. Chat will use these 3 levels immediately (this browser).");
  }

  function resetDefaults() {
    const d = defaultAdminConfig();
    setCfg(d);
    saveAdminConfig(d);
    setOkMsg("Reset to factory defaults.");
  }

  function logout() {
    sessionStorage.removeItem(STORAGE_KEYS.adminSession);
    setUnlocked(false);
    setPassword("");
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nightline-admin-config.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(file: File | null) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as AdminConfig;
      if (!parsed.levels || parsed.levels.length !== 3) {
        setError("Invalid config: need exactly 3 levels");
        return;
      }
      setCfg({ ...defaultAdminConfig(), ...parsed });
      saveAdminConfig({ ...defaultAdminConfig(), ...parsed });
      setOkMsg("Imported config.");
      setError("");
    } catch {
      setError("Could not import JSON");
    }
  }

  return (
    <>
      <div
        className="app-bg"
        style={{ backgroundImage: "url(/personas/jade.jpg)" }}
        aria-hidden
      />
      <div className="admin-wrap">
        <div className="topbar" style={{ marginBottom: 14 }}>
          <div className="brand">
            <img className="brand-avatar" src="/personas/nova.jpg" alt="" />
            <div>
              <h1>Nightline Admin</h1>
              <span>3 unrestricted talk levels · persona images</span>
            </div>
          </div>
          <div className="top-actions">
            <Link className="btn btn-sm" href="/">
              ← Back to chat
            </Link>
            {unlocked && (
              <button type="button" className="btn btn-sm" onClick={logout}>
                Lock
              </button>
            )}
          </div>
        </div>

        {!unlocked ? (
          <div className="admin-card" style={{ maxWidth: 420, margin: "40px auto" }}>
            <h2>Admin login</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
              Default password: <code>nightline-admin</code>
              <br />
              Change with env <code>ADMIN_PASSWORD</code> on Vercel.
            </p>
            <form onSubmit={login} className="admin-grid">
              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </div>
              {error && <p className="error-text">{error}</p>}
              <button className="btn btn-primary" type="submit">
                Unlock admin
              </button>
            </form>
          </div>
        ) : (
          <>
            {okMsg && <p className="success">{okMsg}</p>}
            {error && <p className="error-text">{error}</p>}

            <div className="admin-card">
              <h2>Site</h2>
              <div className="admin-grid">
                <div className="field">
                  <label>Site title</label>
                  <input
                    value={cfg.siteTitle}
                    onChange={(e) => setCfg({ ...cfg, siteTitle: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Welcome note</label>
                  <input
                    value={cfg.welcomeNote}
                    onChange={(e) => setCfg({ ...cfg, welcomeNote: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Default talk level</label>
                  <select
                    value={cfg.defaultLevelId}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        defaultLevelId: e.target.value as "1" | "2" | "3",
                      })
                    }
                  >
                    {cfg.levels.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="admin-card">
              <h2>3 unrestricted sexy talk levels</h2>
              <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: 0 }}>
                Edit the rules injected into the AI for each level. Level 3 is maximum
                freedom for consenting adults. Underage content is always blocked.
              </p>
              <div className="admin-grid">
                {cfg.levels.map((level, idx) => (
                  <div key={level.id} className="level-editor">
                    <h3 style={{ color: level.color }}>
                      Level {level.id}
                    </h3>
                    <div className="field">
                      <label>Name</label>
                      <input
                        value={level.name}
                        onChange={(e) => updateLevel(idx, { name: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Tagline</label>
                      <input
                        value={level.tagline}
                        onChange={(e) => updateLevel(idx, { tagline: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Color</label>
                      <input
                        type="color"
                        value={level.color}
                        onChange={(e) => updateLevel(idx, { color: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>AI rules (what the girl is allowed / pushed to say)</label>
                      <textarea
                        style={{ minHeight: 140 }}
                        value={level.rules}
                        onChange={(e) => updateLevel(idx, { rules: e.target.value })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-card">
              <h2>Persona image overrides (optional URLs)</h2>
              <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: 0 }}>
                Paste image URLs to replace default sexy portraits. Leave blank for
                built-in photos. Users can also upload any photo on the main chat.
              </p>
              <div className="admin-grid">
                {PERSONAS.filter((p) => p.id !== "custom").map((p) => (
                  <div key={p.id} className="field">
                    <label>
                      {p.name} image URL
                    </label>
                    <div className="row">
                      <img
                        src={cfg.personaImages[p.id] || p.image}
                        alt={p.name}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 10,
                          objectFit: "cover",
                        }}
                      />
                      <input
                        style={{ flex: 1 }}
                        value={cfg.personaImages[p.id] || ""}
                        placeholder={p.image}
                        onChange={(e) =>
                          setCfg({
                            ...cfg,
                            personaImages: {
                              ...cfg.personaImages,
                              [p.id]: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-card">
              <div className="row">
                <button type="button" className="btn btn-primary" onClick={save}>
                  Save all settings
                </button>
                <button type="button" className="btn" onClick={resetDefaults}>
                  Reset defaults
                </button>
                <button type="button" className="btn" onClick={exportJson}>
                  Export JSON
                </button>
                <label className="btn" style={{ cursor: "pointer" }}>
                  Import JSON
                  <input
                    type="file"
                    accept="application/json"
                    hidden
                    onChange={(e) => void importJson(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
