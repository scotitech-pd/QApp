"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "../lib/auth";

export function SignInClient({ nextPath }: { nextPath: string | null }) {
  const router = useRouter();
  const { busy, hasPlatformAdminAccess, isAuthenticated, login, preferredShopSlug, user } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [deviceName, setDeviceName] = useState("Q-App Web");
  const [platform, setPlatform] = useState("web");
  const [error, setError] = useState<string | null>(null);
  async function handleSubmit() {
    setError(null);

    try {
      const nextUser = await login({
        identifier,
        password,
        deviceName,
        platform
      });

      if (nextPath) {
        router.push(nextPath);
        return;
      }

      if (nextUser.appRole === "PLATFORM_ADMIN") {
        router.push("/admin/business-signups");
        return;
      }

      const nextShopSlug = nextUser.staffProfiles[0]?.businessLocation.slug ?? preferredShopSlug;
      router.push(nextShopSlug ? "/shop/dashboard" : "/shops");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Sign-in failed.");
    }
  }

  if (isAuthenticated && user) {
    return (
      <div className="auth-shell">
        <div className="summary-panel">
          <strong>Already signed in</strong>
          <p>
            {user.firstName} {user.lastName ?? ""}
            <br />
            {user.email ?? "No email"}
            <br />
            Role: {user.appRole}
          </p>
        </div>
        <div className="hero-actions">
          <Link className="button primary" href={preferredShopSlug ? "/shop/dashboard" : "/shops"}>
            Open Shop Portal
          </Link>
          {hasPlatformAdminAccess ? (
            <Link className="button" href="/admin/business-signups">
              Open Admin Review
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="lab-form-grid">
        <label className="field">
          <span>Email Or Phone</span>
          <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <label className="field">
          <span>Device Name</span>
          <input value={deviceName} onChange={(event) => setDeviceName(event.target.value)} />
        </label>
        <label className="field">
          <span>Platform</span>
          <select value={platform} onChange={(event) => setPlatform(event.target.value)}>
            <option value="web">web</option>
            <option value="ios">ios</option>
            <option value="android">android</option>
          </select>
        </label>
      </div>

      {error ? <p className="status-text warning">{error}</p> : null}

      <div className="hero-actions">
        <button className="button primary" disabled={busy} onClick={() => void handleSubmit()} type="button">
          {busy ? "Signing in..." : "Sign In"}
        </button>
        <Link className="button" href="/shops">
          Continue as Customer
        </Link>
      </div>
    </div>
  );
}
