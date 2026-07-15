"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { LiveWaitTimer } from "../../components/live-wait-timer";
import { requestJson, unwrapItem } from "../../lib/api";
import { loadGuestQueueProfile, saveGuestQueueProfile } from "../../lib/guest-profile";

type Shop = {
  id: string;
  slug: string;
  name: string;
  city: string;
  region?: string | null;
  countryCode: string;
  addressLine1: string;
  postalCode?: string | null;
  publicDescription?: string | null;
  logoImageUrl?: string | null;
  coverImageUrl?: string | null;
  serviceStationsCount: number;
  industryType: string;
  distanceKm?: number | null;
  queueEnabled: boolean;
  queuePaused: boolean;
  queueLength: number;
  estimatedWaitMin: number;
  reviewSummary: {
    averageRating: number | null;
    ratingCount: number;
  };
  reviews: Array<{
    id: string;
    rating: number | null;
    comment: string | null;
    createdAt: string;
    customerName: string;
  }>;
};

type JoinStartResponse = {
  challengeId: string;
  expiresAt: string;
  message: string;
  codePreview?: string;
  pilotMode?: boolean;
};

type JoinVerifyResponse = {
  alreadyJoined: boolean;
  queueStatus: {
    trackingToken: string;
  };
};

function formatQueueLength(queueLength: number) {
  if (queueLength === 0) {
    return "No one is waiting";
  }

  if (queueLength === 1) {
    return "1 person is waiting";
  }

  return `${queueLength} people are waiting`;
}

function getWaitMessage(minutes: number) {
  if (minutes <= 10) {
    return "This is a good time to join.";
  }

  if (minutes <= 25) {
    return "Join now, then use the wait time for yourself.";
  }

  return "It is busy, but at least you know before you go.";
}

function formatRating(summary: Shop["reviewSummary"]) {
  if (!summary.averageRating || summary.ratingCount === 0) {
    return "No ratings yet";
  }

  return `${summary.averageRating.toFixed(1)} from ${summary.ratingCount} rating${summary.ratingCount === 1 ? "" : "s"}`;
}

