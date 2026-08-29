"use client";

import Link from "next/link";
import { useState } from "react";

import { getApiBaseUrl } from "../lib/api";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${getApiBaseUrl()}/v1/auth/password-reset/request`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Could not request a reset. Try again.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not request a reset. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page narrow">
      <h1>Forgot your password?</h1>
      {done ? (
        <div className="card">
          <p>
            If an account exists for <strong>{identifier.trim()}</strong>, a reset link is on its way to that inbox.
            The link expires in 30 minutes — check spam if it doesn't arrive.
          </p>
          <Link className="button" href="/signin">
            Back to sign in
          </Link>
        </div>
      ) : (
        <div className="card">
          <p className="muted">Enter the email you sign in with and we'll send a reset link.</p>
          <label className="field">
            <span>Email</span>
            <input
              autoComplete="email"
              onChange={(event) => setIdentifier(event.target.value)}
              type="email"
              value={identifier}
            />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="button primary" disabled={busy || identifier.trim().length < 3} onClick={() => void submit()} type="button">
            {busy ? "Sending..." : "Send reset link"}
          </button>
          <p className="muted" style={{ marginTop: "0.8rem" }}>
            <Link href="/signin">Back to sign in</Link>
          </p>
        </div>
      )}
    </div>
  );
}
