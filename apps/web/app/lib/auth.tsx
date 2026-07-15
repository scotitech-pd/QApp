"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { getApiBaseUrl, parseItemEnvelope, parseListEnvelope, type ApiEnvelope, type ApiListEnvelope } from "./api";

type BusinessGroupRef = {
  id: string;
  name: string;
  slug: string;
};

type BusinessLocationRef = {
  id: string;
  name: string;
  slug: string;
};

type Membership = {
  role: string;
  businessGroup: BusinessGroupRef;
};

type StaffProfile = {
  id: string;
  displayName: string;
  businessLocation: BusinessLocationRef;
};

export type AuthUser = {
  id: string;
  appRole: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  memberships: Membership[];
  staffProfiles: StaffProfile[];
};

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  accessTokenExpiresInSeconds: number;
  refreshTokenExpiresAt: string;
};

type LoginPayload = {
  user: AuthUser;
  tokens: AuthTokens;
};

type AuthRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  retryOn401?: boolean;
};

type AuthContextValue = {
  ready: boolean;
  busy: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  accessToken: string;
  sessionId: string;
  login: (input: {
    identifier: string;
    password: string;
    deviceName: string;
    platform: string;
  }) => Promise<AuthUser>;
  logoutCurrent: () => Promise<void>;
  reloadUser: () => Promise<void>;
  authRequestJson: <T>(path: string, options?: AuthRequestOptions) => Promise<ApiEnvelope<T>>;
  authRequestJsonList: <T>(path: string, options?: AuthRequestOptions) => Promise<ApiListEnvelope<T>>;
  hasBusinessRole: (roles: string[]) => boolean;
  hasPlatformAdminAccess: boolean;
  preferredShopSlug: string | null;
};

const storageKeys = {
  accessToken: "qapp.web.accessToken",
  refreshToken: "qapp.web.refreshToken",
  sessionId: "qapp.web.sessionId"
} as const;

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredValue(key: string) {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(key) ?? "";
}

