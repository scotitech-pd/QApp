import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

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
  /** Last join details the user asked us to remember (works without an account). */
  savedJoinName: string | null;
  savedJoinPhone: string | null;
  setSavedJoinDetails: (name: string | null, phone: string | null) => void;
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
  favorites: "qapp.favorites",
  joinName: "qapp.joinName",
  joinPhone: "qapp.joinPhone"
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
  const [savedJoinName, setSavedJoinName] = useState<string | null>(null);
  const [savedJoinPhone, setSavedJoinPhone] = useState<string | null>(null);

  // Refs mirror current values so the stable setters below never need to be
  // rebuilt (rebuilding them is what caused the Me-tab render loop).
  const favoriteSlugsRef = useRef<string[]>([]);
  const deviceKeyRef = useRef<string | null>(null);
  favoriteSlugsRef.current = favoriteSlugs;
  deviceKeyRef.current = deviceKey;

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
        const [storedJoinName, storedJoinPhone] = await Promise.all([
          AsyncStorage.getItem(KEYS.joinName),
          AsyncStorage.getItem(KEYS.joinPhone)
        ]);
        if (storedJoinName) setSavedJoinName(storedJoinName);
        if (storedJoinPhone) setSavedJoinPhone(storedJoinPhone);
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

  const setSavedJoinDetails = useCallback((name: string | null, phone: string | null) => {
    setSavedJoinName(name);
    setSavedJoinPhone(phone);
    if (name) void AsyncStorage.setItem(KEYS.joinName, name);
    else void AsyncStorage.removeItem(KEYS.joinName);
    if (phone) void AsyncStorage.setItem(KEYS.joinPhone, phone);
    else void AsyncStorage.removeItem(KEYS.joinPhone);
  }, []);

  const setTrackingToken = useCallback((token: string | null) => {
    setTrackingTokenState(token);
    if (token) void AsyncStorage.setItem(KEYS.trackingToken, token);
    else void AsyncStorage.removeItem(KEYS.trackingToken);
  }, []);

  const setSession = useCallback((nextToken: string | null, nextUser: SessionUser | null) => {
    setAccessToken(nextToken);
    setUser(nextUser);
    if (nextToken) void AsyncStorage.setItem(KEYS.accessToken, nextToken);
    else void AsyncStorage.removeItem(KEYS.accessToken);
    if (nextUser) void AsyncStorage.setItem(KEYS.user, JSON.stringify(nextUser));
    else void AsyncStorage.removeItem(KEYS.user);
  }, []);

  const setOpsShopSlug = useCallback((slug: string | null) => {
    setOpsShopSlugState(slug);
    if (slug) void AsyncStorage.setItem(KEYS.opsShopSlug, slug);
    else void AsyncStorage.removeItem(KEYS.opsShopSlug);
  }, []);

  const setCustomerSession = useCallback((nextToken: string | null, nextProfile: CustomerProfile | null) => {
    setCustomerToken(nextToken);
    setCustomerProfile(nextProfile);
    if (nextToken) void AsyncStorage.setItem(KEYS.customerToken, nextToken);
    else void AsyncStorage.removeItem(KEYS.customerToken);
    if (nextProfile) void AsyncStorage.setItem(KEYS.customerProfile, JSON.stringify(nextProfile));
    else void AsyncStorage.removeItem(KEYS.customerProfile);
  }, []);

  const setFavoriteSlugs = useCallback((slugs: string[]) => {
    setFavoriteSlugsState(slugs);
    void AsyncStorage.setItem(KEYS.favorites, JSON.stringify(slugs));
  }, []);

  const toggleFavorite = useCallback(async (slug: string) => {
    const key = deviceKeyRef.current;
    if (!key) return;
    const current = favoriteSlugsRef.current;
    const on = !current.includes(slug);
    const next = on ? [...current, slug] : current.filter((item) => item !== slug);
    setFavoriteSlugsState(next);
    void AsyncStorage.setItem(KEYS.favorites, JSON.stringify(next));
    try {
      await api.setFavorite(key, slug, on);
    } catch {
      setFavoriteSlugsState(current);
      void AsyncStorage.setItem(KEYS.favorites, JSON.stringify(current));
    }
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      trackingToken,
      setTrackingToken,
      accessToken,
      user,
      setSession,
      opsShopSlug,
      setOpsShopSlug,
      customerToken,
      customerProfile,
      setCustomerSession,
      deviceKey,
      favoriteSlugs,
      setFavoriteSlugs,
      toggleFavorite,
      savedJoinName,
      savedJoinPhone,
      setSavedJoinDetails
    }),
    [
      ready,
      trackingToken,
      accessToken,
      user,
      opsShopSlug,
      customerToken,
      customerProfile,
      deviceKey,
      favoriteSlugs,
      setTrackingToken,
      setSession,
      setOpsShopSlug,
      setCustomerSession,
      setFavoriteSlugs,
      toggleFavorite,
      savedJoinName,
      savedJoinPhone,
      setSavedJoinDetails
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside StoreProvider");
  return value;
}
