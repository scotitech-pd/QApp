"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PasswordInput } from "../components/password-input";
import { useAuth } from "../lib/auth";

export function SignInClient({ nextPath }: { nextPath: string | null }) {
  const router = useRouter();
  const { busy, hasPlatformAdminAccess, isAuthenticated, login, preferredShopSlug, user } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    try {
      const nextUser = await login({
        identifier,
        password,
        deviceName: "OnQ Web",
        platform: "web"
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
      <main className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" height={44} src="/icons/icon-192.png" width={44} />
          </div>
          <h1>You're signed in</h1>
          <p className="auth-sub">
            {user.firstName} {user.lastName ?? ""} · {user.email ?? "no email"}
          </p>
          <div className="auth-stack">
            <Link className="auth-submit" href={preferredShopSlug ? "/shop/dashboard" : "/shops"}>
              Open shop portal
            </Link>
            {hasPlatformAdminAccess ? (
              <Link className="auth-alt" href="/admin/business-signups">
                Review shop applications
              </Link>
            ) : null}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" height={44} src="/icons/icon-192.png" width={44} />
        </div>
        <h1>Welcome back</h1>
        <p className="auth-sub">Sign in to run your shop's queue.</p>

        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <label className="field">
            <span>Email or phone</span>
            <input
              autoComplete="username"
              autoFocus
              onChange={(event) => setIdentifier(event.target.value)}
              value={identifier}
            />
          </label>
          <label className="field">
            <span className="field-row">
              Password
              <Link className="field-aside" href="/forgot-password" tabIndex={-1}>
                Forgot password?
              </Link>
            </span>
            <PasswordInput autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} value={password} />
          </label>

          {error ? <p className="auth-error" role="alert">{error}</p> : null}

          <button className="auth-submit" disabled={busy || !identifier.trim() || !password} type="submit">
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="auth-divider">
          <span>New to OnQ?</span>
        </div>
        <Link className="auth-alt" href="/business/signup">
          Register your shop — free during the pilot
        </Link>

        <p className="auth-footnote">
          Customers don't need an account — <Link href="/shops">browse live queues</Link> instead.
        </p>
      </div>
    </main>
  );
}
