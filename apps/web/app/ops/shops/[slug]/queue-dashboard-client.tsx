"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "../../../lib/auth";
import { unwrapItem, unwrapList } from "../../../lib/api";
import { getSocket } from "../../../lib/socket";

type QueueEntry = {
  id: string;
  trackingToken: string;
  sortIndex: number;
  confirmationStatus: string;
  calledAt: string | null;
  confirmationRequestedAt: string | null;
  confirmationRespondedAt: string | null;
  missedAt: string | null;
  releasedAt: string | null;
  removedAt: string | null;
  visit: {
    id: string;
    status: string;
    plannedDurationMin: number | null;
    estimatedWaitMin: number | null;
    customer: {
      firstName: string;
      phone?: string | null;
    };
  };
};

type InServiceVisit = {
  id: string;
  status: string;
  startedAt: string | null;
  plannedDurationMin: number | null;
  customer: {
    firstName: string;
  };
};

type DashboardPayload = {
  shop: {
    name: string;
    slug: string;
    queuePaused: boolean;
    queuePauseReason?: string | null;
    queueEnabled: boolean;
    defaultWalkInDurationMin: number;
    serviceStationsCount: number;
    nearTurnPositionTrigger: number;
    nearTurnEtaTriggerMin: number;
    calledGracePeriodMin: number;
  };
  queueEntries: QueueEntry[];
  inServiceVisits: InServiceVisit[];
  missedQueueEntries: QueueEntry[];
  reviewSummary: {
    averageRating: number | null;
    ratingCount: number;
  };
  recentReviews: Array<{
    id: string;
    rating: number | null;
    comment: string | null;
    createdAt: string;
    customerName: string;
  }>;
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  firstName?: string | null;
  lastName?: string | null;
  note?: string | null;
  expiresAt: string;
  acceptedAt: string | null;
};

function formatRating(summary: DashboardPayload["reviewSummary"]) {
  if (!summary.averageRating || summary.ratingCount === 0) {
    return "No ratings yet";
  }

  return `${summary.averageRating.toFixed(1)} from ${summary.ratingCount} rating${summary.ratingCount === 1 ? "" : "s"}`;
}

function formatQueueStatus(entry: QueueEntry) {
  if (entry.visit.status === "CONFIRMATION_PENDING") {
    return "Waiting for Yes/No";
  }

  if (entry.visit.status === "READY" || entry.confirmationStatus === "COMING") {
    return "Confirmed and ready";
  }

  if (entry.visit.status === "CALLED") {
    return "Called in";
  }

  return "Waiting";
}

function getReleaseReason(entry: QueueEntry) {
  if (entry.visit.status === "CONFIRMATION_PENDING") {
    return "No response from customer";
  }

  if (entry.confirmationStatus === "COMING" || entry.visit.status === "READY" || entry.visit.status === "CALLED") {
    return "Customer did not arrive when called";
  }

  return "Released by staff";
}

function getMissedAtLabel(entry: QueueEntry) {
  const missedAt = entry.missedAt ?? entry.releasedAt ?? entry.removedAt;

  if (!missedAt) {
    return "Released recently";
  }

  return `Released at ${new Date(missedAt).toLocaleTimeString()}`;
}

function canStartQueueEntry(entry: QueueEntry) {
  return entry.visit.status === "READY" || entry.visit.status === "CALLED" || entry.confirmationStatus === "COMING";
}

function getNextActionTitle(entry: QueueEntry | null, activeService: InServiceVisit | null) {
  if (activeService) {
    return `Finish ${activeService.customer.firstName}'s service`;
  }

  if (!entry) {
    return "Queue is clear";
  }

  if (entry.visit.status === "CONFIRMATION_PENDING") {
    return `Waiting for ${entry.visit.customer.firstName} to answer`;
  }

  if (entry.visit.status === "READY" || entry.confirmationStatus === "COMING") {
    return `Seat ${entry.visit.customer.firstName}`;
  }

  if (entry.visit.status === "CALLED") {
    return `${entry.visit.customer.firstName} has been called`;
  }

  return `Call ${entry.visit.customer.firstName}`;
}