export function ShopDetailClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [item, setItem] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [challenge, setChallenge] = useState<JoinStartResponse | null>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [shopUpdatedAt, setShopUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const savedProfile = loadGuestQueueProfile();

    if (savedProfile) {
      setName((current) => current || savedProfile.firstName);
      setMobileNumber((current) => current || savedProfile.mobileNumber);
    }

    async function loadShop(silent = false) {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      try {
        if (active) {
          const payload = await requestJson<Shop>(`/v1/shops/${slug}`);
          setItem(unwrapItem(payload));
          setShopUpdatedAt(new Date().toISOString());
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load shop.");
        }
      } finally {
        if (active && !silent) {
          setLoading(false);
        }
      }
    }

    void loadShop();
    const refreshInterval = window.setInterval(() => {
      void loadShop(true);
    }, 30_000);

    return () => {
      active = false;
      window.clearInterval(refreshInterval);
    };
  }, [slug]);

  async function handleStartJoin() {
    setJoinError(null);
    setJoinLoading(true);

    try {
      const payload = await requestJson<JoinStartResponse>("/v1/queue/join/start", {
        method: "POST",
        body: {
          shopSlug: slug,
          firstName: name,
          mobileNumber
        }
      });
      setChallenge(unwrapItem(payload));
    } catch (startError) {
      setJoinError(startError instanceof Error ? startError.message : "Failed to start queue join.");
    } finally {
      setJoinLoading(false);
    }
  }

  async function handleVerifyJoin() {
    if (!challenge) {
      return;
    }

    setJoinError(null);
    setVerifying(true);

    try {
      const payload = await requestJson<JoinVerifyResponse>("/v1/queue/join/verify", {
        method: "POST",
        body: {
          challengeId: challenge.challengeId,
          code: otpCode
        }
      });
      const item = unwrapItem(payload);
      if (!item) {
        throw new Error("Queue join verification returned no queue status.");
      }
      saveGuestQueueProfile({
        firstName: name,
        mobileNumber,
        lastShopSlug: slug,
        lastTrackingToken: item.queueStatus.trackingToken
      });
      router.push(`/queue/${item.queueStatus.trackingToken}`);
    } catch (verifyError) {
      setJoinError(verifyError instanceof Error ? verifyError.message : "Failed to verify queue join.");
    } finally {
      setVerifying(false);
    }
  }

  if (loading) {
    return <p className="status-text">Loading shop details...</p>;
  }

  if (error) {
    return <p className="status-text warning">{error}</p>;
  }

  if (!item) {
    return <p className="status-text">Shop not found.</p>;
  }

  const queueOpen = item.queueEnabled && !item.queuePaused;
  const distanceLabel =
    typeof item.distanceKm === "number" ? `${item.distanceKm} km away` : "Distance unavailable";
  const industryLabel = item.industryType.toLowerCase().replaceAll("_", " ");
  const visibleReviews = showAllReviews ? item.reviews : item.reviews.slice(0, 2);

  return (
    <div className="customer-flow-grid">
      <article className="card shop-detail-card shop-decision-card">
        {item.coverImageUrl ? (
          <img className="shop-cover-image" src={item.coverImageUrl} alt={`${item.name} cover`} />
        ) : null}
        <div className="shop-card-footer">
          <span className={queueOpen ? "pill pill-good" : "pill"}>
            {queueOpen ? "Queue open" : "Queue paused"}
          </span>
          <span className="pill">{distanceLabel}</span>
        </div>
        <div>
          <span className="eyebrow">{industryLabel}</span>
          {item.logoImageUrl ? (
            <img className="shop-logo-image" src={item.logoImageUrl} alt={`${item.name} logo`} />
          ) : null}
          <h2>{item.name}</h2>
          <p className="status-text">{formatRating(item.reviewSummary)}</p>
          {item.publicDescription ? <p>{item.publicDescription}</p> : null}
        </div>
        <LiveWaitTimer
          minutes={item.estimatedWaitMin}
          updatedAt={shopUpdatedAt}
          label="Estimated wait"
          helper={getWaitMessage(item.estimatedWaitMin)}
          variant="hero"
          terminalLabel={queueOpen ? undefined : "Paused"}
        />
        <div className="queue-snapshot-grid">
          <div>
            <span>Queue now</span>
            <strong>{formatQueueLength(item.queueLength)}</strong>
          </div>
          <div>
            <span>Capacity</span>
            <strong>{item.serviceStationsCount} stations</strong>
          </div>
        </div>
        <p>
          {item.addressLine1}
          <br />
          {item.city}
          {item.region ? `, ${item.region}` : ""}
          {item.postalCode ? ` ${item.postalCode}` : ""}
          <br />
          {item.countryCode}
        </p>
      </article>

      <article className="card shop-detail-card join-decision-card">
        <span className="eyebrow">Hold your place</span>
        <h2>Join in under a minute.</h2>
        <p>No customer account. No service selection. Just name, phone, and a quick verification code.</p>
        <div className="signup-grid">
          <label className="field field-wide">
            <span>Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="field field-wide">
            <span>Mobile Number</span>
            <input value={mobileNumber} onChange={(event) => setMobileNumber(event.target.value)} />
          </label>
        </div>
        {joinError ? <p className="status-text warning">{joinError}</p> : null}
        {!challenge ? (
          <div className="shop-card-footer">
            <button
              className="button primary"
              disabled={!queueOpen || joinLoading || !name.trim() || !mobileNumber.trim()}
              onClick={() => void handleStartJoin()}
              type="button"
            >
              {joinLoading ? "Sending code..." : "Send code and join"}
            </button>
            <Link className="button" href="/shops">
              Choose another shop
            </Link>
          </div>
        ) : (
          <div className="signup-shell">
            <p className="status-text">
              {challenge.pilotMode
                ? "Pilot mode: no SMS is sent. Use the code below."
                : `Enter the code we sent to your phone. It expires at ${new Date(challenge.expiresAt).toLocaleTimeString()}.`}
            </p>
            {challenge.codePreview ? (
              <p className="status-text">
                Your code:
                {" "}
                <code className="inline" style={{ fontSize: "1.4em", letterSpacing: "0.2em" }}>{challenge.codePreview}</code>
              </p>
            ) : null}
            <label className="field">
              <span>OTP Code</span>
              <input value={otpCode} onChange={(event) => setOtpCode(event.target.value)} />
            </label>
            <div className="shop-card-footer">
              <button
                className="button primary"
                disabled={verifying || !otpCode.trim()}
                onClick={() => void handleVerifyJoin()}
                type="button"
              >
                {verifying ? "Verifying..." : "Verify and join queue"}
              </button>
            </div>
          </div>
        )}
        {!queueOpen ? (
          <p className="status-callout warning">This queue is paused right now. You can check another shop nearby.</p>
        ) : null}
      </article>

      <article className="card shop-detail-card reviews-card">
        <div className="card-kicker">
          <div>
            <span className="eyebrow">Customer feedback</span>
            <strong>{formatRating(item.reviewSummary)}</strong>
          </div>
          <span className="pill">{item.reviews.length} comments</span>
        </div>
        {item.reviews.length === 0 ? (
          <p className="status-text">No customer comments yet. You can be one of the first after your visit.</p>
        ) : (
          <div className="review-list">
            {visibleReviews.map((review) => (
              <article className="review-card" key={review.id}>
                <div className="shop-card-footer">
                  <strong>{review.customerName}</strong>
                  <span className={review.rating ? "pill pill-good" : "pill"}>
                    {review.rating ? `${review.rating}/5` : "Comment"}
                  </span>
                </div>
                <p>{review.comment}</p>
              </article>
            ))}
          </div>
        )}
        {item.reviews.length > 2 ? (
          <button className="button" onClick={() => setShowAllReviews((current) => !current)} type="button">
            {showAllReviews ? "Show top comments" : `Read all ${item.reviews.length} comments`}
          </button>
        ) : null}
      </article>
    </div>
  );
}
