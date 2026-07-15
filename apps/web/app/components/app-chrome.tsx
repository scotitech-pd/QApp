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

function IconNearby() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden {...strokeProps}>
      <path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function IconDashboard() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden {...strokeProps}>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="4" rx="1.5" />
      <rect x="13" y="10" width="7" height="10" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconRegister() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden {...strokeProps}>
      <path d="M4 8h16l-1 4a2 2 0 0 1-2 1.5H7A2 2 0 0 1 5 12L4 8Z" />
      <path d="M4 8V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2" />
      <path d="M12 13v6M9 16h6" />
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

const OWNER_ROUTE_PREFIXES = ["/signin", "/shop/", "/shop", "/business/", "/admin/", "/ops/", "/portal", "/lab"];

function isOwnerRoute(pathname: string) {
  return OWNER_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix.replace(/\/$/, "") || pathname.startsWith(prefix)
  );
}

function NavLink({
  href,
  label,
  icon,
  currentPath,
  variant
}: NavItem & { currentPath: string; variant: "top" | "tab" }) {
  const isActive =
    currentPath === href ||
    (href !== "/" && currentPath.startsWith(href));

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

  const ownerContext = isOwnerRoute(pathname);

  const customerNav: NavItem[] = [
    { href: "/", label: "Home", icon: <IconHome /> },
    { href: "/shops", label: "Nearby", icon: <IconNearby /> }
  ];

  const ownerNav: NavItem[] = [
    { href: "/shop/dashboard", label: "Dashboard", icon: <IconDashboard /> },
    { href: "/business/signup", label: "Register", icon: <IconRegister /> }
  ];

  if (hasPlatformAdminAccess) {
    ownerNav.push({ href: "/admin/business-signups", label: "Admin", icon: <IconShield /> });
  }

  const primaryLinks = ownerContext ? ownerNav : customerNav;

  const brandTagline = ownerContext ? "Shop Owner Portal" : "Skip the wait";

  return (
    <div className={`app-frame ${ownerContext ? "app-frame-owner" : "app-frame-customer"}`}>
      <header className="app-header">
        <div className="app-header-row">
          <Link className="brand-lockup" href={ownerContext ? "/shop/dashboard" : "/"}>
            <span className="brand-mark">Q</span>
            <span className="brand-text">
              <strong>Q-App</strong>
              <small>{brandTagline}</small>
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
            ) : ownerContext ? (
              <Link className="button small" href="/signin">
                Sign In
              </Link>
            ) : (
              <Link className="button small ghost" href="/signin">
                For Shops
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
        {primaryLinks.map((item) => (
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
