"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useAuth } from "../lib/auth";

type NavItem = {
  href: string;
  label: string;
};

function NavLink({ href, label, currentPath }: NavItem & { currentPath: string }) {
  const isActive = currentPath === href || (href !== "/" && currentPath.startsWith(href));

  return (
    <Link className={isActive ? "chrome-link chrome-link-active" : "chrome-link"} href={href}>
      {label}
    </Link>
  );
}

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { busy, isAuthenticated, logoutCurrent, user, hasPlatformAdminAccess } = useAuth();
  const primaryLinks: NavItem[] = [
    { href: "/", label: "Find Shops" },
    { href: "/shops", label: "Live Queues" },
    { href: "/shop/dashboard", label: "Shop Portal" },
    { href: "/business/signup", label: "For Shops" }
  ];

  if (hasPlatformAdminAccess) {
    primaryLinks.push({ href: "/admin/business-signups", label: "Admin" });
  }

  return (
    <div className="app-frame">
      <header className="app-header">
        <div className="app-header-row">
          <Link className="brand-lockup" href="/">
            <span className="brand-mark">Q</span>
            <span>
              <strong>Q-App</strong>
              <small>Queue and smart arrival</small>
            </span>
          </Link>

          <div className="app-header-actions">
            {isAuthenticated ? (
              <>
                <div className="session-chip">
                  <strong>{user?.firstName ?? "Q-App"}</strong>
                  <small>{user?.email ?? "Signed in"}</small>
                </div>
                <button className="button" disabled={busy} onClick={() => void logoutCurrent()} type="button">
                  {busy ? "Working..." : "Sign Out"}
                </button>
              </>
            ) : (
              <Link className="button" href="/shop/signin">
                Shop Sign In
              </Link>
            )}
          </div>
        </div>

        <nav className="top-nav" aria-label="Primary">
          {primaryLinks.map((item) => (
            <NavLink currentPath={pathname} href={item.href} key={item.href} label={item.label} />
          ))}
        </nav>
      </header>

      <div className="app-content">{children}</div>

      <nav className="bottom-nav" aria-label="Mobile">
        {primaryLinks.slice(0, 5).map((item) => (
          <NavLink currentPath={pathname} href={item.href} key={item.href} label={item.label} />
        ))}
      </nav>
    </div>
  );
}
