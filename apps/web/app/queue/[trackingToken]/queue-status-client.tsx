"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { LiveWaitTimer } from "../../components/live-wait-timer";
import { requestJson, unwrapItem } from "../../lib/api";
import { getSocket } from "../../lib/socket";

type QueueStatus = {
  trackingToken: string;
  position: number | null;
  queueLength: number;
  estimatedWaitMin: number | null;
  plannedDurationMin: number | null;
  actualDurationMin: number | null;
  confirmationStatus: string;
  confirmationRequestedAt: string | null;
  confirmationRespondedAt: string | null;
  calledAt: string | null;
  queueJoinedAt: string | null;
  readyAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  arrivalConfirmationSentAt: string | null;
  nearTurnNotifiedAt: string | null;
  responseWindowEndsAt: string | null;
  canRespondToArrival: boolean;
  feedbackSubmitted: boolean;
  visitStatus: string;
  joinedAt: string;
  customer: {
    firstName: string;
  };
  shop: {
    slug: string;
    name: string;
    city: string;
    queuePaused: boolean;
  };
};

function minutesBetween(start?: string | null, end?: string | null) {
  if (!start || !end) {
    return null;
  }

  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) {
    return null;
  }

  return Math.max(1, Math.round((endTime - startTime) / 60000));
}

function formatPosition(position: number | null, visitStatus: string) {
  if (visitStatus === "NO_SHOW" || visitStatus === "MISSED" || visitStatus === "CANCELLED") {
    return "Released";
  }

  if (visitStatus === "IN_SERVICE") {
    return "On seat";
  }

  if (visitStatus === "COMPLETED") {
    return "Finished";
  }

  if (visitStatus === "CALLED" || visitStatus === "READY") {
    return "Your turn";
  }

  if (position === null) {
    return "Updating";
  }

  if (position === 1) {
    return "You are next";
  }

  return `#${position}`;
}

function formatWait(minutes: number | null, visitStatus: string) {
  if (visitStatus === "NO_SHOW" || visitStatus === "MISSED" || visitStatus === "CANCELLED") {
    return "Place released";
  }

  if (visitStatus === "IN_SERVICE") {
    return "Being served";
  }

  if (visitStatus === "COMPLETED") {
    return "All done";
  }

  if (visitStatus === "CALLED" || visitStatus === "READY") {
    return "Go now";
  }

  if (minutes === null) {
    return "Calculating";
  }

  if (minutes <= 1) {
    return "Any moment";
  }

  return `${minutes} min`;
}

function getCustomerStatusMessage(item: QueueStatus, awaitingArrivalResponse: boolean) {
  if (awaitingArrivalResponse) {
    return "The shop needs a quick answer now.";
  }

  if (item.visitStatus === "NO_SHOW" || item.visitStatus === "MISSED") {
    return "Your place was released so the next customer could be promoted. You can rejoin if you still need the service.";
  }

  if (item.visitStatus === "CANCELLED") {
    return "Your place has been released. You can rejoin the queue if your plans change.";
  }

  if (item.visitStatus === "COMPLETED") {
    return "Your visit is finished. Thanks for using Q-App instead of standing around.";
  }

  if (item.visitStatus === "IN_SERVICE") {
    return "You are on seat now. The queue did its job.";
  }

  if (item.visitStatus === "CALLED" || item.visitStatus === "READY") {
    return "It is your turn now. Head in and let the shop know you are here.";
  }

  if (item.confirmationStatus === "COMING") {
    return "You told the shop you are coming. Keep heading over.";
  }

  if (item.confirmationStatus === "EXPIRED") {
    return "Your response window expired, so this place may be released.";
  }

  return "Your place is held. You can keep this page open and avoid standing around.";
}

