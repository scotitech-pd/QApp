"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LiveWaitTimer } from "../components/live-wait-timer";
import { requestJson, requestJsonList, unwrapItem, unwrapList } from "../lib/api";
import {
  GuestQueueProfile,
  loadGuestQueueProfile,
  saveGuestQueueProfile
} from "../lib/guest-profile";

type Shop = {
  id: string;
  slug: string;
  name: string;
  city: string;
  region?: string | null;
  addressLine1: string;
  postalCode?: string | null;
  publicDescription?: string | null;
  serviceStationsCount: number;
  industryType: string;
  distanceKm?: number | null;
  queueEnabled: boolean;
  queuePaused: boolean;
  queueLength: number;
  estimatedWaitMin: number;
  bestJoinScore: number;
  bestJoinReason: string;
  isFavorite: boolean;
  reviewSummary: {
    averageRating: number | null;
    ratingCount: number;
  };
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
    return "No one waiting";
  }

  if (queueLength === 1) {
    return "1 person waiting";
  }

  return `${queueLength} people waiting`;
}

function getWaitMood(minutes: number) {
  if (minutes <= 10) {
    return "Quick window";
  }

  if (minutes <= 25) {
    return "Worth planning";
  }

  return "Busy now";
}

function formatRating(summary: Shop["reviewSummary"]) {
  if (!summary.averageRating || summary.ratingCount === 0) {
    return "New";
  }

  return `${summary.averageRating.toFixed(1)} rating (${summary.ratingCount})`;
}

