"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useAuth } from "../lib/auth";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const
};

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden {...strokeProps}>
      <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-8.5Z" />
    </svg>
  );
}

function IconQueue() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden {...strokeProps}>
      <path d="M5 7h14M5 12h14M5 17h9" />
      <circle cx="19.5" cy="17" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconShop() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden {...strokeProps}>
      <path d="M4 8h16l-1 4a2 2 0 0 1-2 1.5H7A2 2 0 0 1 5 12L4 8Z" />
      <path d="M4 8V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2" />
      <path d="M6 13.5V20h12v-6.5" />
    </svg>
  );
}

function IconRegister() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden {...strokeProps}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden {...strokeProps}>
      <path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function NavLink({
  href,
  label,
  icon,
  currentPath,
  variant
}: NavItem & { currentPath: string; variant: "top" | "tab" }) {
  const isActive = currentPath === href || (href !== "/" && currentPath.startsWith(href));

  if (variant === "tab") {
    return (
      <Link className={isActive ? "tab-link tab-link-active" : "tab-link"} href={href}>
        <span className="tab-icon">{icon}</span>
        <span className="tab-label">{label}</span>
      </Link>
    );
  }

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
    { href: "/", label: "Home", icon: <IconHome /> },
    { href: "/shops", label: "Queues", icon: <IconQueue /> },
    { href: "/shop/dashboard", label: "Shop", icon: <IconShop /> },
    { href: "/business/signup", label: "Register", icon: <IconRegister /> }
  ];

  if (hasPlatformAdminAccess) {
    primaryLinks.push({ href: "/admin/business-signups", label: "Admin", icon: <IconShield /> });
  }

  return (
    <div className="app-frame">
      <header className="app-header">
        <div className="app-header-row">
          <Link className="brand-lockup" href="/">
            <span className="brand-mark">Q</span>
            <span className="brand-text">
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
                <button
                  className="button small"
                  disabled={busy}
                  onClick={() => void logoutCurrent()}
                  type="button"
                >
                  {busy ? "..." : "Sign Out"}
                </button>
              </>
            ) : (
              <Link className="button small" href="/signin">
                Sign In
              </Link>
            )}
          </div>
        </div>

        <nav className="top-nav" aria-label="Primary">
          {primaryLinks.map((item) => (
            <NavLink
              currentPath={pathname}
              href={item.href}
              icon={item.icon}
              key={item.href}
              label={item.label}
              variant="top"
            />
          ))}
        </nav>
      </header>

      <main className="app-content">{children}</main>

      <nav className="bottom-nav" aria-label="Mobile">
        {primaryLinks.slice(0, 5).map((item) => (
          <NavLink
            currentPath={pathname}
            href={item.href}
            icon={item.icon}
            key={item.href}
            label={item.label}
            variant="tab"
          />
        ))}
      </nav>
    </div>
  );
}