function getJourneySteps(item: QueueStatus, awaitingArrivalResponse: boolean) {
  const isReleased = item.visitStatus === "NO_SHOW" || item.visitStatus === "MISSED" || item.visitStatus === "CANCELLED";
  const isCompleted = item.visitStatus === "COMPLETED";
  const isInService = item.visitStatus === "IN_SERVICE";
  const wasCalled = Boolean(item.calledAt) || item.visitStatus === "CALLED" || item.visitStatus === "READY" || isInService || isCompleted;
  const wasPrompted = Boolean(item.confirmationRequestedAt) || wasCalled;

  return [
    {
      label: "Joined",
      detail: item.joinedAt ? new Date(item.joinedAt).toLocaleTimeString() : "Place created",
      state: "done"
    },
    {
      label: "Live wait",
      detail: item.estimatedWaitMin === null ? "Queue is recalculating" : `${item.estimatedWaitMin} min shown now`,
      state: isReleased || wasPrompted ? "done" : "active"
    },
    {
      label: "Are you coming?",
      detail: awaitingArrivalResponse
        ? "Answer now"
        : item.confirmationStatus === "COMING"
          ? "You confirmed"
          : item.confirmationStatus === "DECLINED" || item.confirmationStatus === "EXPIRED"
            ? "Place released"
            : "Q-App will ask near your turn",
      state: isReleased ? "warning" : awaitingArrivalResponse ? "active" : wasPrompted ? "done" : "pending"
    },
    {
      label: isReleased ? "Released" : "In chair",
      detail: isReleased
        ? "Next customer promoted"
        : isInService
          ? "Service started"
          : isCompleted
            ? "Service finished"
            : "Not yet",
      state: isReleased ? "warning" : isInService ? "active" : isCompleted ? "done" : "pending"
    },
    {
      label: "Finished",
      detail: isCompleted ? "Feedback unlocked" : "Thank-you appears here",
      state: isCompleted ? "done" : "pending"
    }
  ];
}

function canLeaveQueue(item: QueueStatus) {
  return ["QUEUED", "CONFIRMATION_PENDING", "CALLED", "READY"].includes(item.visitStatus);
}

