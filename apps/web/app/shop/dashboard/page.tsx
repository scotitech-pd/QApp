"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { QueueDashboardClient } from "../../ops/shops/[slug]/queue-dashboard-client";
import { useAuth } from "../../lib/auth";

export default function ShopDashboardPage() {
  const { hasBusinessRole, isAuthenticated, preferredShopSlug, ready, user } = useAuth();
  const hasShopAccess = hasBusinessRole(["OWNER", "MANAGER", "STAFF_OPERATOR"]);
  const shopProfiles = user?.staffProfiles ?? [];
  const [selectedShopSlug, setSelectedShopSlug] = useState<string | null>(null);
  const activeShopSlug = selectedShopSlug ?? preferredShopSlug;
  const selectedShopName =
    shopProfiles.find((profile) => profile.businessLocation.slug === activeShopSlug)?.businessLocation.name ??
    "Your shop";

  useEffect(() => {
    if (!selectedShopSlug && preferredShopSlug) {
      setSelectedShopSlug(preferredShopSlug);
    }
  }, [preferredShopSlug, selectedShopSlug]);

  return (
    <main className="page-shell">
      <section className="hero hero-compact">
        <span className="eyebrow">Shop Portal</span>
        <h1>See the queue and run the shop floor.</h1>
        <p>
          This is the owner and staff view: live queue count, who is waiting, who is in service,
          walk-ins, no-shows, and queue controls.
        </p>
      </section>

      {!ready ? (
        <section className="section">
          <p className="status-text">Preparing shop portal...</p>
        </section>
      ) : !isAuthenticated ? (
        <section className="section">
          <div className="auth-guard">
            <strong>Shop owner sign-in required</strong>
            <p className="status-text">
              Customers do not need accounts. Shop teams sign in here to see how many people are waiting and operate
              the live queue.
            </p>
            <div className="hero-actions">
              <Link className="button primary" href="/signin?next=/shop/dashboard">
                Sign in to Shop Portal
              </Link>
              <Link className="button" href="/business/signup">
                Register a shop
              </Link>
            </div>
          </div>
        </section>
      ) : !hasShopAccess ? (
        <section className="section">
          <p className="status-text warning">
            {user?.firstName ?? "This account"} does not have shop owner, manager, or staff access.
          </p>
        </section>
      ) : !activeShopSlug ? (
        <section className="section">
          <p className="status-text warning">
            This account is signed in, but no shop location is attached yet.
          </p>
        </section>
      ) : (
        <section className="section shop-portal-section">
          <div className="section-toolbar">
            <div>
              <span className="eyebrow">Selected shop</span>
              <h2>{selectedShopName}</h2>
            </div>
            <div className="location-actions">
              {shopProfiles.length > 1 ? (
                <label className="field shop-selector-field">
                  <span>Switch shop</span>
                  <select
                    value={activeShopSlug}
                    onChange={(event) => setSelectedShopSlug(event.target.value)}
                  >
                    {shopProfiles.map((profile) => (
                      <option key={profile.businessLocation.id} value={profile.businessLocation.slug}>
                        {profile.businessLocation.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <Link className="button" href="/shop/profile">
                Edit Shop Profile
              </Link>
            </div>
          </div>
          <QueueDashboardClient slug={activeShopSlug} />
        </section>
      )}
    </main>
  );
}
