"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../lib/auth";
import { unwrapItem, unwrapList } from "../../lib/api";

type Status = "PENDING" | "APPROVED" | "REJECTED";

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
  approvalStatus: Status | "SUSPENDED";
  createdAt: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  approvedLocationSlug?: string | null;
};

type ApproveResult = {
  location: { slug: string; name: string };
  owner: { email: string | null; createdNewAccount: boolean };
};

const TABS: Array<{ key: Status; label: string }> = [
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" }
];

function industryLabel(value: string) {
  return value.toLowerCase().replace(/_/g, " ");
}

function sourceLabel(value?: string | null) {
  if (value === "BROWSER_GPS") return "GPS pin";
  if (value === "ADDRESS_GEOCODE") return "Geocoded";
  if (value === "MANUAL_PIN") return "Typed / map pin";
  return "Pin";
}

function relative(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

export function AdminBusinessSignups() {
  const { authRequestJson, authRequestJsonList, hasPlatformAdminAccess, isAuthenticated, ready } = useAuth();
  const [items, setItems] = useState<BusinessSignup[]>([]);
  const [tab, setTab] = useState<Status>("PENDING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [lastApproved, setLastApproved] = useState<ApproveResult | null>(null);

  async function loadSignups() {
    setLoading(true);
    setError(null);
    try {
      const payload = await authRequestJsonList<BusinessSignup>("/v1/business-signups");
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
    const timer = window.setInterval(() => void loadSignups(), 30_000);
    return () => window.clearInterval(timer);
  }, [ready, isAuthenticated, hasPlatformAdminAccess]);

  const counts = useMemo(
    () => ({
      PENDING: items.filter((item) => item.approvalStatus === "PENDING").length,
      APPROVED: items.filter((item) => item.approvalStatus === "APPROVED").length,
      REJECTED: items.filter((item) => item.approvalStatus === "REJECTED").length
    }),
    [items]
  );

  const visible = items.filter((item) => item.approvalStatus === tab);

  async function approve(signup: BusinessSignup) {
    setBusyId(signup.id);
    setError(null);
    try {
      const payload = await authRequestJson<ApproveResult>(`/v1/business-signups/${signup.id}/approve`, { method: "POST", body: {} });
      setLastApproved(unwrapItem(payload));
      await loadSignups();
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : "Approval failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(signup: BusinessSignup) {
    setBusyId(signup.id);
    setError(null);
    try {
      await authRequestJson(`/v1/business-signups/${signup.id}/reject`, {
        method: "POST",
        body: { reason: rejectReason.trim() || undefined }
      });
      setRejectingId(null);
      setRejectReason("");
      await loadSignups();
    } catch (rejectError) {
      setError(rejectError instanceof Error ? rejectError.message : "Rejection failed.");
    } finally {
      setBusyId(null);
    }
  }

  if (!ready) return <p className="status-text">Preparing admin session...</p>;

  if (!isAuthenticated) {
    return (
      <div className="auth-guard">
        <p className="status-text">Super-admin access only. Sign in with a platform-admin account.</p>
        <Link className="button primary" href="/signin?next=/admin/business-signups">
          Sign in
        </Link>
      </div>
    );
  }

  if (!hasPlatformAdminAccess) {
    return <p className="status-text warning">This account does not have platform-admin access.</p>;
  }

  return (
    <div className="admin-shell">
      <div className="admin-tabs" role="tablist">
        {TABS.map((item) => (
          <button
            aria-selected={tab === item.key}
            className={tab === item.key ? "admin-tab admin-tab-active" : "admin-tab"}
            key={item.key}
            onClick={() => setTab(item.key)}
            role="tab"
            type="button"
          >
            {item.label}
            <span className="admin-tab-count">{counts[item.key]}</span>
          </button>
        ))}
        <button className="button small" onClick={() => void loadSignups()} type="button">
          Refresh
        </button>
      </div>

      {lastApproved ? (
        <div className="result-panel">
          <h2>{lastApproved.location.name} is live</h2>
          <p>
            Owner login: <code className="inline">{lastApproved.owner.email}</code>
            {lastApproved.owner.createdNewAccount ? " (new account created with the password they chose)" : " (existing account)"}
          </p>
          <div className="admin-links">
            <Link className="button small" href={`/shops/${lastApproved.location.slug}`}>
              Customer page
            </Link>
            <Link className="button small" href={`/ops/shops/${lastApproved.location.slug}/qr`}>
              Print QR sign
            </Link>
            <Link className="button small" href={`/ops/shops/${lastApproved.location.slug}/staff-guide`}>
              Staff guide
            </Link>
            <button className="button small ghost" onClick={() => setLastApproved(null)} type="button">
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="status-text warning">{error}</p> : null}
      {loading && items.length === 0 ? <p className="status-text">Loading registrations...</p> : null}
      {!loading && visible.length === 0 ? (
        <p className="status-text">
          {tab === "PENDING" ? "Nothing waiting — every registration is reviewed." : `No ${tab.toLowerCase()} registrations yet.`}
        </p>
      ) : null}

      <div className="admin-grid">
        {visible.map((signup) => {
          const address = [signup.addressLine1, signup.city, signup.postalCode].filter(Boolean).join(", ");
          const mapsUrl = `https://maps.google.com/?q=${signup.latitude},${signup.longitude}`;
          const isRejecting = rejectingId === signup.id;
          return (
            <article className="admin-card" key={signup.id}>
              <div className="card-kicker">
                <div>
                  <h3>{signup.businessName}</h3>
                  <p className="status-text">
                    {industryLabel(signup.industryType)} · {signup.serviceStationsCount} chairs · submitted {relative(signup.createdAt)}
                  </p>
                </div>
                <span className={signup.approvalStatus === "APPROVED" ? "pill pill-good" : signup.approvalStatus === "REJECTED" ? "pill danger" : "pill pill-warn"}>
                  {signup.approvalStatus.toLowerCase()}
                </span>
              </div>

              <dl className="admin-facts">
                <div>
                  <dt>Owner</dt>
                  <dd>
                    {signup.ownerName} · {signup.mobileNumber} · {signup.email}
                  </dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>
                    {address || "Pin only (no address given)"} · {signup.latitude.toFixed(5)}, {signup.longitude.toFixed(5)} ·{" "}
                    <span className="pill">{sourceLabel(signup.geolocationSource)}</span>{" "}
                    <a href={mapsUrl} rel="noreferrer" target="_blank">
                      Open in Maps ↗
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>Hours</dt>
                  <dd>{signup.openingHoursNote}</dd>
                </div>
                {signup.rejectionReason ? (
                  <div>
                    <dt>Reason</dt>
                    <dd>{signup.rejectionReason}</dd>
                  </div>
                ) : null}
              </dl>

              {signup.approvalStatus === "PENDING" ? (
                <div className="admin-actions">
                  {isRejecting ? (
                    <div className="admin-reject">
                      <label className="field">
                        <span>Reason (the owner sees this)</span>
                        <input
                          onChange={(event) => setRejectReason(event.target.value)}
                          placeholder="e.g. Pin is in the middle of a road — please re-register from the shop."
                          value={rejectReason}
                        />
                      </label>
                      <div className="admin-links">
                        <button className="button button-danger small" disabled={busyId === signup.id} onClick={() => void reject(signup)} type="button">
                          Confirm reject
                        </button>
                        <button className="button small ghost" onClick={() => setRejectingId(null)} type="button">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button className="button primary" disabled={busyId === signup.id} onClick={() => void approve(signup)} type="button">
                        {busyId === signup.id ? "Approving..." : "Approve & go live"}
                      </button>
                      <button className="button" disabled={busyId === signup.id} onClick={() => setRejectingId(signup.id)} type="button">
                        Reject…
                      </button>
                    </>
                  )}
                </div>
              ) : null}

              {signup.approvalStatus === "APPROVED" && signup.approvedLocationSlug ? (
                <div className="admin-links">
                  <Link className="button small" href={`/shops/${signup.approvedLocationSlug}`}>
                    Customer page
                  </Link>
                  <Link className="button small" href={`/ops/shops/${signup.approvedLocationSlug}/qr`}>
                    QR sign
                  </Link>
                  <Link className="button small" href={`/ops/shops/${signup.approvedLocationSlug}/staff-guide`}>
                    Staff guide
                  </Link>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
