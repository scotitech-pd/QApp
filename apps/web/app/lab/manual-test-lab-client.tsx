"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ApiMeta = {
  requestId?: string;
  count?: number;
};

type ApiEnvelope<T> = {
  data?: T;
  item?: T;
  error?: string;
  code?: string;
  details?: unknown;
  meta?: ApiMeta;
};

type ApiListEnvelope<T> = {
  data?: T[];
  items?: T[];
  error?: string;
  code?: string;
  details?: unknown;
  meta?: ApiMeta;
};

type AuthUser = {
  id: string;
  appRole: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  memberships: Array<{
    role: string;
    businessGroup: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
  staffProfiles: Array<{
    id: string;
    displayName: string;
    businessLocation: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
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

type AuthSession = {
  id: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  deviceName?: string | null;
  platform?: string | null;
  isCurrent: boolean;
};

type AuthActivity = {
  id: string;
  createdAt: string;
  type: string;
  identifier?: string | null;
  deviceName?: string | null;
  platform?: string | null;
  metadata?: unknown;
};

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
  serviceStationsCount: number;
  industryType: string;
  queueEnabled: boolean;
  queuePaused: boolean;
  distanceKm?: number | null;
  queueLength: number;
  estimatedWaitMin: number;
};

type QueueJoinChallenge = {
  challengeId: string;
  expiresAt: string;
  message: string;
  deliveryMode: string;
  deliveryReason?: string | null;
  codePreview?: string;
};

type QueueStatus = {
  trackingToken: string;
  sortIndex: number;
  position: number | null;
  queueLength: number;
  estimatedWaitMin: number | null;
  confirmationStatus: string;
  confirmationRequestedAt: string | null;
  confirmationRespondedAt: string | null;
  calledAt: string | null;
  arrivalConfirmationSentAt: string | null;
  nearTurnNotifiedAt: string | null;
  responseWindowEndsAt: string | null;
  canRespondToArrival: boolean;
  visitStatus: string;
  joinedAt: string;
  customer: {
    firstName: string;
  };
  shop: {
    id: string;
    slug: string;
    name: string;
    city: string;
    queuePaused: boolean;
    calledGracePeriodMin: number;
  };
};

type QueueEntry = {
  id: string;
  trackingToken: string;
  sortIndex: number;
  confirmationStatus: string;
  confirmationRequestedAt: string | null;
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
    id: string;
    slug: string;
    name: string;
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
};

type Invitation = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  note?: string | null;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  inviteToken?: string;
  inviteUrl?: string;
};

type BusinessSignup = {
  id: string;
  approvalStatus: string;
  businessName: string;
  email: string;
  city: string;
  industryType: string;
  createdAt: string;
};

const storageKeys = {
  apiBaseUrl: "qapp.lab.apiBaseUrl",
  accessToken: "qapp.lab.accessToken",
  refreshToken: "qapp.lab.refreshToken",
  sessionId: "qapp.lab.sessionId",
  selectedShopSlug: "qapp.lab.selectedShopSlug",
  trackingToken: "qapp.lab.trackingToken"
} as const;

const demoCredentials = [
  {
    label: "Owner",
    identifier: "owner@fadeyard.demo",
    password: "QappOwner123!",
    deviceName: "Q-App Lab iPhone",
    platform: "ios"
  },
  {
    label: "Staff",
    identifier: "staff@fadeyard.demo",
    password: "QappStaff123!",
    deviceName: "Q-App Lab Android",
    platform: "android"
  },
  {
    label: "Admin",
    identifier: "admin@qapp.demo",
    password: "QappAdmin123!",
    deviceName: "Q-App Lab Desktop",
    platform: "web"
  }
];

function getInitialApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (configured) {
    return configured;
  }

  if (typeof window === "undefined") {
    return "http://localhost:4000";
  }

  const host = window.location.hostname || "localhost";
  return `http://${host}:4000`;
}

function getStoredValue(key: string, fallback = "") {
  if (typeof window === "undefined") {
    return fallback;
  }

  return window.localStorage.getItem(key) ?? fallback;
}

