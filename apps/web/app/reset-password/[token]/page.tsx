"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { PasswordInput, PasswordRules, passwordMeetsRules } from "../../components/password-input";
import { getApiBaseUrl } from "../../lib/api";

export default function ResetPasswordPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!passwordMeetsRules(password)) {
      setError("Your password doesn't meet all the rules yet.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${getApiBaseUrl()}/v1/auth/password-reset/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: params.token, password })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "This link may have expired. Request a new one.");
      }
      setDone(true);
      setTimeout(() => router.push("/signin"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset the password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page narrow">
      <h1>Choose a new password</h1>
      {done ? (
        <div className="card">
          <p>Password updated. Taking you to sign in…</p>
          <Link className="button" href="/signin">
            Sign in now
          </Link>
        </div>
      ) : (
        <div className="card">
          <label className="field">
            <span>New password</span>
            <PasswordInput autoComplete="new-password" onChange={(event) => setPassword(event.target.value)} value={password} />
          </label>
          <PasswordRules password={password} />
          <label className="field">
            <span>Confirm new password</span>
            <PasswordInput autoComplete="new-password" onChange={(event) => setConfirm(event.target.value)} value={confirm} />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="button primary" disabled={busy} onClick={() => void submit()} type="button">
            {busy ? "Saving..." : "Set new password"}
          </button>
        </div>
      )}
    </div>
  );
}