function writeStoredValue(key: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  if (!value) {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(key, value);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [sessionId, setSessionId] = useState("");
  const accessTokenRef = useRef("");
  const refreshTokenRef = useRef("");

  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);

  useEffect(() => {
    refreshTokenRef.current = refreshToken;
  }, [refreshToken]);

  useEffect(() => {
    const storedAccessToken = readStoredValue(storageKeys.accessToken);
    const storedRefreshToken = readStoredValue(storageKeys.refreshToken);
    const storedSessionId = readStoredValue(storageKeys.sessionId);

    setAccessToken(storedAccessToken);
    setRefreshToken(storedRefreshToken);
    setSessionId(storedSessionId);
    setReady(true);
  }, []);

  useEffect(() => {
    writeStoredValue(storageKeys.accessToken, accessToken);
  }, [accessToken]);

  useEffect(() => {
    writeStoredValue(storageKeys.refreshToken, refreshToken);
  }, [refreshToken]);

  useEffect(() => {
    writeStoredValue(storageKeys.sessionId, sessionId);
  }, [sessionId]);

  function clearSession() {
    setAccessToken("");
    setRefreshToken("");
    setSessionId("");
    setUser(null);
  }

  async function refreshSessionToken() {
    const currentRefreshToken = refreshTokenRef.current;

    if (!currentRefreshToken) {
      clearSession();
      throw new Error("Your session has expired. Sign in again.");
    }

    const response = await fetch(`${getApiBaseUrl()}/v1/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        refreshToken: currentRefreshToken
      })
    });

    const payload = await parseItemEnvelope<LoginPayload>(response);
    const item = payload.data ?? payload.item;

    if (!item) {
      clearSession();
      throw new Error("Session refresh returned no data.");
    }

    setAccessToken(item.tokens.accessToken);
    setRefreshToken(item.tokens.refreshToken);
    setSessionId(item.tokens.sessionId);
    setUser(item.user);
    return item.tokens.accessToken;
  }

  async function authRequestJson<T>(path: string, options?: AuthRequestOptions) {
    const headers: Record<string, string> = {};

    if (options?.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (accessTokenRef.current) {
      headers.Authorization = `Bearer ${accessTokenRef.current}`;
    }

    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: options?.method ?? "GET",
      headers,
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined
    });

    if (response.status === 401 && options?.retryOn401 !== false && refreshTokenRef.current) {
      const nextAccessToken = await refreshSessionToken();
      const retryHeaders = {
        ...headers,
        Authorization: `Bearer ${nextAccessToken}`
      };

      const retryResponse = await fetch(`${getApiBaseUrl()}${path}`, {
        method: options?.method ?? "GET",
        headers: retryHeaders,
        body: options?.body !== undefined ? JSON.stringify(options.body) : undefined
      });

      return parseItemEnvelope<T>(retryResponse);
    }

    return parseItemEnvelope<T>(response);
  }

  async function authRequestJsonList<T>(path: string, options?: AuthRequestOptions) {
    const headers: Record<string, string> = {};

    if (options?.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (accessTokenRef.current) {
      headers.Authorization = `Bearer ${accessTokenRef.current}`;
    }

    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: options?.method ?? "GET",
      headers,
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined
    });

    if (response.status === 401 && options?.retryOn401 !== false && refreshTokenRef.current) {
      const nextAccessToken = await refreshSessionToken();
      const retryHeaders = {
        ...headers,
        Authorization: `Bearer ${nextAccessToken}`
      };

      const retryResponse = await fetch(`${getApiBaseUrl()}${path}`, {
        method: options?.method ?? "GET",
        headers: retryHeaders,
        body: options?.body !== undefined ? JSON.stringify(options.body) : undefined
      });

      return parseListEnvelope<T>(retryResponse);
    }

    return parseListEnvelope<T>(response);
  }

  async function reloadUser() {
    if (!accessTokenRef.current && !refreshTokenRef.current) {
      setUser(null);
      return;
    }

    setBusy(true);

    try {
      const payload = await authRequestJson<AuthUser>("/v1/auth/me");
      setUser(payload.data ?? payload.item ?? null);
    } catch {
      clearSession();
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!accessTokenRef.current && !refreshTokenRef.current) {
      return;
    }

    if (user) {
      return;
    }

    void reloadUser();
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  async function login(input: {
    identifier: string;
    password: string;
    deviceName: string;
    platform: string;
  }) {
    setBusy(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });

      const payload = await parseItemEnvelope<LoginPayload>(response);
      const item = payload.data ?? payload.item;

      if (!item) {
        throw new Error("Login returned no session payload.");
      }

      setAccessToken(item.tokens.accessToken);
      setRefreshToken(item.tokens.refreshToken);
      setSessionId(item.tokens.sessionId);
      setUser(item.user);
      return item.user;
    } finally {
      setBusy(false);
    }
  }

  async function logoutCurrent() {
    setBusy(true);

    try {
      if (accessTokenRef.current) {
        await authRequestJson<{ revoked: boolean }>("/v1/auth/logout-current", {
          method: "POST",
          retryOn401: false
        });
      }
    } catch {
      // Ignore logout API failures and clear the local session anyway.
    } finally {
      clearSession();
      setBusy(false);
    }
  }

  function hasBusinessRole(roles: string[]) {
    return user?.memberships.some((membership) => roles.includes(membership.role)) ?? false;
  }

  const preferredShopSlug = user?.staffProfiles[0]?.businessLocation.slug ?? null;
  const hasPlatformAdminAccess = user?.appRole === "PLATFORM_ADMIN";

  return (
    <AuthContext.Provider
      value={{
        ready,
        busy,
        isAuthenticated: Boolean(accessToken && user),
        user,
        accessToken,
        sessionId,
        login,
        logoutCurrent,
        reloadUser,
        authRequestJson,
        authRequestJsonList,
        hasBusinessRole,
        hasPlatformAdminAccess,
        preferredShopSlug
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