function setStoredValue(key: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  if (!value) {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(key, value);
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleString();
}

function JsonPreview({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="console-card">
      <div className="console-card-header">
        <strong>{title}</strong>
      </div>
      <pre className="json-panel">{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}

function unwrapItem<T>(payload: ApiEnvelope<T>) {
  return payload.data ?? payload.item ?? null;
}

function unwrapList<T>(payload: ApiListEnvelope<T>) {
  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  return [];
}

export function ManualTestLabClient() {
  const [apiBaseUrl, setApiBaseUrl] = useState(getInitialApiBaseUrl);
  const [apiHealthMessage, setApiHealthMessage] = useState("Not checked yet.");
  const [apiChecking, setApiChecking] = useState(false);

  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authSessions, setAuthSessions] = useState<AuthSession[]>([]);
  const [authActivity, setAuthActivity] = useState<AuthActivity[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState<string | null>(null);
  const [loginIdentifier, setLoginIdentifier] = useState(demoCredentials[0].identifier);
  const [loginPassword, setLoginPassword] = useState(demoCredentials[0].password);
  const [deviceName, setDeviceName] = useState(demoCredentials[0].deviceName);
  const [platform, setPlatform] = useState(demoCredentials[0].platform);

  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopSlug, setSelectedShopSlug] = useState("demo-barber");
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [discoveryBusy, setDiscoveryBusy] = useState(false);
  const [shopLatitude, setShopLatitude] = useState("51.5137");
  const [shopLongitude, setShopLongitude] = useState("-0.1366");

  const [firstName, setFirstName] = useState("Amir");
  const [mobileNumber, setMobileNumber] = useState("+447400000910");
  const [joinChallenge, setJoinChallenge] = useState<QueueJoinChallenge | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [trackingToken, setTrackingToken] = useState("");
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [queueBusy, setQueueBusy] = useState<string | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);

  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [opsError, setOpsError] = useState<string | null>(null);
  const [opsBusy, setOpsBusy] = useState<string | null>(null);
  const [walkInFirstName, setWalkInFirstName] = useState("Walkin");
  const [walkInMobile, setWalkInMobile] = useState("");
  const [walkInDuration, setWalkInDuration] = useState("20");
  const [pauseReason, setPauseReason] = useState("Short staff break");

  const [invites, setInvites] = useState<Invitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState("newstaff@fadeyard.demo");
  const [inviteFirstName, setInviteFirstName] = useState("New");
  const [inviteLastName, setInviteLastName] = useState("Staff");
  const [inviteRole, setInviteRole] = useState("STAFF_OPERATOR");
  const [inviteNote, setInviteNote] = useState("Manual device-lab invite");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = useState<string | null>(null);

  const [signupPayload, setSignupPayload] = useState({
    businessName: "North Lane Studio",
    ownerName: "Jordan Miles",
    mobileNumber: "+447400000106",
    email: "owner@northlane.demo",
    addressLine1: "88 Parkway",
    addressLine2: "",
    city: "London",
    region: "Greater London",
    postalCode: "NW1 7AN",
    countryCode: "GB",
    industryType: "SALON",
    serviceStationsCount: "3",
    openingHoursNote: "Mon-Sat 10:00-19:00",
    latitude: "51.5387",
    longitude: "-0.1426",
    placeId: "place-demo-123",
    geolocationSource: "ADDRESS_GEOCODE"
  });
  const [signupResult, setSignupResult] = useState<BusinessSignup | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupBusy, setSignupBusy] = useState(false);

  useEffect(() => {
    setApiBaseUrl(getStoredValue(storageKeys.apiBaseUrl, getInitialApiBaseUrl()));
    setAccessToken(getStoredValue(storageKeys.accessToken));
    setRefreshToken(getStoredValue(storageKeys.refreshToken));
    setSessionId(getStoredValue(storageKeys.sessionId));
    setSelectedShopSlug(getStoredValue(storageKeys.selectedShopSlug, "demo-barber"));
    setTrackingToken(getStoredValue(storageKeys.trackingToken));
  }, []);

  useEffect(() => {
    setStoredValue(storageKeys.apiBaseUrl, apiBaseUrl);
  }, [apiBaseUrl]);

  useEffect(() => {
    setStoredValue(storageKeys.accessToken, accessToken);
  }, [accessToken]);

  useEffect(() => {
    setStoredValue(storageKeys.refreshToken, refreshToken);
  }, [refreshToken]);

  useEffect(() => {
    setStoredValue(storageKeys.sessionId, sessionId);
  }, [sessionId]);

  useEffect(() => {
    setStoredValue(storageKeys.selectedShopSlug, selectedShopSlug);
  }, [selectedShopSlug]);

  useEffect(() => {
    setStoredValue(storageKeys.trackingToken, trackingToken);
  }, [trackingToken]);

  async function parseEnvelope<T>(response: Response) {
    const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

    if (!response.ok) {
      throw new Error(payload.error ?? `${response.status} ${response.statusText}`);
    }

    return payload;
  }

  async function parseListEnvelope<T>(response: Response) {
    const payload = (await response.json().catch(() => ({}))) as ApiListEnvelope<T>;

    if (!response.ok) {
      throw new Error(payload.error ?? `${response.status} ${response.statusText}`);
    }

    return payload;
  }

  async function refreshSessionToken() {
    if (!refreshToken) {
      throw new Error("No refresh token available.");
    }

    const response = await fetch(`${apiBaseUrl}/v1/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        refreshToken
      })
    });

    const payload = await parseEnvelope<LoginPayload>(response);
    const loginData = unwrapItem(payload);

    if (!loginData) {
      throw new Error("Refresh succeeded but returned no session payload.");
    }

    setAccessToken(loginData.tokens.accessToken);
    setRefreshToken(loginData.tokens.refreshToken);
    setSessionId(loginData.tokens.sessionId);
    setAuthUser(loginData.user);

    return loginData.tokens.accessToken;
  }

  async function requestJson<T>(
    path: string,
    options?: {
      method?: "GET" | "POST";
      body?: unknown;
      auth?: boolean;
      retryOn401?: boolean;
    }
  ) {
    const headers: Record<string, string> = {};
    if (options?.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (options?.auth && accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: options?.method ?? "GET",
      headers,
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined
    });

    if (response.status === 401 && options?.auth && options.retryOn401 !== false && refreshToken) {
      const nextAccessToken = await refreshSessionToken();
      const retryHeaders = { ...headers, Authorization: `Bearer ${nextAccessToken}` };
      const retryResponse = await fetch(`${apiBaseUrl}${path}`, {
        method: options?.method ?? "GET",
        headers: retryHeaders,
        body: options?.body !== undefined ? JSON.stringify(options.body) : undefined
      });

      return parseEnvelope<T>(retryResponse);
    }

    return parseEnvelope<T>(response);
  }

  async function requestJsonList<T>(
    path: string,
    options?: {
      method?: "GET" | "POST";
      body?: unknown;
      auth?: boolean;
      retryOn401?: boolean;
    }
  ) {
    const headers: Record<string, string> = {};
    if (options?.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (options?.auth && accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: options?.method ?? "GET",
      headers,
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined
    });

    if (response.status === 401 && options?.auth && options.retryOn401 !== false && refreshToken) {
      const nextAccessToken = await refreshSessionToken();
      const retryHeaders = { ...headers, Authorization: `Bearer ${nextAccessToken}` };
      const retryResponse = await fetch(`${apiBaseUrl}${path}`, {
        method: options?.method ?? "GET",
        headers: retryHeaders,
        body: options?.body !== undefined ? JSON.stringify(options.body) : undefined
      });

      return parseListEnvelope<T>(retryResponse);
    }

    return parseListEnvelope<T>(response);
  }

  async function checkApiHealth() {
    setApiChecking(true);
    setApiHealthMessage("Checking API...");

    try {
      const response = await fetch(`${apiBaseUrl}/health`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "API health failed.");
      }

      setApiHealthMessage(`Healthy. API says: ${payload.status ?? "ok"}`);
    } catch (error) {
      setApiHealthMessage(error instanceof Error ? error.message : "Failed to reach API.");
    } finally {
      setApiChecking(false);
    }
  }

  async function handleLogin() {
    setAuthBusy("login");
    setAuthError(null);

    try {
      const payload = await requestJson<LoginPayload>("/v1/auth/login", {
        method: "POST",
        body: {
          identifier: loginIdentifier,
          password: loginPassword,
          deviceName,
          platform
        }
      });

      const loginData = unwrapItem(payload);

      if (!loginData) {
        throw new Error("Login succeeded but returned no session payload.");
      }

      setAccessToken(loginData.tokens.accessToken);
      setRefreshToken(loginData.tokens.refreshToken);
      setSessionId(loginData.tokens.sessionId);
      setAuthUser(loginData.user);
      await Promise.all([loadAuthSessions(), loadAuthActivity()]);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setAuthBusy(null);
    }
  }

  async function loadMe() {
    setAuthBusy("me");
    setAuthError(null);

    try {
      const payload = await requestJson<AuthUser>("/v1/auth/me", {
        auth: true
      });
      setAuthUser(unwrapItem(payload));
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Failed to load current user.");
    } finally {
      setAuthBusy(null);
    }
  }

  async function loadAuthSessions() {
    setAuthBusy("sessions");
    setAuthError(null);

    try {
      const payload = await requestJsonList<AuthSession>("/v1/auth/sessions", {
        auth: true
      });
      setAuthSessions(unwrapList(payload));
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Failed to load sessions.");
    } finally {
      setAuthBusy(null);
    }
  }

  async function loadAuthActivity() {
    setAuthBusy("activity");
    setAuthError(null);

    try {
      const payload = await requestJsonList<AuthActivity>("/v1/auth/activity?limit=10", {
        auth: true
      });
      setAuthActivity(unwrapList(payload));
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Failed to load auth activity.");
    } finally {
      setAuthBusy(null);
    }
  }

  async function handleLogoutCurrent() {
    setAuthBusy("logout");
    setAuthError(null);

    try {
      await requestJson<{ revoked: boolean }>("/v1/auth/logout-current", {
        method: "POST",
        auth: true
      });

      setAccessToken("");
      setRefreshToken("");
      setSessionId("");
      setAuthUser(null);
      setAuthSessions([]);
      setAuthActivity([]);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Logout failed.");
    } finally {
      setAuthBusy(null);
    }
  }

  async function loadShops() {
    setDiscoveryBusy(true);
    setDiscoveryError(null);

    try {
      const params = new URLSearchParams();
      if (shopLatitude && shopLongitude) {
        params.set("latitude", shopLatitude);
        params.set("longitude", shopLongitude);
      }

      const payload = await requestJsonList<Shop>(`/v1/shops?${params.toString()}`);
      const items = unwrapList(payload);
      setShops(items);

      const matchedShop = items.find((shop) => shop.slug === selectedShopSlug) ?? items[0] ?? null;
      setSelectedShop(matchedShop);
      if (matchedShop) {
        setSelectedShopSlug(matchedShop.slug);
      }
    } catch (error) {
      setDiscoveryError(error instanceof Error ? error.message : "Failed to load shops.");
    } finally {
      setDiscoveryBusy(false);
    }
  }

  async function loadShopDetail(slug: string) {
    setDiscoveryBusy(true);
    setDiscoveryError(null);

    try {
      const payload = await requestJson<Shop>(`/v1/shops/${slug}`);
      const item = unwrapItem(payload);
      setSelectedShop(item);
      if (item) {
        setSelectedShopSlug(item.slug);
      }
    } catch (error) {
      setDiscoveryError(error instanceof Error ? error.message : "Failed to load shop details.");
    } finally {
      setDiscoveryBusy(false);
    }
  }

  async function startQueueJoin() {
    setQueueBusy("start");
    setQueueError(null);

    try {
      const payload = await requestJson<QueueJoinChallenge>("/v1/queue/join/start", {
        method: "POST",
        body: {
          shopSlug: selectedShopSlug,
          firstName,
          mobileNumber
        }
      });

      const challenge = unwrapItem(payload);
      setJoinChallenge(challenge);
      setOtpCode(challenge?.codePreview ?? "");
    } catch (error) {
      setQueueError(error instanceof Error ? error.message : "Failed to start queue join.");
    } finally {
      setQueueBusy(null);
    }
  }

  async function verifyQueueJoin() {
    if (!joinChallenge) {
      return;
    }

    setQueueBusy("verify");
    setQueueError(null);

    try {
      const payload = await requestJson<{ alreadyJoined: boolean; queueStatus: QueueStatus }>("/v1/queue/join/verify", {
        method: "POST",
        body: {
          challengeId: joinChallenge.challengeId,
          code: otpCode
        }
      });

      const result = unwrapItem(payload);
      if (!result) {
        throw new Error("Verification succeeded but returned no queue status.");
      }

      setTrackingToken(result.queueStatus.trackingToken);
      setQueueStatus(result.queueStatus);
    } catch (error) {
      setQueueError(error instanceof Error ? error.message : "Failed to verify queue join.");
    } finally {
      setQueueBusy(null);
    }
  }

  async function loadQueueStatus(nextTrackingToken?: string) {
    const token = nextTrackingToken ?? trackingToken;
    if (!token) {
      setQueueError("Set a tracking token first.");
      return;
    }

    setQueueBusy("status");
    setQueueError(null);

    try {
      const payload = await requestJson<QueueStatus>(`/v1/queue/status/${token}`);
      setQueueStatus(unwrapItem(payload));
      setTrackingToken(token);
    } catch (error) {
      setQueueError(error instanceof Error ? error.message : "Failed to load queue status.");
    } finally {
      setQueueBusy(null);
    }
  }

  async function respondToArrival(response: "COMING" | "DECLINED") {
    if (!trackingToken) {
      return;
    }

    setQueueBusy(response);
    setQueueError(null);

    try {
      await requestJson(`/v1/queue/status/${trackingToken}/respond-arrival`, {
        method: "POST",
        body: {
          response
        }
      });
      await loadQueueStatus(trackingToken);
    } catch (error) {
      setQueueError(error instanceof Error ? error.message : "Failed to send arrival response.");
    } finally {
      setQueueBusy(null);
    }
  }

  async function loadDashboard() {
    setOpsBusy("dashboard");
    setOpsError(null);

    try {
      const payload = await requestJson<DashboardPayload>(`/v1/ops/shops/${selectedShopSlug}/dashboard`, {
        auth: true
      });
      setDashboard(unwrapItem(payload));
    } catch (error) {
      setOpsError(error instanceof Error ? error.message : "Failed to load dashboard.");
    } finally {
      setOpsBusy(null);
    }
  }

  async function postOpsAction(path: string, busyKey: string, body?: unknown) {
    setOpsBusy(busyKey);
    setOpsError(null);

    try {
      await requestJson(path, {
        method: "POST",
        body,
        auth: true
      });
      await loadDashboard();
    } catch (error) {
      setOpsError(error instanceof Error ? error.message : "Operator action failed.");
    } finally {
      setOpsBusy(null);
    }
  }

  async function loadInvitations() {
    setInviteBusy("list");
    setInviteError(null);

    try {
      const payload = await requestJsonList<Invitation>(`/v1/ops/shops/${selectedShopSlug}/invitations`, {
        auth: true
      });
      setInvites(unwrapList(payload));
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Failed to load invitations.");
    } finally {
      setInviteBusy(null);
    }
  }

  async function createInvitation() {
    setInviteBusy("create");
    setInviteError(null);

    try {
      const payload = await requestJson<Invitation>(`/v1/ops/shops/${selectedShopSlug}/invitations`, {
        method: "POST",
        auth: true,
        body: {
          email: inviteEmail,
          firstName: inviteFirstName,
          lastName: inviteLastName,
          role: inviteRole,
          note: inviteNote
        }
      });

      const item = unwrapItem(payload);
      setInvites((current) => (item ? [item, ...current] : current));
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Failed to create invitation.");
    } finally {
      setInviteBusy(null);
    }
  }

  async function submitBusinessSignup() {
    setSignupBusy(true);
    setSignupError(null);

    try {
      const payload = await requestJson<BusinessSignup>("/v1/business-signups", {
        method: "POST",
        body: {
          businessName: signupPayload.businessName,
          ownerName: signupPayload.ownerName,
          mobileNumber: signupPayload.mobileNumber,
          email: signupPayload.email,
          addressLine1: signupPayload.addressLine1,
          addressLine2: signupPayload.addressLine2 || undefined,
          city: signupPayload.city,
          region: signupPayload.region || undefined,
          postalCode: signupPayload.postalCode || undefined,
          countryCode: signupPayload.countryCode,
          industryType: signupPayload.industryType,
          serviceStationsCount: Number(signupPayload.serviceStationsCount),
          openingHoursNote: signupPayload.openingHoursNote,
          latitude: Number(signupPayload.latitude),
          longitude: Number(signupPayload.longitude),
          placeId: signupPayload.placeId || undefined,
          geolocationSource: signupPayload.geolocationSource,
          pinConfirmedAt: new Date().toISOString()
        }
      });

      setSignupResult(unwrapItem(payload));
    } catch (error) {
      setSignupError(error instanceof Error ? error.message : "Failed to submit business signup.");
    } finally {
      setSignupBusy(false);
    }
  }

  useEffect(() => {
    void loadShops();
  }, []);

  useEffect(() => {
    if (accessToken && !authUser) {
      void loadMe();
    }
  }, [accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const deviceHost =
    typeof window === "undefined" ? "127.0.0.1" : window.location.hostname || "127.0.0.1";

  return (
    <section className="section lab-shell">
      <div className="lab-toolbar">
        <div>
          <h2>Device Lab</h2>
          <p>
            Use this page on phones, tablets, and desktop browsers to validate the real `Q-App` mobile-facing
            APIs against end-to-end flows.
          </p>
        </div>
        <div className="lab-toolbar-links">
          <Link className="button" href="/shops">
            Public Shop Pages
          </Link>
          <Link className="button primary" href={`/queue/${trackingToken || "demo-queue-amir"}`}>
            Queue Status Page
          </Link>
        </div>
      </div>

      <div className="lab-banner">
        <strong>LAN testing target</strong>
        <span>
          Web: <code className="inline">http://{deviceHost}:3000/lab</code>
        </span>
        <span>
          API: <code className="inline">{apiBaseUrl}</code>
        </span>
      </div>

      <div className="console-grid">
        <article className="console-card console-card-wide">
          <div className="console-card-header">
            <strong>Connection</strong>
            <button className="button primary" disabled={apiChecking} onClick={() => void checkApiHealth()} type="button">
              {apiChecking ? "Checking..." : "Check API Health"}
            </button>
          </div>
          <div className="lab-form-grid">
            <label className="field field-wide">
              <span>API Base URL</span>
              <input value={apiBaseUrl} onChange={(event) => setApiBaseUrl(event.target.value)} />
            </label>
          </div>
          <p className="status-text">{apiHealthMessage}</p>
        </article>

        <article className="console-card console-card-wide">
          <div className="console-card-header">
            <strong>Authentication</strong>
            <div className="pill-group">
              {demoCredentials.map((preset) => (
                <button
                  className="button"
                  key={preset.label}
                  onClick={() => {
                    setLoginIdentifier(preset.identifier);
                    setLoginPassword(preset.password);
                    setDeviceName(preset.deviceName);
                    setPlatform(preset.platform);
                  }}
                  type="button"
                >
                  {preset.label} Preset
                </button>
              ))}
            </div>
          </div>
          <div className="lab-form-grid">
            <label className="field">
              <span>Identifier</span>
              <input value={loginIdentifier} onChange={(event) => setLoginIdentifier(event.target.value)} />
            </label>
            <label className="field">
              <span>Password</span>
              <input type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} />
            </label>
            <label className="field">
              <span>Device Name</span>
              <input value={deviceName} onChange={(event) => setDeviceName(event.target.value)} />
            </label>
            <label className="field">
              <span>Platform</span>
              <select value={platform} onChange={(event) => setPlatform(event.target.value)}>
                <option value="ios">ios</option>
                <option value="android">android</option>
                <option value="web">web</option>
              </select>
            </label>
          </div>
          <div className="console-actions">
            <button className="button primary" disabled={authBusy === "login"} onClick={() => void handleLogin()} type="button">
              {authBusy === "login" ? "Logging in..." : "Login"}
            </button>
            <button className="button" disabled={!accessToken || authBusy === "me"} onClick={() => void loadMe()} type="button">
              Load Me
            </button>
            <button
              className="button"
              disabled={!accessToken || authBusy === "sessions"}
              onClick={() => void loadAuthSessions()}
              type="button"
            >
              Sessions
            </button>
            <button
              className="button"
              disabled={!accessToken || authBusy === "activity"}
              onClick={() => void loadAuthActivity()}
              type="button"
            >
              Activity
            </button>
            <button
              className="button"
              disabled={!accessToken || authBusy === "logout"}
              onClick={() => void handleLogoutCurrent()}
              type="button"
            >
              Logout Current
            </button>
          </div>
          {authError ? <p className="status-text warning">{authError}</p> : null}
          <div className="lab-summary-grid">
            <div className="summary-panel">
              <strong>Current Session</strong>
              <p>
                Session: {sessionId || "Not logged in"}
                <br />
                Access token: {accessToken ? "Loaded" : "Missing"}
                <br />
                Refresh token: {refreshToken ? "Loaded" : "Missing"}
              </p>
            </div>
            <div className="summary-panel">
              <strong>User</strong>
              <p>
                {authUser ? `${authUser.firstName} ${authUser.lastName ?? ""}`.trim() : "No user loaded"}
                <br />
                {authUser?.email ?? "No email"}
                <br />
                Role: {authUser?.appRole ?? "N/A"}
              </p>
            </div>
          </div>
        </article>

        <article className="console-card">
          <div className="console-card-header">
            <strong>Discovery</strong>
            <button className="button primary" disabled={discoveryBusy} onClick={() => void loadShops()} type="button">
              {discoveryBusy ? "Loading..." : "Load Shops"}
            </button>
          </div>
          <div className="lab-form-grid">
            <label className="field">
              <span>Latitude</span>
              <input value={shopLatitude} onChange={(event) => setShopLatitude(event.target.value)} />
            </label>
            <label className="field">
              <span>Longitude</span>
              <input value={shopLongitude} onChange={(event) => setShopLongitude(event.target.value)} />
            </label>
          </div>
          {discoveryError ? <p className="status-text warning">{discoveryError}</p> : null}
          <div className="lab-list">
            {shops.map((shop) => (
              <button
                className={shop.slug === selectedShopSlug ? "lab-list-row lab-list-row-active" : "lab-list-row"}
                key={shop.id}
                onClick={() => {
                  setSelectedShopSlug(shop.slug);
                  void loadShopDetail(shop.slug);
                }}
                type="button"
              >
                <span>
                  <strong>{shop.name}</strong>
                  <small>
                    {shop.city} • {shop.queueLength} waiting • {shop.estimatedWaitMin} min
                  </small>
                </span>
                <span className={shop.queuePaused ? "pill" : "pill pill-good"}>
                  {shop.queuePaused ? "Paused" : "Open"}
                </span>
              </button>
            ))}
          </div>
        </article>

        <article className="console-card">
          <div className="console-card-header">
            <strong>Selected Shop</strong>
            <Link className="button" href={`/shops/${selectedShopSlug}`}>
              Open Public View
            </Link>
          </div>
          {selectedShop ? (
            <div className="summary-panel">
              <p>
                {selectedShop.name}
                <br />
                {selectedShop.addressLine1}, {selectedShop.city}
                <br />
                Queue length: {selectedShop.queueLength}
                <br />
                Estimated wait: {selectedShop.estimatedWaitMin} min
              </p>
            </div>
          ) : (
            <p className="status-text">Load shops to choose a test location.</p>
          )}
        </article>

        <article className="console-card console-card-wide">
          <div className="console-card-header">
            <strong>Customer Queue Flow</strong>
            <div className="pill-group">
              <button className="button primary" disabled={queueBusy === "start"} onClick={() => void startQueueJoin()} type="button">
                {queueBusy === "start" ? "Starting..." : "Start Queue Join"}
              </button>
              <button
                className="button"
                disabled={!joinChallenge || queueBusy === "verify"}
                onClick={() => void verifyQueueJoin()}
                type="button"
              >
                {queueBusy === "verify" ? "Verifying..." : "Verify Join"}
              </button>
              <button
                className="button"
                disabled={!trackingToken || queueBusy === "status"}
                onClick={() => void loadQueueStatus()}
                type="button"
              >
                Refresh Queue
              </button>
            </div>
          </div>
          <div className="lab-form-grid">
            <label className="field">
              <span>Name</span>
              <input value={firstName} onChange={(event) => setFirstName(event.target.value)} />
            </label>
            <label className="field">
              <span>Mobile Number</span>
              <input value={mobileNumber} onChange={(event) => setMobileNumber(event.target.value)} />
            </label>
            <label className="field">
              <span>OTP Code</span>
              <input value={otpCode} onChange={(event) => setOtpCode(event.target.value)} />
            </label>
            <label className="field field-wide">
              <span>Tracking Token</span>
              <input value={trackingToken} onChange={(event) => setTrackingToken(event.target.value)} />
            </label>
          </div>
          {queueError ? <p className="status-text warning">{queueError}</p> : null}
          <div className="lab-summary-grid">
            <div className="summary-panel">
              <strong>Join Challenge</strong>
              <p>
                Challenge: {joinChallenge?.challengeId ?? "Not started"}
                <br />
                Expires: {formatDateTime(joinChallenge?.expiresAt)}
                <br />
                Preview code: {joinChallenge?.codePreview ?? "Unavailable"}
              </p>
            </div>
            <div className="summary-panel">
              <strong>Queue State</strong>
              <p>
                Position: {queueStatus?.position ?? "N/A"}
                <br />
                Wait: {queueStatus?.estimatedWaitMin ?? "N/A"} min
                <br />
                Confirmation: {queueStatus?.confirmationStatus ?? "N/A"}
              </p>
            </div>
          </div>
          <div className="console-actions">
            <button
              className="button primary"
              disabled={!queueStatus?.canRespondToArrival || queueBusy === "COMING"}
              onClick={() => void respondToArrival("COMING")}
              type="button"
            >
              {queueBusy === "COMING" ? "Sending..." : "Yes, I am coming"}
            </button>
            <button
              className="button"
              disabled={!queueStatus?.canRespondToArrival || queueBusy === "DECLINED"}
              onClick={() => void respondToArrival("DECLINED")}
              type="button"
            >
              {queueBusy === "DECLINED" ? "Sending..." : "Release my place"}
            </button>
            <Link className="button" href={`/queue/${trackingToken || "demo-queue-amir"}`}>
              Open Customer Status Page
            </Link>
          </div>
        </article>

        <article className="console-card console-card-wide">
          <div className="console-card-header">
            <strong>Operator Queue Flow</strong>
            <div className="pill-group">
              <button className="button primary" disabled={opsBusy === "dashboard"} onClick={() => void loadDashboard()} type="button">
                {opsBusy === "dashboard" ? "Loading..." : "Load Dashboard"}
              </button>
              <button
                className="button"
                disabled={opsBusy === "pause"}
                onClick={() => void postOpsAction(`/v1/ops/shops/${selectedShopSlug}/pause-queue`, "pause", { reason: pauseReason })}
                type="button"
              >
                Pause Queue
              </button>
              <button
                className="button"
                disabled={opsBusy === "resume"}
                onClick={() => void postOpsAction(`/v1/ops/shops/${selectedShopSlug}/resume-queue`, "resume")}
                type="button"
              >
                Resume Queue
              </button>
            </div>
          </div>
          <div className="lab-form-grid">
            <label className="field">
              <span>Walk-in Name</span>
              <input value={walkInFirstName} onChange={(event) => setWalkInFirstName(event.target.value)} />
            </label>
            <label className="field">
              <span>Walk-in Mobile</span>
              <input value={walkInMobile} onChange={(event) => setWalkInMobile(event.target.value)} />
            </label>
            <label className="field">
              <span>Planned Duration Min</span>
              <input value={walkInDuration} onChange={(event) => setWalkInDuration(event.target.value)} />
            </label>
            <label className="field field-wide">
              <span>Pause Reason</span>
              <input value={pauseReason} onChange={(event) => setPauseReason(event.target.value)} />
            </label>
          </div>
          <div className="console-actions">
            <button
              className="button primary"
              disabled={opsBusy === "walkin"}
              onClick={() =>
                void postOpsAction(`/v1/ops/shops/${selectedShopSlug}/walk-ins`, "walkin", {
                  firstName: walkInFirstName,
                  mobileNumber: walkInMobile || undefined,
                  plannedDurationMin: Number(walkInDuration)
                })
              }
              type="button"
            >
              {opsBusy === "walkin" ? "Adding..." : "Add Walk-in"}
            </button>
            <Link className="button" href={`/ops/shops/${selectedShopSlug}`}>
              Open Operator Page
            </Link>
          </div>
          {opsError ? <p className="status-text warning">{opsError}</p> : null}
          {dashboard ? (
            <div className="dashboard-preview">
              <div className="summary-panel">
                <strong>{dashboard.shop.name}</strong>
                <p>
                  Waiting: {dashboard.queueEntries.length}
                  <br />
                  In service: {dashboard.inServiceVisits.length}
                  <br />
                  Queue: {dashboard.shop.queuePaused ? "Paused" : "Active"}
                </p>
              </div>
              <div className="dashboard-preview-columns">
                <div className="dashboard-preview-list">
                  <strong>Waiting Queue</strong>
                  {dashboard.queueEntries.map((entry) => (
                    <div className="dashboard-preview-row" key={entry.id}>
                      <div>
                        <span>{entry.visit.customer.firstName}</span>
                        <small>
                          #{entry.sortIndex} • {entry.visit.estimatedWaitMin ?? "?"} min • {entry.confirmationStatus}
                        </small>
                      </div>
                      <div className="pill-group">
                        <button
                          className="button"
                          disabled={opsBusy === `call:${entry.id}`}
                          onClick={() =>
                            void postOpsAction(
                              `/v1/ops/shops/${selectedShopSlug}/queue/${entry.trackingToken}/call`,
                              `call:${entry.id}`
                            )
                          }
                          type="button"
                        >
                          Call
                        </button>
                        <button
                          className="button primary"
                          disabled={opsBusy === `start:${entry.id}`}
                          onClick={() =>
                            void postOpsAction(
                              `/v1/ops/shops/${selectedShopSlug}/queue/${entry.trackingToken}/start-service`,
                              `start:${entry.id}`
                            )
                          }
                          type="button"
                        >
                          Start
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="dashboard-preview-list">
                  <strong>In Service</strong>
                  {dashboard.inServiceVisits.map((visit) => (
                    <div className="dashboard-preview-row" key={visit.id}>
                      <div>
                        <span>{visit.customer.firstName}</span>
                        <small>{visit.plannedDurationMin ?? "?"} min planned</small>
                      </div>
                      <button
                        className="button primary"
                        disabled={opsBusy === `complete:${visit.id}`}
                        onClick={() =>
                          void postOpsAction(
                            `/v1/ops/shops/${selectedShopSlug}/visits/${visit.id}/complete-service`,
                            `complete:${visit.id}`
                          )
                        }
                        type="button"
                      >
                        Complete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="status-text">Log in as owner or staff, then load the dashboard.</p>
          )}
        </article>

        <article className="console-card">
          <div className="console-card-header">
            <strong>Invitations</strong>
            <div className="pill-group">
              <button className="button" disabled={inviteBusy === "list"} onClick={() => void loadInvitations()} type="button">
                {inviteBusy === "list" ? "Loading..." : "Load Invites"}
              </button>
              <button
                className="button primary"
                disabled={inviteBusy === "create"}
                onClick={() => void createInvitation()}
                type="button"
              >
                {inviteBusy === "create" ? "Creating..." : "Create Invite"}
              </button>
            </div>
          </div>
          <div className="lab-form-grid">
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
          {inviteError ? <p className="status-text warning">{inviteError}</p> : null}
          <div className="lab-list">
            {invites.length === 0 ? (
              <p className="status-text">No invitations loaded yet.</p>
            ) : (
              invites.map((invite) => (
                <div className="lab-list-row" key={invite.id}>
                  <span>
                    <strong>{invite.email}</strong>
                    <small>
                      {invite.role} • expires {formatDateTime(invite.expiresAt)}
                    </small>
                  </span>
                  <span className={invite.acceptedAt ? "pill pill-good" : "pill"}>
                    {invite.acceptedAt ? "Accepted" : "Pending"}
                  </span>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="console-card">
          <div className="console-card-header">
            <strong>Business Signup</strong>
            <button className="button primary" disabled={signupBusy} onClick={() => void submitBusinessSignup()} type="button">
              {signupBusy ? "Submitting..." : "Submit Signup"}
            </button>
          </div>
          <div className="lab-form-grid">
            <label className="field">
              <span>Business Name</span>
              <input
                value={signupPayload.businessName}
                onChange={(event) => setSignupPayload((current) => ({ ...current, businessName: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Owner Name</span>
              <input
                value={signupPayload.ownerName}
                onChange={(event) => setSignupPayload((current) => ({ ...current, ownerName: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Email</span>
              <input
                value={signupPayload.email}
                onChange={(event) => setSignupPayload((current) => ({ ...current, email: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Mobile</span>
              <input
                value={signupPayload.mobileNumber}
                onChange={(event) => setSignupPayload((current) => ({ ...current, mobileNumber: event.target.value }))}
              />
            </label>
            <label className="field field-wide">
              <span>Address</span>
              <input
                value={signupPayload.addressLine1}
                onChange={(event) => setSignupPayload((current) => ({ ...current, addressLine1: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>City</span>
              <input
                value={signupPayload.city}
                onChange={(event) => setSignupPayload((current) => ({ ...current, city: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Industry</span>
              <select
                value={signupPayload.industryType}
                onChange={(event) => setSignupPayload((current) => ({ ...current, industryType: event.target.value }))}
              >
                <option value="BARBER">BARBER</option>
                <option value="SALON">SALON</option>
                <option value="NAIL_STUDIO">NAIL_STUDIO</option>
                <option value="BEAUTY_CLINIC">BEAUTY_CLINIC</option>
              </select>
            </label>
            <label className="field">
              <span>Latitude</span>
              <input
                value={signupPayload.latitude}
                onChange={(event) => setSignupPayload((current) => ({ ...current, latitude: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Longitude</span>
              <input
                value={signupPayload.longitude}
                onChange={(event) => setSignupPayload((current) => ({ ...current, longitude: event.target.value }))}
              />
            </label>
          </div>
          {signupError ? <p className="status-text warning">{signupError}</p> : null}
          {signupResult ? (
            <p className="status-text">
              Submitted {signupResult.businessName} with status {signupResult.approvalStatus}.
            </p>
          ) : (
            <p className="status-text">Use this to validate public onboarding payloads manually.</p>
          )}
        </article>
      </div>

      <div className="console-grid">
        <JsonPreview title="Current User JSON" value={authUser} />
        <JsonPreview title="Queue Status JSON" value={queueStatus} />
        <JsonPreview title="Dashboard JSON" value={dashboard} />
        <JsonPreview title="Signup Result JSON" value={signupResult} />
      </div>
    </section>
  );
}
