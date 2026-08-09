"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [ageOk, setAgeOk] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!ageOk) {
      setError("You must confirm you are 18 or older.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          displayName: displayName.trim(),
          ageOk,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Signup failed");
        return;
      }
      window.location.href = "/chat";
    } catch {
      setError("Network error — try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Create account</h1>
        <p className="sub">
          Join Nightline. Your level &amp; credits are set by admin after signup
          (defaults apply).
        </p>
        <div className="auth-tabs">
          <Link href="/login">Log in</Link>
          <Link className="active" href="/signup">
            Sign up
          </Link>
        </div>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Display name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="What companions call you"
              required
              disabled={busy}
            />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={busy}
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              disabled={busy}
            />
          </div>
          <label className="age-check">
            <input
              type="checkbox"
              checked={ageOk}
              onChange={(e) => setAgeOk(e.target.checked)}
              disabled={busy}
            />
            <span>
              I confirm I am <strong>18 years or older</strong>. This site is
              adults-only. No underage content.
            </span>
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Creating…" : "Sign up & enter"}
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
