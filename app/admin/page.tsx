"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { defaultAdminConfig, loadAdminConfig, saveAdminConfig, STORAGE_KEYS, type AdminConfig } from "@/lib/config";

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [cfg, setCfg] = useState<AdminConfig>(defaultAdminConfig());
  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEYS.adminSession) === "1") setUnlocked(true);
    setCfg(loadAdminConfig());
  }, []);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed"); return; }
      sessionStorage.setItem(STORAGE_KEYS.adminSession, "1");
      setUnlocked(true);
      setOkMsg(data.message || "Unlocked");
    } catch { setError("Could not reach admin API"); }
  }
  function save() { saveAdminConfig(cfg); setOkMsg("Saved."); }
  if (!unlocked) {
    return (
      <div className="admin-wrap">
        <div className="admin-card" style={{ maxWidth: 420, margin: "40px auto" }}>
          <h2>Admin login</h2>
          <p style={{ color: "var(--muted)" }}>Default: nightline-admin</p>
          <form onSubmit={login} className="admin-grid">
            <div className="field"><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} /></div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary" type="submit">Unlock</button>
          </form>
          <p style={{ marginTop: 12 }}><Link href="/">Back to chat</Link></p>
        </div>
      </div>
    );
  }
  return (
    <div className="admin-wrap">
      <div className="admin-card">
        <h2>Nightline Admin</h2>
        {okMsg && <p className="success">{okMsg}</p>}
        <div className="field"><label>Site title</label><input value={cfg.siteTitle} onChange={e=>setCfg({...cfg, siteTitle: e.target.value})} /></div>
        <div className="field"><label>Welcome note</label><input value={cfg.welcomeNote} onChange={e=>setCfg({...cfg, welcomeNote: e.target.value})} /></div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn btn-primary" type="button" onClick={save}>Save</button>
          <Link className="btn" href="/">Back to chat</Link>
        </div>
      </div>
    </div>
  );
}