export function QueueStatusClient({ trackingToken }: { trackingToken: string }) {
  const [item, setItem] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [responding, setResponding] = useState<"COMING" | "DECLINED" | null>(null);
  const [leavingQueue, setLeavingQueue] = useState(false);
  const [leaveMessage, setLeaveMessage] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadStatus() {
      setLoading(true);
      setError(null);

      try {
        if (active) {
          const payload = await requestJson<QueueStatus>(`/v1/queue/status/${trackingToken}`);
          setItem(unwrapItem(payload));
          setLastUpdatedAt(new Date().toISOString());
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load queue status.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadStatus();
    const socket = getSocket();
    socket.emit("queue:watch", trackingToken);
    const handleUpdated = () => {
      void loadStatus();
    };
    socket.on("queue:updated", handleUpdated);

    return () => {
      active = false;
      socket.off("queue:updated", handleUpdated);
    };
  }, [trackingToken]);

  async function sendArrivalResponse(response: "COMING" | "DECLINED") {
    setResponding(response);
    setError(null);

    try {
      await requestJson(`/v1/queue/status/${trackingToken}/respond-arrival`, {
        method: "POST",
        body: {
          response
        }
      });
      const refreshed = await requestJson<QueueStatus>(`/v1/queue/status/${trackingToken}`);
      setItem(unwrapItem(refreshed));
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : "Failed to respond.");
    } finally {
      setResponding(null);
    }
  }

  async function leaveQueue() {
    setLeavingQueue(true);
    setLeaveMessage(null);
    setError(null);

    try {
      await requestJson(`/v1/queue/status/${trackingToken}/leave`, {
        method: "POST",
        body: {
          reason: "Customer left queue from status page"
        }
      });
      setLeaveMessage("Your place has been released. The next customer can move forward.");
      const refreshed = await requestJson<QueueStatus>(`/v1/queue/status/${trackingToken}`);
      setItem(unwrapItem(refreshed));
    } catch (leaveError) {
      setLeaveMessage(leaveError instanceof Error ? leaveError.message : "Could not leave queue.");
    } finally {
      setLeavingQueue(false);
    }
  }

  async function submitFeedback() {
    setFeedbackBusy(true);
    setFeedbackMessage(null);
    setError(null);

    try {
      await requestJson(`/v1/queue/status/${trackingToken}/feedback`, {
        method: "POST",
        body: {
          rating: feedbackRating ?? undefined,
          comment: feedbackComment.trim() || undefined
        }
      });
      setFeedbackMessage("Thanks. Your feedback helps this shop improve.");
      const refreshed = await requestJson<QueueStatus>(`/v1/queue/status/${trackingToken}`);
      setItem(unwrapItem(refreshed));
    } catch (feedbackError) {
      setFeedbackMessage(feedbackError instanceof Error ? feedbackError.message : "Feedback could not be sent.");
    } finally {
      setFeedbackBusy(false);
    }
  }

  if (loading) {
    return <p className="status-text">Loading queue status...</p>;
  }

  if (error) {
    return <p className="status-text warning">{error}</p>;
  }

  if (!item) {
    return <p className="status-text">Queue status not found.</p>;
  }

  const awaitingArrivalResponse = item.canRespondToArrival;
  const responseWindowLabel = item.responseWindowEndsAt
    ? new Date(item.responseWindowEndsAt).toLocaleTimeString()
    : null;
  const joinedAt = item.queueJoinedAt ?? item.joinedAt;
  const serviceStartOrEnd = item.startedAt ?? item.completedAt;
  const savedWaitMin = minutesBetween(joinedAt, serviceStartOrEnd);
  const hasFeedback = item.feedbackSubmitted || Boolean(feedbackMessage?.startsWith("Thanks"));
  const calmMessage = getCustomerStatusMessage(item, awaitingArrivalResponse);
  const journeySteps = getJourneySteps(item, awaitingArrivalResponse);
  const canSelfRemove = canLeaveQueue(item);
  const isWaitingForTurn = item.visitStatus === "QUEUED" || item.visitStatus === "CONFIRMATION_PENDING";
  const waitTerminalLabel = isWaitingForTurn ? undefined : formatWait(item.estimatedWaitMin, item.visitStatus);

  return (
    <div className="customer-flow-grid">
      <article className="card shop-detail-card queue-live-card">
        <span className="eyebrow">{item.shop.name}</span>
        <h2>{item.customer.firstName}, {item.visitStatus === "COMPLETED" ? "thanks for joining." : "your queue place is live."}</h2>
        <div className="queue-snapshot-grid">
          <div>
            <span>Your place</span>
            <strong>{formatPosition(item.position, item.visitStatus)}</strong>
          </div>
          <div>
            <LiveWaitTimer
              minutes={item.estimatedWaitMin}
              updatedAt={lastUpdatedAt}
              variant="inline"
              terminalLabel={waitTerminalLabel}
              paused={item.shop.queuePaused}
            />
          </div>
          <div>
            <span>Queue size</span>
            <strong>{item.queueLength}</strong>
          </div>
        </div>
        <p>{calmMessage}</p>
        <div className="queue-journey" aria-label="Queue journey">
          {journeySteps.map((step) => (
            <div className={`queue-step queue-step-${step.state}`} key={step.label}>
              <span className="queue-step-marker" />
              <div>
                <strong>{step.label}</strong>
                <small>{step.detail}</small>
              </div>
            </div>
          ))}
        </div>
        {lastUpdatedAt ? (
          <p className="live-stamp">Live update checked at {new Date(lastUpdatedAt).toLocaleTimeString()}</p>
        ) : null}
        {savedWaitMin ? (
          <p className="status-callout good">
            Q-App saved you about {savedWaitMin} minutes of standing-around time on this visit.
          </p>
        ) : null}
        {item.nearTurnNotifiedAt ? (
          <p className="status-callout">
            You were alerted near your turn at {new Date(item.nearTurnNotifiedAt).toLocaleTimeString()}.
          </p>
        ) : null}
        {awaitingArrivalResponse ? (
          <div className="status-panel status-panel-warn">
            <strong>Are you coming?</strong>
            <p>
              Confirm before {responseWindowLabel ?? "the timer ends"} or Q-App will release your place and
              promote the next customer.
            </p>
            <div className="location-actions">
              <button
                className="button primary"
                disabled={responding !== null}
                onClick={() => void sendArrivalResponse("COMING")}
                type="button"
              >
                {responding === "COMING" ? "Confirming..." : "Yes, I am coming"}
              </button>
              <button
                className="button"
                disabled={responding !== null}
                onClick={() => void sendArrivalResponse("DECLINED")}
                type="button"
              >
                {responding === "DECLINED" ? "Releasing..." : "No, release my place"}
              </button>
            </div>
          </div>
        ) : null}
        {!awaitingArrivalResponse && item.visitStatus === "READY" ? (
          <p className="status-callout good">You confirmed. The shop can call you next.</p>
        ) : null}
        {!awaitingArrivalResponse && item.visitStatus === "IN_SERVICE" ? (
          <p className="status-callout good">You are being served now. We will show a thank-you screen when the visit is completed.</p>
        ) : null}
        {!awaitingArrivalResponse && item.confirmationStatus === "EXPIRED" ? (
          <p className="status-callout warning">Your confirmation window expired, so this place was released.</p>
        ) : null}
        {!awaitingArrivalResponse && (item.visitStatus === "NO_SHOW" || item.visitStatus === "MISSED") ? (
          <p className="status-callout warning">
            Your place is no longer held. The next customer has been promoted so the shop can keep moving.
          </p>
        ) : null}
        {canSelfRemove ? (
          <div className="status-panel status-panel-subtle">
            <strong>Plans changed?</strong>
            <p>Leave the queue yourself so the shop can keep the wait time honest for everyone behind you.</p>
            <button className="button button-danger" disabled={leavingQueue} onClick={() => void leaveQueue()} type="button">
              {leavingQueue ? "Releasing..." : "Leave queue"}
            </button>
            {leaveMessage ? <p className="status-text">{leaveMessage}</p> : null}
          </div>
        ) : null}
        {item.visitStatus === "COMPLETED" ? (
          <div className="status-panel">
            <strong>{hasFeedback ? "Thanks for the feedback." : "How was this visit?"}</strong>
            <p>
              Optional feedback helps the shop improve. Total time saved across all visits will come later
              when Q-App adds customer accounts.
            </p>
            {!hasFeedback ? (
              <>
                <div className="rating-row" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      className={feedbackRating === rating ? "rating-button rating-button-active" : "rating-button"}
                      key={rating}
                      onClick={() => setFeedbackRating(rating)}
                      type="button"
                    >
                      {rating}
                    </button>
                  ))}
                </div>
                <label className="field">
                  <span>Optional comment</span>
                  <textarea
                    placeholder="Anything the shop should know?"
                    value={feedbackComment}
                    onChange={(event) => setFeedbackComment(event.target.value)}
                  />
                </label>
                <button
                  className="button primary"
                  disabled={feedbackBusy || (!feedbackRating && !feedbackComment.trim())}
                  onClick={() => void submitFeedback()}
                  type="button"
                >
                  {feedbackBusy ? "Sending..." : "Send feedback"}
                </button>
              </>
            ) : null}
            {feedbackMessage ? <p className="status-text">{feedbackMessage}</p> : null}
          </div>
        ) : null}
        <div className="shop-card-footer">
          <span className={item.shop.queuePaused ? "pill" : "pill pill-good"}>
            {item.shop.queuePaused ? "Queue paused" : "Queue active"}
          </span>
          <Link className="button" href={`/shops/${item.shop.slug}`}>
            Back to Shop
          </Link>
        </div>
      </article>

      <article className="card shop-detail-card">
        <span className="eyebrow">What happens next</span>
        <h2>Wait without guessing.</h2>
        <ol className="list">
          <li>While waiting, Q-App keeps your position and live wait visible.</li>
          <li>When the owner calls or starts your service, this page updates automatically.</li>
          <li>When your visit is finished, Q-App shows a thank-you and optional feedback.</li>
          <li>Lifetime saved-time stats will come later with customer accounts.</li>
        </ol>
      </article>
    </div>
  );
}