export function ShopsClient() {
  const router = useRouter();
  const [items, setItems] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favoriteBusySlug, setFavoriteBusySlug] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState("Using general approved shop list.");
  const [shopsUpdatedAt, setShopsUpdatedAt] = useState<string | null>(null);
  const [guestProfile, setGuestProfile] = useState<GuestQueueProfile | null>(null);
  const [quickJoinShop, setQuickJoinShop] = useState<Shop | null>(null);
  const [quickName, setQuickName] = useState("");
  const [quickMobileNumber, setQuickMobileNumber] = useState("");
  const [quickOtpCode, setQuickOtpCode] = useState("");
  const [quickChallenge, setQuickChallenge] = useState<JoinStartResponse | null>(null);
  const [quickJoinError, setQuickJoinError] = useState<string | null>(null);
  const [quickJoinBusy, setQuickJoinBusy] = useState<"start" | "verify" | null>(null);

  useEffect(() => {
    let active = true;
    let refreshInterval: number | null = null;
    const savedProfile = loadGuestQueueProfile();

    if (savedProfile) {
      setGuestProfile(savedProfile);
      setQuickName(savedProfile.firstName);
      setQuickMobileNumber(savedProfile.mobileNumber);
    }

    async function loadShops(latitude?: number, longitude?: number, silent = false) {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams();
        if (typeof latitude === "number" && typeof longitude === "number") {
          params.set("latitude", String(latitude));
          params.set("longitude", String(longitude));
        }

        if (active) {
          const payload = await requestJsonList<Shop>(`/v1/shops?${params.toString()}`);
          setItems(unwrapList(payload));
          setShopsUpdatedAt(new Date().toISOString());
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load shops.");
        }
      } finally {
        if (active && !silent) {
          setLoading(false);
        }
      }
    }

    function startQuietRefresh(latitude?: number, longitude?: number) {
      refreshInterval = window.setInterval(() => {
        void loadShops(latitude, longitude, true);
      }, 30_000);
    }

    if (!navigator.geolocation) {
      void loadShops();
      startQuietRefresh();
      return () => {
        active = false;
        if (refreshInterval) {
          window.clearInterval(refreshInterval);
        }
      };
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!active) {
          return;
        }

        setLocationStatus("Sorted using your current location.");
        void loadShops(position.coords.latitude, position.coords.longitude);
        startQuietRefresh(position.coords.latitude, position.coords.longitude);
      },
      () => {
        if (!active) {
          return;
        }

        setLocationStatus("Location access was denied. Showing approved shops without distance sorting.");
        void loadShops();
        startQuietRefresh();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000
      }
    );

    return () => {
      active = false;
      if (refreshInterval) {
        window.clearInterval(refreshInterval);
      }
    };
  }, []);

  async function toggleFavorite(shop: Shop) {
    setFavoriteBusySlug(shop.slug);
    setError(null);
    setItems((current) =>
      current.map((item) => (item.id === shop.id ? { ...item, isFavorite: !shop.isFavorite } : item))
    );

    try {
      await requestJson(`/v1/preferences/favorites/${shop.slug}`, {
        method: shop.isFavorite ? "DELETE" : "PUT"
      });
    } catch (favoriteError) {
      setItems((current) =>
        current.map((item) => (item.id === shop.id ? { ...item, isFavorite: shop.isFavorite } : item))
      );
      setError(favoriteError instanceof Error ? favoriteError.message : "Could not update favourite.");
    } finally {
      setFavoriteBusySlug(null);
    }
  }

  function resetQuickJoin(shop: Shop) {
    const savedProfile = loadGuestQueueProfile();
    setGuestProfile(savedProfile);
    setQuickJoinShop(shop);
    setQuickName(savedProfile?.firstName ?? "");
    setQuickMobileNumber(savedProfile?.mobileNumber ?? "");
    setQuickOtpCode("");
    setQuickChallenge(null);
    setQuickJoinError(null);
  }

  async function startQuickJoin(shop: Shop, profile?: GuestQueueProfile | null) {
    const firstName = profile?.firstName ?? quickName;
    const mobileNumber = profile?.mobileNumber ?? quickMobileNumber;

    if (!firstName.trim() || !mobileNumber.trim()) {
      setQuickJoinError("Add your name and mobile number to join this queue.");
      return;
    }

    setQuickJoinBusy("start");
    setQuickJoinError(null);

    try {
      const payload = await requestJson<JoinStartResponse>("/v1/queue/join/start", {
        method: "POST",
        body: {
          shopSlug: shop.slug,
          firstName,
          mobileNumber
        }
      });
      setQuickName(firstName);
      setQuickMobileNumber(mobileNumber);
      setQuickChallenge(unwrapItem(payload));
    } catch (startError) {
      setQuickJoinError(startError instanceof Error ? startError.message : "Failed to start queue join.");
    } finally {
      setQuickJoinBusy(null);
    }
  }

  function handleCardJoin(shop: Shop) {
    resetQuickJoin(shop);
    const savedProfile = loadGuestQueueProfile();

    if (savedProfile) {
      void startQuickJoin(shop, savedProfile);
    }
  }

  async function verifyQuickJoin() {
    if (!quickChallenge || !quickJoinShop) {
      return;
    }

    setQuickJoinBusy("verify");
    setQuickJoinError(null);

    try {
      const payload = await requestJson<JoinVerifyResponse>("/v1/queue/join/verify", {
        method: "POST",
        body: {
          challengeId: quickChallenge.challengeId,
          code: quickOtpCode
        }
      });
      const item = unwrapItem(payload);

      if (!item) {
        throw new Error("Queue join verification returned no queue status.");
      }

      saveGuestQueueProfile({
        firstName: quickName,
        mobileNumber: quickMobileNumber,
        lastShopSlug: quickJoinShop.slug,
        lastTrackingToken: item.queueStatus.trackingToken
      });
      setGuestProfile(loadGuestQueueProfile());
      router.push(`/queue/${item.queueStatus.trackingToken}`);
    } catch (verifyError) {
      setQuickJoinError(verifyError instanceof Error ? verifyError.message : "Failed to verify queue join.");
    } finally {
      setQuickJoinBusy(null);
    }
  }

  if (loading) {
    return <p className="status-text">Loading nearby approved shops...</p>;
  }

  if (error) {
    return <p className="status-text warning">{error}</p>;
  }

  if (items.length === 0) {
    return <p className="status-text">No approved shops are live yet.</p>;
  }

  const favoriteItems = items.filter((item) => item.isFavorite);
  const bestItems = items;

  function renderShopCard(item: Shop, variant?: "compact" | "best") {
    const queueOpen = item.queueEnabled && !item.queuePaused;

    return (
      <article className={variant === "best" ? "card shop-card shop-card-best" : "card shop-card"} key={item.id}>
        <div className="shop-card-topline">
          <span className={queueOpen ? "pill pill-good" : "pill"}>{queueOpen ? item.bestJoinReason : "Queue paused"}</span>
          <button
            className={item.isFavorite ? "favorite-button favorite-button-active" : "favorite-button"}
            disabled={favoriteBusySlug === item.slug}
            onClick={() => void toggleFavorite(item)}
            type="button"
            aria-pressed={item.isFavorite}
          >
            {item.isFavorite ? "Favourite saved" : "Save favourite"}
          </button>
        </div>
        <LiveWaitTimer
          minutes={item.estimatedWaitMin}
          updatedAt={shopsUpdatedAt}
          helper={getWaitMood(item.estimatedWaitMin)}
          terminalLabel={queueOpen ? undefined : "Paused"}
        />
        <div>
          <strong>{item.name}</strong>
        </div>
        {variant !== "compact" ? (
          <p>
            {item.addressLine1}
            <br />
            {item.city}
            {item.region ? `, ${item.region}` : ""}
            {item.postalCode ? ` ${item.postalCode}` : ""}
          </p>
        ) : null}
        <div className="shop-signal-row">
          <span className={item.reviewSummary.ratingCount > 0 ? "pill pill-good" : "pill"}>
            {formatRating(item.reviewSummary)}
          </span>
          <span className="pill">{formatQueueLength(item.queueLength)}</span>
          <span className="pill">{item.serviceStationsCount} stations</span>
          <span className="pill">{item.industryType.toLowerCase().replaceAll("_", " ")}</span>
        </div>
        <div className="shop-card-footer">
          <span className="pill">
            {typeof item.distanceKm === "number" ? `${item.distanceKm} km away` : "Distance unavailable"}
          </span>
          <div className="shop-card-actions">
            <button
              className="button primary"
              disabled={!queueOpen}
              onClick={() => handleCardJoin(item)}
              type="button"
            >
              {guestProfile ? "Quick join" : "Join queue"}
            </button>
            <Link className="button" href={`/shops/${item.slug}`}>
              Details
            </Link>
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className="shop-list-shell">
      <div className="section-toolbar">
        <div>
          <p className="status-text">{locationStatus}</p>
          <p className="status-text">Best shops are ranked using live wait plus distance from you.</p>
        </div>
      </div>

      <div className="discovery-lanes">
        <section className="card discovery-lane favorites-lane">
          <div className="card-kicker">
            <strong>Your favourites</strong>
            <span className="pill">{favoriteItems.length} saved on this device</span>
          </div>
          {favoriteItems.length === 0 ? (
            <p className="status-text">
              Tap “Save favourite” on a shop. Q-App will remember it on this device and link it to your account later.
            </p>
          ) : (
            <div className="favorite-shop-list">
              {favoriteItems.map((item) => renderShopCard(item, "compact"))}
            </div>
          )}
        </section>

        <section className="best-shop-lane">
          <div className="card-kicker">
            <strong>Best to join now</strong>
            <span className="pill pill-good">{bestItems[0]?.name ?? "Calculating"}</span>
          </div>
          <div className="card-grid">
            {bestItems.map((item, index) => (
              <div key={item.id}>
                {index === 0 ? <span className="rank-ribbon">Best now</span> : null}
                {renderShopCard(item, index === 0 ? "best" : undefined)}
              </div>
            ))}
          </div>
        </section>
      </div>

      {quickJoinShop ? (
        <div className="modal-backdrop" role="presentation">
          <section className="card quick-join-modal" role="dialog" aria-modal="true" aria-label="Quick join queue">
            <div className="card-kicker">
              <div>
                <span className="eyebrow">Quick join</span>
                <strong>{quickJoinShop.name}</strong>
              </div>
              <button className="button" onClick={() => setQuickJoinShop(null)} type="button">
                Close
              </button>
            </div>

            {!quickChallenge ? (
              <>
                {guestProfile ? (
                  <p className="status-text">
                    We are using your saved guest details. Q-App will still send an OTP so nobody else can join with your
                    number.
                  </p>
                ) : (
                  <p className="status-text">
                    First time here? Add your name and mobile once. After OTP verification, Q-App will remember this device
                    for faster joins.
                  </p>
                )}
                <div className="signup-grid">
                  <label className="field field-wide">
                    <span>Name</span>
                    <input value={quickName} onChange={(event) => setQuickName(event.target.value)} />
                  </label>
                  <label className="field field-wide">
                    <span>Mobile Number</span>
                    <input value={quickMobileNumber} onChange={(event) => setQuickMobileNumber(event.target.value)} />
                  </label>
                </div>
                {quickJoinError ? <p className="status-text warning">{quickJoinError}</p> : null}
                <div className="shop-card-footer">
                  <button
                    className="button primary"
                    disabled={quickJoinBusy === "start" || !quickName.trim() || !quickMobileNumber.trim()}
                    onClick={() => void startQuickJoin(quickJoinShop)}
                    type="button"
                  >
                    {quickJoinBusy === "start" ? "Sending code..." : "Send code"}
                  </button>
                  <Link className="button" href={`/shops/${quickJoinShop.slug}`}>
                    View details instead
                  </Link>
                </div>
              </>
            ) : (
              <div className="signup-shell">
                <p className="status-text">
                  {quickChallenge.pilotMode
                    ? "Pilot mode: no SMS is sent. Use the code below."
                    : `Enter the OTP sent to ${quickMobileNumber}. It expires at ${new Date(quickChallenge.expiresAt).toLocaleTimeString()}.`}
                </p>
                {quickChallenge.codePreview ? (
                  <p className="status-text">
                    Your code: <code className="inline" style={{ fontSize: "1.4em", letterSpacing: "0.2em" }}>{quickChallenge.codePreview}</code>
                  </p>
                ) : null}
                <label className="field">
                  <span>OTP Code</span>
                  <input value={quickOtpCode} onChange={(event) => setQuickOtpCode(event.target.value)} />
                </label>
                {quickJoinError ? <p className="status-text warning">{quickJoinError}</p> : null}
                <div className="shop-card-footer">
                  <button
                    className="button primary"
                    disabled={quickJoinBusy === "verify" || !quickOtpCode.trim()}
                    onClick={() => void verifyQuickJoin()}
                    type="button"
                  >
                    {quickJoinBusy === "verify" ? "Joining..." : "Verify and join"}
                  </button>
                  <button
                    className="button"
                    onClick={() => {
                      setQuickChallenge(null);
                      setQuickOtpCode("");
                    }}
                    type="button"
                  >
                    Change details
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
