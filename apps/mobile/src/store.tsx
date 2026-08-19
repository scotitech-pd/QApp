import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { SessionUser } from "./api";

type StoreValue = {
  ready: boolean;
  trackingToken: string | null;
  setTrackingToken: (token: string | null) => void;
  accessToken: string | null;
  user: SessionUser | null;
  setSession: (accessToken: string | null, user: SessionUser | null) => void;
  opsShopSlug: string | null;
  setOpsShopSlug: (slug: string | null) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

const KEYS = {
  trackingToken: "qapp.trackingToken",
  accessToken: "qapp.accessToken",
  user: "qapp.user",
  opsShopSlug: "qapp.opsShopSlug"
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [trackingToken, setTrackingTokenState] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [opsShopSlug, setOpsShopSlugState] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [storedTracking, storedAccess, storedUser, storedSlug] = await Promise.all([
          AsyncStorage.getItem(KEYS.trackingToken),
          AsyncStorage.getItem(KEYS.accessToken),
          AsyncStorage.getItem(KEYS.user),
          AsyncStorage.getItem(KEYS.opsShopSlug)
        ]);
        if (storedTracking) setTrackingTokenState(storedTracking);
        if (storedAccess) setAccessToken(storedAccess);
        if (storedUser) setUser(JSON.parse(storedUser));
        if (storedSlug) setOpsShopSlugState(storedSlug);
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
      }
    }),
    [ready, trackingToken, accessToken, user, opsShopSlug]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside StoreProvider");
  return value;
}
