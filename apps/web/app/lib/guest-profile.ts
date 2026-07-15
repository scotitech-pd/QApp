"use client";

export type GuestQueueProfile = {
  firstName: string;
  mobileNumber: string;
  lastVerifiedAt: string;
  lastShopSlug?: string;
  lastTrackingToken?: string;
};

const guestQueueProfileKey = "qapp.guestQueueProfile";

function isGuestQueueProfile(value: unknown): value is GuestQueueProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const profile = value as Partial<GuestQueueProfile>;
  return typeof profile.firstName === "string" && typeof profile.mobileNumber === "string";
}

export function loadGuestQueueProfile() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawProfile = window.localStorage.getItem(guestQueueProfileKey);

  if (!rawProfile) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawProfile) as unknown;
    return isGuestQueueProfile(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveGuestQueueProfile(profile: {
  firstName: string;
  mobileNumber: string;
  lastShopSlug?: string;
  lastTrackingToken?: string;
}) {
  if (typeof window === "undefined") {
    return;
  }

  const nextProfile: GuestQueueProfile = {
    firstName: profile.firstName.trim(),
    mobileNumber: profile.mobileNumber.trim(),
    lastVerifiedAt: new Date().toISOString(),
    lastShopSlug: profile.lastShopSlug,
    lastTrackingToken: profile.lastTrackingToken
  };

  window.localStorage.setItem(guestQueueProfileKey, JSON.stringify(nextProfile));
}