export function QueueDashboardClient({ slug }: { slug: string }) {
  const {
    authRequestJson,
    authRequestJsonList,
    hasBusinessRole,
    isAuthenticated,
    ready,
    user
  } = useAuth();
  const [item, setItem] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [walkInFirstName, setWalkInFirstName] = useState("Walkin");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [walkInDuration, setWalkInDuration] = useState("20");
  const [extensionMinutes, setExtensionMinutes] = useState("10");
  const [extensionNote, setExtensionNote] = useState("Extra service time");
  const [pauseReason, setPauseReason] = useState("Short break");
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState("newstaff@fadeyard.demo");
  const [inviteFirstName, setInviteFirstName] = useState("New");
  const [inviteLastName, setInviteLastName] = useState("Staff");
  const [inviteRole, setInviteRole] = useState("STAFF_OPERATOR");
  const [inviteNote, setInviteNote] = useState("Added from Q-App web operations");

  const hasOpsAccess = hasBusinessRole(["OWNER", "MANAGER", "STAFF_OPERATOR"]);
  const canManageInvites = hasBusinessRole(["OWNER", "MANAGER"]);

  async function loadDashboard() {
    setLoading(true);
    setError(null);

    try {
      const payload = await authRequestJson<DashboardPayload>(`/v1/ops/shops/${slug}/dashboard`);
      setItem(unwrapItem(payload));
      setLastUpdatedAt(new Date().toISOString());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load queue dashboard.");
    } finally {
      setLoading(false);
    }
  }

  async function loadInvites() {
    if (!canManageInvites) {
      return;
    }

    try {
      const payload = await authRequestJsonList<Invitation>(`/v1/ops/shops/${slug}/invitations`);
      setInvites(unwrapList(payload));
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Failed to load invitations.");
    }
  }

  useEffect(() => {
    if (!ready || !isAuthenticated || !hasOpsAccess) {
      setLoading(false);
      return;
    }

    void loadDashboard();
    if (canManageInvites) {
      void loadInvites();
    }

    const socket = getSocket();
    socket.emit("shop:watch", slug);
    const handleUpdated = () => {
      void loadDashboard();
    };
    socket.on("shop:updated", handleUpdated);

    return () => {
      socket.off("shop:updated", handleUpdated);
    };
  }, [ready, isAuthenticated, hasOpsAccess, canManageInvites, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  async function postAction(path: string, busyToken: string, body?: unknown) {
    setBusyKey(busyToken);
    setError(null);

    try {
      await authRequestJson(path, {
        method: "POST",
        body
      });
      await loadDashboard();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action failed.");
    } finally {
      setBusyKey(null);
    }
  }

  async function createInvitation() {
    setBusyKey("invite");
    setError(null);

    try {
      const payload = await authRequestJson<Invitation>(`/v1/ops/shops/${slug}/invitations`, {
        method: "POST",
        body: {
          email: inviteEmail,
          firstName: inviteFirstName,
          lastName: inviteLastName,
          role: inviteRole,
          note: inviteNote
        }
      });

      const nextInvitation = unwrapItem(payload);
      if (nextInvitation) {
        setInvites((current) => [nextInvitation, ...current]);
      }
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Invitation failed.");
    } finally {
      setBusyKey(null);
    }
  }

  if (!ready) {
    return <p className="status-text">Preparing operator session...</p>;
  }

  if (!isAuthenticated) {
    return (
      <div className="auth-guard">
        <p className="status-text">Operator tools use the protected business APIs.</p>
        <Link className="button primary" href={`/signin?next=/ops/shops/${slug}`}>
          Sign In For Operations
        </Link>
      </div>
    );
  }

  if (!hasOpsAccess) {
    return (
      <p className="status-text warning">
        This account does not have owner, manager, or staff-operator access for live queue actions.
      </p>
    );
  }

  if (loading) {
    return <p className="status-text">Loading queue dashboard...</p>;
  }

  if (!item) {
    return <p className="status-text warning">{error ?? "Queue dashboard unavailable."}</p>;
  }

  const nextEntry = item.queueEntries[0] ?? null;
  const activeService = item.inServiceVisits[0] ?? null;
  const nextActionTitle = getNextActionTitle(nextEntry, activeService);
  const canStartNext = nextEntry ? canStartQueueEntry(nextEntry) : false;

  return (
    <div className="ops-shell">
      <div className="section-toolbar">
        <div>
          <strong>{item.shop.name}</strong>
          <p className="status-text">
            Signed in as {user?.firstName ?? "Q-App"} {user?.lastName ?? ""}
            {lastUpdatedAt ? ` · Live checked ${new Date(lastUpdatedAt).toLocaleTimeString()}` : ""}
          </p>
        </div>
        <button className="button" onClick={() => void loadDashboard()} type="button">
          Refresh
        </button>
      </div>

      {error ? <p className="status-text warning">{error}</p> : null}

      <div className="ops-summary-grid">
        <article className="summary-panel ops-count-panel">
          <strong>Live Queue</strong>
          <span>{item.queueEntries.length}</span>
          <p>
            {item.queueEntries.length === 1 ? "customer waiting" : "customers waiting"}
            <br />
            In service: {item.inServiceVisits.length}
            <br />
            Stations: {item.shop.serviceStationsCount}
          </p>
        </article>
        <article className="summary-panel">
          <strong>Smart Arrival</strong>
          <p>
            Near turn: top {item.shop.nearTurnPositionTrigger}
            <br />
            ETA trigger: {item.shop.nearTurnEtaTriggerMin} min
            <br />
            Grace: {item.shop.calledGracePeriodMin} min
          </p>
        </article>
        <article className="summary-panel">
          <strong>Customer Rating</strong>
          <p>
            {formatRating(item.reviewSummary)}
            <br />
            Recent feedback: {item.recentReviews.length}
          </p>
        </article>
        <article className="summary-panel">
          <strong>Queue State</strong>
          <p>
            Intake: {item.shop.queuePaused ? "Paused" : "Active"}
            <br />
            Reason: {item.shop.queuePauseReason ?? "None"}
            <br />
            Default walk-in: {item.shop.defaultWalkInDurationMin} min
          </p>
        </article>
      </div>

      <section className="card ops-now-card">
        <div>
          <span className="eyebrow">Do this now</span>
          <h2>{nextActionTitle}</h2>
          <p>
            {activeService
              ? "When the service is done, complete it here. Q-App will promote the next customer and refresh their wait screen."
              : nextEntry
                ? `Current status: ${formatQueueStatus(nextEntry)}. ETA shown: ${nextEntry.visit.estimatedWaitMin ?? "recalculating"} min.`
                : "No one is waiting. Keep walk-in intake ready and let customers join remotely."}
          </p>
        </div>
        <div className="ops-now-actions">
          {activeService ? (
            <button
              className="button primary"
              disabled={busyKey === `${activeService.id}:complete`}
              onClick={() =>
                void postAction(
                  `/v1/ops/shops/${slug}/visits/${activeService.id}/complete-service`,
                  `${activeService.id}:complete`
                )
              }
              type="button"
            >
              {busyKey === `${activeService.id}:complete` ? "Completing..." : "Complete Service"}
            </button>
          ) : nextEntry ? (
            <>
              {canStartNext ? (
                <button
                  className="button primary"
                  disabled={busyKey === `${nextEntry.id}:start`}
                  onClick={() =>
                    void postAction(
                      `/v1/ops/shops/${slug}/queue/${nextEntry.trackingToken}/start-service`,
                      `${nextEntry.id}:start`
                    )
                  }
                  type="button"
                >
                  {busyKey === `${nextEntry.id}:start` ? "Starting..." : "Start Service"}
                </button>
              ) : (
                <button
                  className="button primary"
                  disabled={busyKey === `${nextEntry.id}:call`}
                  onClick={() =>
                    void postAction(`/v1/ops/shops/${slug}/queue/${nextEntry.trackingToken}/call`, `${nextEntry.id}:call`)
                  }
                  type="button"
                >
                  {busyKey === `${nextEntry.id}:call` ? "Calling..." : "Call Customer"}
                </button>
              )}
              <button
                className="button button-danger"
                disabled={busyKey === `${nextEntry.id}:release`}
                onClick={() =>
                  void postAction(
                    `/v1/ops/shops/${slug}/queue/${nextEntry.trackingToken}/release-no-show`,
                    `${nextEntry.id}:release`,
                    {
                      reason: getReleaseReason(nextEntry)
                    }
                  )
                }
                type="button"
              >
                {busyKey === `${nextEntry.id}:release` ? "Releasing..." : "No-show / Promote Next"}
              </button>
            </>
          ) : (
            <Link className="button primary" href={`/shops/${slug}`}>
              Open Customer Join Page
            </Link>
          )}
        </div>
      </section>

      <div className="ops-tools-grid">
        <section className="card dashboard-column">
          <div className="card-kicker">
            <strong>Waiting Queue</strong>
            <span className="pill">{item.queueEntries.length} live</span>
          </div>
          {item.queueEntries.length === 0 ? (
            <p className="status-text">No waiting customers right now.</p>
          ) : (
            <div className="dashboard-list">
              {item.queueEntries.map((entry, index) => (
                <article className={index === 0 ? "dashboard-row dashboard-row-front" : "dashboard-row"} key={entry.id}>
                  <div>
                    <strong>{entry.visit.customer.firstName}</strong>
                    <p>
                      Position: {entry.sortIndex}
                      <br />
                      Status: {formatQueueStatus(entry)}
                      <br />
                      ETA: {entry.visit.estimatedWaitMin ?? "Pending"} min
                    </p>
                    <div className="status-stack">
                      <span
                        className={
                          entry.confirmationStatus === "COMING"
                            ? "pill pill-good"
                            : entry.confirmationStatus === "PENDING"
                              ? "pill pill-warn"
                              : "pill"
                        }
                      >
                        Confirmation: {entry.confirmationStatus}
                      </span>
                      {entry.confirmationRequestedAt ? (
                        <span className="status-text">
                          Asked at {new Date(entry.confirmationRequestedAt).toLocaleTimeString()}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="location-actions">
                    <button
                      className="button"
                      disabled={busyKey === `${entry.id}:call`}
                      onClick={() =>
                        void postAction(`/v1/ops/shops/${slug}/queue/${entry.trackingToken}/call`, `${entry.id}:call`)
                      }
                      type="button"
                    >
                      Call
                    </button>
                    <button
                      className="button primary"
                      disabled={busyKey === `${entry.id}:start` || !canStartQueueEntry(entry)}
                      onClick={() =>
                        void postAction(
                          `/v1/ops/shops/${slug}/queue/${entry.trackingToken}/start-service`,
                          `${entry.id}:start`
                        )
                      }
                      type="button"
                    >
                      {canStartQueueEntry(entry) ? "Start" : "Await Yes"}
                    </button>
                    <button
                      className="button button-danger"
                      disabled={busyKey === `${entry.id}:release`}
                      onClick={() =>
                        void postAction(
                          `/v1/ops/shops/${slug}/queue/${entry.trackingToken}/release-no-show`,
                          `${entry.id}:release`,
                          {
                            reason: getReleaseReason(entry)
                          }
                        )
                      }
                      type="button"
                    >
                      Release
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="card dashboard-column">
          <div className="card-kicker">
            <strong>Recently Missed</strong>
            <span className="pill">{item.missedQueueEntries.length} recoverable</span>
          </div>
          {item.missedQueueEntries.length === 0 ? (
            <p className="status-text">No missed customers to recover right now.</p>
          ) : (
            <div className="dashboard-list">
              {item.missedQueueEntries.map((entry) => (
                <article className="dashboard-row" key={entry.id}>
                  <div>
                    <strong>{entry.visit.customer.firstName}</strong>
                    <p>
                      Status: {entry.visit.status}
                      <br />
                      {getMissedAtLabel(entry)}
                    </p>
                    <p className="status-text">Use once only when staff agrees this customer should be served next.</p>
                  </div>
                  <button
                    className="button"
                    disabled={busyKey === `${entry.id}:reinstate`}
                    onClick={() =>
                      void postAction(
                        `/v1/ops/shops/${slug}/queue/${entry.trackingToken}/reinstate`,
                        `${entry.id}:reinstate`,
                        {
                          reason: "Customer arrived after missed turn"
                        }
                      )
                    }
                    type="button"
                  >
                    {busyKey === `${entry.id}:reinstate` ? "Restoring..." : "Reinstate Next"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="card dashboard-column">
          <div className="card-kicker">
            <strong>In Service</strong>
            <span className="pill pill-good">{item.inServiceVisits.length} active</span>
          </div>
          {item.inServiceVisits.length === 0 ? (
            <p className="status-text">No active services right now.</p>
          ) : (
            <div className="dashboard-list">
              {item.inServiceVisits.map((visit) => (
                <article className="dashboard-row" key={visit.id}>
                  <div>
                    <strong>{visit.customer.firstName}</strong>
                    <p>
                      Status: {visit.status}
                      <br />
                      Planned: {visit.plannedDurationMin ?? "Unknown"} min
                    </p>
                  </div>
                  <button
                    className="button primary"
                    disabled={busyKey === `${visit.id}:complete`}
                    onClick={() =>
                      void postAction(`/v1/ops/shops/${slug}/visits/${visit.id}/complete-service`, `${visit.id}:complete`)
                    }
                    type="button"
                  >
                    Complete
                  </button>
                  <div className="service-extension-controls">
                    <label className="field">
                      <span>Add minutes</span>
                      <input
                        min="1"
                        type="number"
                        value={extensionMinutes}
                        onChange={(event) => setExtensionMinutes(event.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>Reason</span>
                      <input value={extensionNote} onChange={(event) => setExtensionNote(event.target.value)} />
                    </label>
                    <button
                      className="button"
                      disabled={busyKey === `${visit.id}:extend` || Number(extensionMinutes) < 1}
                      onClick={() =>
                        void postAction(`/v1/ops/shops/${slug}/visits/${visit.id}/extend-service`, `${visit.id}:extend`, {
                          durationDeltaMin: Number(extensionMinutes),
                          label: extensionNote || "Extra service time",
                          notes: extensionNote || undefined
                        })
                      }
                      type="button"
                    >
                      {busyKey === `${visit.id}:extend` ? "Extending..." : "Extend Time"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="card dashboard-column">
          <div className="card-kicker">
            <strong>Walk-In Intake</strong>
            <span className="pill">Insert and recalculate</span>
          </div>
          <div className="signup-grid">
            <label className="field">
              <span>Name</span>
              <input value={walkInFirstName} onChange={(event) => setWalkInFirstName(event.target.value)} />
            </label>
            <label className="field">
              <span>Mobile</span>
              <input value={walkInPhone} onChange={(event) => setWalkInPhone(event.target.value)} />
            </label>
            <label className="field">
              <span>Duration Min</span>
              <input value={walkInDuration} onChange={(event) => setWalkInDuration(event.target.value)} />
            </label>
          </div>
          <button
            className="button primary"
            disabled={busyKey === "walkin"}
            onClick={() =>
              void postAction(`/v1/ops/shops/${slug}/walk-ins`, "walkin", {
                firstName: walkInFirstName,
                mobileNumber: walkInPhone || undefined,
                plannedDurationMin: Number(walkInDuration)
              })
            }
            type="button"
          >
            {busyKey === "walkin" ? "Adding..." : "Add Walk-In"}
          </button>
        </section>

        <section className="card dashboard-column">
          <div className="card-kicker">
            <strong>Queue Controls</strong>
            <span className={item.shop.queuePaused ? "pill pill-warn" : "pill pill-good"}>
              {item.shop.queuePaused ? "Paused" : "Active"}
            </span>
          </div>
          <label className="field">
            <span>Pause Reason</span>
            <input value={pauseReason} onChange={(event) => setPauseReason(event.target.value)} />
          </label>
          <div className="location-actions">
            <button
              className="button"
              disabled={busyKey === "pause"}
              onClick={() =>
                void postAction(`/v1/ops/shops/${slug}/pause-queue`, "pause", {
                  reason: pauseReason
                })
              }
              type="button"
            >
              Pause Queue
            </button>
            <button
              className="button primary"
              disabled={busyKey === "resume"}
              onClick={() => void postAction(`/v1/ops/shops/${slug}/resume-queue`, "resume")}
              type="button"
            >
              Resume Queue
            </button>
          </div>
        </section>

        <section className="card dashboard-column ops-wide">
          <div className="card-kicker">
            <strong>Customer Feedback</strong>
            <span className="pill">{formatRating(item.reviewSummary)}</span>
          </div>
          {item.recentReviews.length === 0 ? (
            <p className="status-text">No ratings or comments yet. Completed customer feedback will appear here.</p>
          ) : (
            <div className="dashboard-list">
              {item.recentReviews.map((review) => (
                <article className="dashboard-row" key={review.id}>
                  <div>
                    <strong>{review.customerName}</strong>
                    <p>
                      Rating: {review.rating ? `${review.rating}/5` : "No rating"}
                      <br />
                      {new Date(review.createdAt).toLocaleString()}
                    </p>
                    {review.comment ? <p className="status-callout">{review.comment}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {canManageInvites ? (
          <section className="card dashboard-column ops-wide">
            <div className="card-kicker">
              <strong>Team Invitations</strong>
              <span className="pill">{invites.length} loaded</span>
            </div>
            <div className="signup-grid">
              <label className="field">
                <span>Email</span>
                <input value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} />
              </label>
              <label className="field">
                <span>Role</span>
                <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}>
                  <option value="MANAGER">MANAGER</option>
                  <option value="STAFF_OPERATOR">STAFF_OPERATOR</option>
                  <option value="ADMIN_SUPPORT">ADMIN_SUPPORT</option>
                </select>
              </label>
              <label className="field">
                <span>First Name</span>
                <input value={inviteFirstName} onChange={(event) => setInviteFirstName(event.target.value)} />
              </label>
              <label className="field">
                <span>Last Name</span>
                <input value={inviteLastName} onChange={(event) => setInviteLastName(event.target.value)} />
              </label>
              <label className="field field-wide">
                <span>Note</span>
                <input value={inviteNote} onChange={(event) => setInviteNote(event.target.value)} />
              </label>
            </div>
            <div className="location-actions">
              <button className="button" onClick={() => void loadInvites()} type="button">
                Refresh Invites
              </button>
              <button
                className="button primary"
                disabled={busyKey === "invite"}
                onClick={() => void createInvitation()}
                type="button"
              >
                {busyKey === "invite" ? "Creating..." : "Create Invite"}
              </button>
            </div>
            <div className="dashboard-list">
              {invites.length === 0 ? (
                <p className="status-text">No invitations loaded yet.</p>
              ) : (
                invites.map((invite) => (
                  <article className="dashboard-row" key={invite.id}>
                    <div>
                      <strong>{invite.email}</strong>
                      <p>
                        Role: {invite.role}
                        <br />
                        Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={invite.acceptedAt ? "pill pill-good" : "pill"}>
                      {invite.acceptedAt ? "Accepted" : "Pending"}
                    </span>
                  </article>
                ))
              )}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
