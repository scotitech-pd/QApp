"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { unwrapItem } from "../../lib/api";
import { useAuth } from "../../lib/auth";

type ShopProfile = {
  id: string;
  slug: string;
  name: string;
  publicDescription: string | null;
  logoImageUrl: string | null;
  coverImageUrl: string | null;
  phone: string | null;
  email: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  countryCode: string;
  latitude: number;
  longitude: number;
  openingHoursNote: string;
  queueEnabled: boolean;
  queuePaused: boolean;
  serviceStationsCount: number;
  defaultWalkInDurationMin: number;
};

export default function ShopProfilePage() {
  const { authRequestJson, hasBusinessRole, isAuthenticated, preferredShopSlug, ready, user } = useAuth();
  const canEditProfile = hasBusinessRole(["OWNER", "MANAGER"]);
  const shopProfiles = user?.staffProfiles ?? [];
  const [selectedShopSlug, setSelectedShopSlug] = useState<string | null>(null);
  const activeShopSlug = selectedShopSlug ?? preferredShopSlug;
  const [profile, setProfile] = useState<ShopProfile | null>(null);
  const [formState, setFormState] = useState({
    name: "",
    publicDescription: "",
    logoImageUrl: "",
    coverImageUrl: "",
    phone: "",
    email: "",
    openingHoursNote: "",
    serviceStationsCount: "1",
    defaultWalkInDurationMin: "20"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedShopSlug && preferredShopSlug) {
      setSelectedShopSlug(preferredShopSlug);
    }
  }, [preferredShopSlug, selectedShopSlug]);

  useEffect(() => {
    if (!ready || !isAuthenticated || !canEditProfile || !activeShopSlug) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadProfile() {
      setLoading(true);
      setError(null);

      try {
        const payload = await authRequestJson<ShopProfile>(`/v1/ops/shops/${activeShopSlug}/profile`);
        const item = unwrapItem(payload);

        if (!active || !item) {
          return;
        }

        setProfile(item);
        setFormState({
          name: item.name,
          publicDescription: item.publicDescription ?? "",
          logoImageUrl: item.logoImageUrl ?? "",
          coverImageUrl: item.coverImageUrl ?? "",
          phone: item.phone ?? "",
          email: item.email ?? "",
          openingHoursNote: item.openingHoursNote ?? "",
          serviceStationsCount: String(item.serviceStationsCount),
          defaultWalkInDurationMin: String(item.defaultWalkInDurationMin)
        });
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load shop profile.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [activeShopSlug, canEditProfile, isAuthenticated, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateField(field: keyof typeof formState, value: string) {
    setFormState((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function saveProfile() {
    if (!activeShopSlug) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = await authRequestJson<ShopProfile>(`/v1/ops/shops/${activeShopSlug}/profile`, {
        method: "PUT",
        body: {
          name: formState.name,
          publicDescription: formState.publicDescription,
          logoImageUrl: formState.logoImageUrl,
          coverImageUrl: formState.coverImageUrl,
          phone: formState.phone,
          email: formState.email,
          openingHoursNote: formState.openingHoursNote,
          serviceStationsCount: Number(formState.serviceStationsCount),
          defaultWalkInDurationMin: Number(formState.defaultWalkInDurationMin)
        }
      });
      const item = unwrapItem(payload);

      if (item) {
        setProfile(item);
        setMessage("Shop profile updated.");
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save shop profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero hero-compact">
        <span className="eyebrow">Shop Profile</span>
        <h1>Update what customers see before joining.</h1>
        <p>
          Manage your shop name, description, images, contact details, opening note, and queue defaults
          from the protected owner portal.
        </p>
      </section>

      {!ready || loading ? (
        <section className="section">
          <p className="status-text">Loading shop profile...</p>
        </section>
      ) : !isAuthenticated ? (
        <section className="section">
          <div className="auth-guard">
            <strong>Shop owner sign-in required</strong>
            <p className="status-text">Sign in to edit your shop profile.</p>
            <Link className="button primary" href="/shop/signin">
              Sign in to Shop Portal
            </Link>
          </div>
        </section>
      ) : !canEditProfile ? (
        <section className="section">
          <p className="status-text warning">Only shop owners and managers can edit the public shop profile.</p>
        </section>
      ) : !activeShopSlug ? (
        <section className="section">
          <p className="status-text warning">No shop is attached to this account yet.</p>
        </section>
      ) : (
        <section className="section shop-profile-editor">
          <div className="section-toolbar">
            <div>
              <span className="eyebrow">Editing</span>
              <h2>{profile?.name ?? "Shop profile"}</h2>
              {profile ? (
                <p className="status-text">
                  {profile.addressLine1}, {profile.city}
                </p>
              ) : null}
            </div>
            <div className="location-actions">
              {shopProfiles.length > 1 ? (
                <label className="field shop-selector-field">
                  <span>Switch shop</span>
                  <select
                    value={activeShopSlug}
                    onChange={(event) => setSelectedShopSlug(event.target.value)}
                  >
                    {shopProfiles.map((shopProfile) => (
                      <option key={shopProfile.businessLocation.id} value={shopProfile.businessLocation.slug}>
                        {shopProfile.businessLocation.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <Link className="button" href="/shop/dashboard">
                Back to Queue
              </Link>
            </div>
          </div>

          {error ? <p className="status-text warning">{error}</p> : null}
          {message ? <p className="status-callout good">{message}</p> : null}

          <div className="signup-grid">
            <label className="field">
              <span>Shop Name</span>
              <input value={formState.name} onChange={(event) => updateField("name", event.target.value)} />
            </label>
            <label className="field">
              <span>Phone</span>
              <input value={formState.phone} onChange={(event) => updateField("phone", event.target.value)} />
            </label>
            <label className="field field-wide">
              <span>Public Description</span>
              <textarea
                value={formState.publicDescription}
                onChange={(event) => updateField("publicDescription", event.target.value)}
                placeholder="Tell customers what kind of service and queue experience to expect."
              />
            </label>
            <label className="field">
              <span>Logo Image URL</span>
              <input value={formState.logoImageUrl} onChange={(event) => updateField("logoImageUrl", event.target.value)} />
            </label>
            <label className="field">
              <span>Cover Image URL</span>
              <input value={formState.coverImageUrl} onChange={(event) => updateField("coverImageUrl", event.target.value)} />
            </label>
            <label className="field">
              <span>Email</span>
              <input value={formState.email} onChange={(event) => updateField("email", event.target.value)} />
            </label>
            <label className="field">
              <span>Opening Hours Note</span>
              <input
                value={formState.openingHoursNote}
                onChange={(event) => updateField("openingHoursNote", event.target.value)}
                placeholder="Mon-Sat, 10:00-19:00"
              />
            </label>
            <label className="field">
              <span>Active Stations</span>
              <input
                type="number"
                min="1"
                value={formState.serviceStationsCount}
                onChange={(event) => updateField("serviceStationsCount", event.target.value)}
              />
            </label>
            <label className="field">
              <span>Default Walk-In Duration</span>
              <input
                type="number"
                min="5"
                value={formState.defaultWalkInDurationMin}
                onChange={(event) => updateField("defaultWalkInDurationMin", event.target.value)}
              />
            </label>
          </div>

          <div className="location-actions">
            <button
              className="button primary"
              disabled={saving || !formState.name.trim()}
              onClick={() => void saveProfile()}
              type="button"
            >
              {saving ? "Saving..." : "Save Shop Profile"}
            </button>
            <Link className="button" href={`/shops/${activeShopSlug}`}>
              Preview Customer Page
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
