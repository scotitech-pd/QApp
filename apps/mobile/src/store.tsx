import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { api, type CustomerProfile, type SessionUser } from "./api";

type StoreValue = {
  ready: boolean;
  trackingToken: string | null;
  setTrackingToken: (token: string | null) => void;
  accessToken: string | null;
  user: SessionUser | null;
  setSession: (accessToken: string | null, user: SessionUser | null) => void;
  opsShopSlug: string | null;
  setOpsShopSlug: (slug: string | null) => void;
  customerToken: string | null;
  customerProfile: CustomerProfile | null;
  setCustomerSession: (token: string | null, profile: CustomerProfile | null) => void;
  /** Stable per-install key that favourites hang off (works without an account). */
  deviceKey: string | null;
  favoriteSlugs: string[];
  setFavoriteSlugs: (slugs: string[]) => void;
  toggleFavorite: (slug: string) => Promise<void>;
};

const StoreContext = createContext<StoreValue | null>(null);

const KEYS = {
  trackingToken: "qapp.trackingToken",
  accessToken: "qapp.accessToken",
  user: "qapp.user",
  opsShopSlug: "qapp.opsShopSlug",
  customerToken: "qapp.customerToken",
  customerProfile: "qapp.customerProfile",
  deviceKey: "qapp.deviceKey",
  favorites: "qapp.favorites"
};

function createDeviceKey() {
  const rand = () => Math.random().toString(36).slice(2, 10);
  return `onq-${Date.now().toString(36)}-${rand()}${rand()}`;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [trackingToken, setTrackingTokenState] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [opsShopSlug, setOpsShopSlugState] = useState<string | null>(null);
  const [customerToken, setCustomerToken] = useState<string | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [deviceKey, setDeviceKey] = useState<string | null>(null);
  const [favoriteSlugs, setFavoriteSlugsState] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        let key = await AsyncStorage.getItem(KEYS.deviceKey);
        if (!key) {
          key = createDeviceKey();
          await AsyncStorage.setItem(KEYS.deviceKey, key);
        }
        setDeviceKey(key);
        const cached = await AsyncStorage.getItem(KEYS.favorites);
        if (cached) setFavoriteSlugsState(JSON.parse(cached));
        const remote = await api.listFavorites(key).catch(() => null);
        if (remote) {
          const slugs = remote.map((shop) => shop.slug);
          setFavoriteSlugsState(slugs);
          void AsyncStorage.setItem(KEYS.favorites, JSON.stringify(slugs));
        }
      } catch {
        // favourites are a nicety; never block startup
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [storedTracking, storedAccess, storedUser, storedSlug, storedCustomerToken, storedCustomerProfile] =
          await Promise.all([
            AsyncStorage.getItem(KEYS.trackingToken),
            AsyncStorage.getItem(KEYS.accessToken),
            AsyncStorage.getItem(KEYS.user),
            AsyncStorage.getItem(KEYS.opsShopSlug),
            AsyncStorage.getItem(KEYS.customerToken),
            AsyncStorage.getItem(KEYS.customerProfile)
          ]);
        if (storedTracking) setTrackingTokenState(storedTracking);
        if (storedAccess) setAccessToken(storedAccess);
        if (storedUser) setUser(JSON.parse(storedUser));
        if (storedSlug) setOpsShopSlugState(storedSlug);
        if (storedCustomerToken) setCustomerToken(storedCustomerToken);
        if (storedCustomerProfile) setCustomerProfile(JSON.parse(storedCustomerProfile));
      } catch {
        // first launch or corrupted storage: start clean
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      trackingToken,
      setTrackingToken: (token) => {
        setTrackingTokenState(token);
        if (token) void AsyncStorage.setItem(KEYS.trackingToken, token);
        else void AsyncStorage.removeItem(KEYS.trackingToken);
      },
      accessToken,
      user,
      setSession: (nextToken, nextUser) => {
        setAccessToken(nextToken);
        setUser(nextUser);
        if (nextToken) void AsyncStorage.setItem(KEYS.accessToken, nextToken);
        else void AsyncStorage.removeItem(KEYS.accessToken);
        if (nextUser) void AsyncStorage.setItem(KEYS.user, JSON.stringify(nextUser));
        else void AsyncStorage.removeItem(KEYS.user);
      },
      opsShopSlug,
      setOpsShopSlug: (slug) => {
        setOpsShopSlugState(slug);
        if (slug) void AsyncStorage.setItem(KEYS.opsShopSlug, slug);
        else void AsyncStorage.removeItem(KEYS.opsShopSlug);
      },
      customerToken,
      customerProfile,
      setCustomerSession: (nextToken, nextProfile) => {
        setCustomerToken(nextToken);
        setCustomerProfile(nextProfile);
        if (nextToken) void AsyncStorage.setItem(KEYS.customerToken, nextToken);
        else void AsyncStorage.removeItem(KEYS.customerToken);
        if (nextProfile) void AsyncStorage.setItem(KEYS.customerProfile, JSON.stringify(nextProfile));
        else void AsyncStorage.removeItem(KEYS.customerProfile);
      },
      deviceKey,
      favoriteSlugs,
      setFavoriteSlugs: (slugs) => {
        setFavoriteSlugsState(slugs);
        void AsyncStorage.setItem(KEYS.favorites, JSON.stringify(slugs));
      },
      toggleFavorite: async (slug) => {
        if (!deviceKey) return;
        const on = !favoriteSlugs.includes(slug);
        const next = on ? [...favoriteSlugs, slug] : favoriteSlugs.filter((item) => item !== slug);
        setFavoriteSlugsState(next);
        void AsyncStorage.setItem(KEYS.favorites, JSON.stringify(next));
        try {
          await api.setFavorite(deviceKey, slug, on);
        } catch {
          setFavoriteSlugsState(favoriteSlugs);
          void AsyncStorage.setItem(KEYS.favorites, JSON.stringify(favoriteSlugs));
        }
      }
    }),
    [ready, trackingToken, accessToken, user, opsShopSlug, customerToken, customerProfile, deviceKey, favoriteSlugs]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside StoreProvider");
  return value;
}
