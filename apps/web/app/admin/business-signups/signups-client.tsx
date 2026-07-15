"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "../../lib/auth";
import { unwrapList } from "../../lib/api";

type BusinessSignup = {
  id: string;
  businessName: string;
  ownerName: string;
  mobileNumber: string;
  email: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  region?: string | null;
  postalCode?: string | null;
  countryCode: string;
  industryType: string;
  serviceStationsCount: number;
  openingHoursNote: string;
  latitude: number;
  longitude: number;
  geolocationSource?: string | null;
  approvalStatus: string;
  createdAt: string;
};

export function AdminBusinessSignups() {
  const { authRequestJson, authRequestJsonList, hasPlatformAdminAccess, isAuthenticated, ready } = useAuth();
  const [items, setItems] = useState<BusinessSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadSignups() {
    setLoading(true);
    setError(null);

    try {
      const payload = await authRequestJsonList<BusinessSignup>("/v1/business-signups?status=PENDING");
      setItems(unwrapList(payload));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load signups.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!ready || !isAuthenticated || !hasPlatformAdminAccess) {
      setLoading(false);
      return;
    }

    void loadSignups();
  }, [ready, isAuthenticated, hasPlatformAdminAccess]);

  async function handleApprove(id: string) {
    setBusyId(id);
    setError(null);

    try {
      await authRequestJson(`/v1/business-signups/${id}/approve`, {
        method: "POST"
      });
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : "Approval failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    setBusyId(id);
    setError(null);

    try {
      await authRequestJson(`/v1/business-signups/${id}/reject`, {
        method: "POST",
        body: {
          reason: "Rejected in initial admin review."
        }
      });
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (rejectError) {
      setError(rejectError instanceof Error ? rejectError.message : "Rejection failed.");
    } finally {
      setBusyId(null);
    }
  }

  if (!ready) {
    return <p className="status-text">Preparing admin session...</p>;
  }

  if (!isAuthenticated) {
    return (
      <div className="auth-guard">
        <p className="status-text">Admin review uses the protected platform routes.</p>
        <Link className="button primary" href="/signin?next=/admin/business-signups">
          Sign In As Admin
        </Link>
      </div>
    );
  }

  if (!hasPlatformAdminAccess) {
    return <p className="status-text warning">This account does not have platform-admin access.</p>;
  }

  if (loading) {
    return <p className="status-text">Loading pending business signups...</p>;
  }

  return (
    <div className="admin-shell">
      <div className="section-toolbar">
        <p className="status-text">Approve only after checking address quality and storefront coordinates.</p>
        <button className="button" onClick={() => void loadSignups()} type="button">
          Refresh
        </button>
      </div>

      {error ? <p className="status-text warning">{error}</p> : null}

      {items.length === 0 ? (
        <p className="status-text">No pending signups right now.</p>
      ) : (
        <div className="admin-grid">
          {items.map((item) => (
            <article className="card admin-card" key={item.id}>
              <div className="card-kicker">
                <strong>{item.businessName}</strong>
                <span className="pill">{item.industryType}</span>
              </div>
              <p>
                Owner: {item.ownerName}
                <br />
                Contact: {item.mobileNumber}
                <br />
                Email: {item.email}
              </p>
              <p>
                Address: {item.addressLine1}
                {item.addressLine2 ? `, ${item.addressLine2}` : ""}
                <br />
                {item.city}
                {item.region ? `, ${item.region}` : ""}
                {item.postalCode ? ` ${item.postalCode}` : ""}
                <br />
                {item.countryCode}
              </p>
              <p>
                Stations: {item.serviceStationsCount}
                <br />
                Coordinates: {item.latitude}, {item.longitude}
                <br />
                Source: {item.geolocationSource ?? "UNKNOWN"}
              </p>
              <p>Hours note: {item.openingHoursNote}</p>
              <div className="location-actions">
                <button
                  className="button primary"
                  disabled={busyId === item.id}
                  onClick={() => void handleApprove(item.id)}
                  type="button"
                >
                  {busyId === item.id ? "Working..." : "Approve"}
                </button>
                <button
                  className="button button-danger"
                  disabled={busyId === item.id}
                  onClick={() => void handleReject(item.id)}
                  type="button"
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
