"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    message: string;
    token?: string;
    resetPath?: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      setResult({
        message: data.message,
        token: data.token,
        resetPath: data.resetPath,
      });
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Forgot password</h1>
        <p className="sub">
          We create a reset token. Admin can also see reset requests and set a
          new password from the dashboard.
        </p>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          {result && (
            <div className="success">
              <p>{result.message}</p>
              {result.token && (
                <p style={{ wordBreak: "break-all", marginTop: 8 }}>
                  Token: <code>{result.token}</code>
                </p>
              )}
              {result.resetPath && (
                <p style={{ marginTop: 8 }}>
                  <Link href={result.resetPath}>Open reset page →</Link>
                </p>
              )}
            </div>
          )}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Working…" : "Create reset token"}
          </button>
        </form>
        <div className="links-row">
          <Link href="/login">Back to login</Link>
          <Link href="/reset-password">I have a token</Link>
        </div>
      </div>
    </div>
  );
}
