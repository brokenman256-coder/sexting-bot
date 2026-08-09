"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("/chat");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  // Avoid useSearchParams() — it causes a blank flash / CSR bailout on Netlify.
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      setNextPath(p.get("next") || "/chat");
    } catch {
      setNextPath("/chat");
    }
    setReady(true);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      // Full navigation is more reliable than router.push after cookie set
      window.location.href = nextPath || "/chat";
    } catch {
      setError("Network error — try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p className="sub">Log in to Nightline · 18+ AI companions</p>
        <div className="auth-tabs">
          <Link className="active" href="/login">
            Log in
          </Link>
          <Link href="/signup">Sign up</Link>
        </div>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
              disabled={busy}
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
              disabled={busy}
            />
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={busy || !ready}>
            {busy ? "Signing in…" : "Log in"}
          </button>
        </form>
        <div className="links-row">
          <Link href="/forgot-password">Forgot password?</Link>
          <Link href="/">Home</Link>
        </div>
      </div>
    </div>
  );
}
