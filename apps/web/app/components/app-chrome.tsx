"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useAuth } from "../lib/auth";

const OWNER_ROUTE_PREFIXES = ["/signin", "/shop/", "/shop", "/business/", "/admin/", "/ops/", "/portal", "/lab"];

function isOwnerRoute(pathname: string) {
  return OWNER_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix.replace(/\/$/, "") || pathname.startsWith(prefix)
  );
}

function NavLink({ href, label, currentPath }: { href: string; label: string; currentPath: string }) {
  const isActive = currentPath === href || (href !== "/" && currentPath.startsWith(href));
  return (
    <Link className={isActive ? "nav-link nav-link-active" : "nav-link"} href={href}>
      {label}
    </Link>
  );
}

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { busy, isAuthenticated, logoutCurrent, user, hasPlatformAdminAccess } = useAuth();

  const ownerContext = isOwnerRoute(pathname);
  const onMarketing = pathname === "/";

  const links = ownerContext
    ? [
        { href: "/shop/dashboard", label: "Dashboard" },
        ...(hasPlatformAdminAccess ? [{ href: "/admin/business-signups", label: "Admin" }] : [])
      ]
    : [
        { href: "/shops", label: "Find a queue" },
        { href: "/business/signup", label: "For shop owners" }
      ];

  return (
    <div className={`app-frame ${onMarketing ? "app-frame-marketing" : ""}`}>
      <header className={`top-bar ${onMarketing ? "top-bar-dark" : ""}`}>
        <div className="top-bar-inner">
          <Link className="top-brand" href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="OnQ" height={34} src="/icons/icon-192.png" width={34} />
            <span className="top-brand-text">
              <strong>OnQ</strong>
              <small>Skip the wait</small>
            </span>
          </Link>

          <nav aria-label="Primary" className="top-links">
            {links.map((item) => (
              <NavLink currentPath={pathname} href={item.href} key={item.href} label={item.label} />
            ))}
          </nav>

          <div className="top-actions">
            {isAuthenticated ? (
              <>
                <span className="top-session" title={user?.email ?? undefined}>
                  {user?.firstName ?? "Account"}
                </span>
                <button
                  className="nav-cta ghost"
                  disabled={busy}
                  onClick={() => void logoutCurrent()}
                  type="button"
                >
                  {busy ? "…" : "Sign out"}
                </button>
              </>
            ) : (
              <>
                <Link className="nav-cta ghost" href="/signin">
                  Sign in
                </Link>
                <Link className="nav-cta solid" href="/business/signup">
                  Register your shop
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="app-content">{children}</main>

      {!onMarketing ? (
        <nav aria-label="Mobile" className="bottom-nav">
          {(ownerContext
            ? [
                { href: "/shop/dashboard", label: "Dashboard" },
                { href: "/business/signup", label: "Register" },
                ...(hasPlatformAdminAccess ? [{ href: "/admin/business-signups", label: "Admin" }] : [])
              ]
            : [
                { href: "/", label: "Home" },
                { href: "/shops", label: "Nearby" }
              ]
          ).map((item) => (
            <Link
              className={
                pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                  ? "tab-link tab-link-active"
                  : "tab-link"
              }
              href={item.href}
              key={item.href}
            >
              <span className="tab-label">{item.label}</span>
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
