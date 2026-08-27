import { API_BASE_URL } from "./config";

type Json = Record<string, unknown>;

export class ApiRequestError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: Json; token?: string | null; deviceKey?: string | null } = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/v1${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...(options.deviceKey ? { "X-QApp-Device-Id": options.deviceKey } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    // non-JSON error body
  }

  if (!response.ok) {
    const message =
      (payload && (payload.error as string)) || `Request failed (${response.status})`;
    throw new ApiRequestError(message, response.status, payload?.code);
  }

  return (payload?.data ?? payload) as T;
}

export type ShopProfile = {
  slug: string;
  name: string;
  publicDescription: string | null;
  logoImageUrl: string | null;
  coverImageUrl: string | null;
  phone: string | null;
  email: string | null;
  serviceStationsCount: number;
  defaultWalkInDurationMin: number;
  openingHoursNote?: string | null;
  photos?: Array<{ id: string; url: string }>;
};

export type ShopProfileInput = {
  name: string;
  publicDescription: string | null;
  logoImageUrl: string | null;
  coverImageUrl: string | null;
  phone: string | null;
  email: string | null;
  openingHoursNote: string | null;
  serviceStationsCount: number;
  defaultWalkInDurationMin: number;
};

// ---------- Customer types ----------

export type ShopSummary = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  addressLine1: string | null;
  publicDescription: string | null;
  industryType?: string;
  latitude: number | null;
  longitude: number | null;
  queuePaused: boolean;
  logoImageUrl?: string | null;
  coverImageUrl?: string | null;
  queueLength?: number;
  estimatedWaitMin?: number | null;
  distanceKm?: number | null;
  reviewSummary?: { averageRating: number | null; ratingCount: number };
};

export type ShopDetail = ShopSummary & {
  photos?: Array<{ id: string; url: string }>;
  openingHours?: Record<string, string> | { note?: string } | null;
  serviceStationsCount?: number;
  phone?: string | null;
  reviews?: Array<{
    id?: string;
    rating: number;
    comment: string | null;
    createdAt?: string;
    customerName?: string;
    customerFirstName?: string;
    customer?: { firstName?: string };
  }>;
};

export type JoinStartResult = {
  challengeId: string;
  expiresAt: string;
  message: string;
  deliveryMode?: string;
  codePreview?: string;
  pilotMode?: boolean;
};

export type QueueStatus = {
  trackingToken: string;
  sortIndex?: number;
  position?: number | null;
  queueLength?: number;
  visitStatus: string;
  estimatedWaitMin: number | null;
  plannedDurationMin?: number | null;
  joinedAt?: string;
  calledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  confirmationStatus?: string;
  confirmationRequestedAt?: string | null;
  feedbackSubmitted?: boolean;
  customer: { firstName: string };
  shop: {
    id?: string;
    slug: string;
    name: string;
    city?: string | null;
    queuePaused: boolean;
    calledGracePeriodMin?: number;
  };
};

export type JoinVerifyResult = {
  alreadyJoined: boolean;
  queueStatus: QueueStatus;
};

// ---------- Owner types ----------

export type SessionUser = {
  id: string;
  appRole: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  memberships: Array<{ role: string; businessGroup: { id: string; name: string; slug: string } }>;
  staffProfiles: Array<{
    id: string;
    displayName: string;
    businessLocation: { id: string; name: string; slug: string };
  }>;
};

export type LoginResult = {
  user: SessionUser;
  tokens: { accessToken: string; refreshToken?: string };
};

export type OpsQueueEntry = {
  id: string;
  trackingToken: string;
  sortIndex: number;
  joinedAt: string;
  confirmationStatus: string;
  calledAt: string | null;
  missedAt: string | null;
  visit: {
    id: string;
    source: string;
    status: string;
    plannedDurationMin: number | null;
    estimatedWaitMin: number | null;
    customer: { id: string; firstName: string; phone: string | null };
  };
};

export type OpsDashboard = {
  shop: {
    id: string;
    slug: string;
    name: string;
    queuePaused: boolean;
    queuePauseReason: string | null;
    queueEnabled: boolean;
    serviceStationsCount: number;
    defaultWalkInDurationMin: number;
  };
  queueEntries: OpsQueueEntry[];
  inServiceVisits: Array<{
    id: string;
    status: string;
    startedAt: string | null;
    plannedDurationMin: number | null;
    customer: { firstName: string };
  }>;
  missedQueueEntries: OpsQueueEntry[];
  reviewSummary?: { averageRating: number | null; ratingCount: number };
};

export type ShopInsights = {
  servedToday: number;
  walkInsToday: number;
  avgDurationMin: number | null;
  servedThisWeek: number;
  servedLastWeek: number;
  byHourToday: Array<{ hour: number; count: number }>;
};

export type ShopCustomerRecord = {
  customerId: string;
  firstName: string;
  phoneMasked: string | null;
  visits: number;
  lastVisitAt: string | null;
};

export type BusinessSignupPayload = {
  businessName: string;
  ownerName: string;
  mobileNumber: string;
  email: string;
  password: string;
  industryType: string;
  serviceStationsCount: number;
  openingHoursNote: string;
  latitude: number;
  longitude: number;
  geolocationSource: "BROWSER_GPS" | "MANUAL_PIN";
  pinConfirmedAt: string;
  addressLine1?: string;
  city?: string;
  postalCode?: string;
  countryCode?: string;
};

export type BusinessSignupStatus = {
  businessName: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  submittedAt: string;
  approvedAt: string | null;
  rejectionReason: string | null;
};

export type CustomerProfile = {
  id: string;
  firstName: string;
  email: string | null;
  phone: string | null;
  avatarUrl?: string | null;
  memberSince?: string;
  providers: string[];
  stats?: { visits: number; ratings: number; favorites: number };
};

export type VisitHistoryItem = {
  id: string;
  shopName: string;
  shopSlug: string;
  city: string | null;
  status: string;
  source: string;
  joinedAt: string;
  completedAt: string | null;
  rating: number | null;
};

// ---------- Customer endpoints ----------

export const api = {
  listShops: (latitude?: number, longitude?: number) => {
    const params =
      latitude != null && longitude != null ? `?latitude=${latitude}&longitude=${longitude}` : "";
    return request<ShopSummary[]>(`/shops${params}`);
  },
  getShop: (slug: string) => request<ShopDetail>(`/shops/${slug}`),
  joinStart: (shopSlug: string, firstName: string, mobileNumber: string) =>
    request<JoinStartResult>("/queue/join/start", {
      method: "POST",
      body: { shopSlug, firstName, mobileNumber }
    }),
  joinDirect: (shopSlug: string, token: string, guest?: { firstName: string; mobileNumber: string }) =>
    request<JoinVerifyResult>("/queue/join/direct", {
      method: "POST",
      token,
      body: {
        shopSlug,
        ...(guest ? { forFirstName: guest.firstName, forPhone: guest.mobileNumber } : {})
      }
    }),
  joinVerify: (challengeId: string, code: string) =>
    request<JoinVerifyResult>("/queue/join/verify", {
      method: "POST",
      body: { challengeId, code }
    }),
  queueStatus: (trackingToken: string) => request<QueueStatus>(`/queue/status/${trackingToken}`),
  registerPushToken: (trackingToken: string, token: string) =>
    request<unknown>(`/queue/status/${trackingToken}/push-token`, {
      method: "POST",
      body: { token }
    }),
  // Returns only { trackingToken, response } — callers must re-fetch queueStatus
  // for the full record (shop, position, ETA).
  respondArrival: (trackingToken: string, response: "COMING" | "DECLINED") =>
    request<{ trackingToken: string; response: string }>(`/queue/status/${trackingToken}/respond-arrival`, {
      method: "POST",
      body: { response }
    }),
  leaveQueue: (trackingToken: string) =>
    request<QueueStatus>(`/queue/status/${trackingToken}/leave`, { method: "POST", body: {} }),
  sendFeedback: (trackingToken: string, rating: number, comment?: string) =>
    request<unknown>(`/queue/status/${trackingToken}/feedback`, {
      method: "POST",
      body: { rating, ...(comment ? { comment } : {}) }
    }),

  // ---------- Owner endpoints ----------

  login: (identifier: string, password: string) =>
    request<LoginResult>("/auth/login", {
      method: "POST",
      body: { identifier, password, deviceName: "OnQ Mobile", platform: "ios" }
    }),
  me: (token: string) => request<SessionUser>("/auth/me", { token }),
  opsDashboard: (token: string, slug: string) =>
    request<OpsDashboard>(`/ops/shops/${slug}/dashboard`, { token }),
  opsShopProfile: (token: string, slug: string) =>
    request<ShopProfile>(`/ops/shops/${slug}/profile`, { token }),
  opsUpdateShopProfile: (token: string, slug: string, input: Partial<ShopProfileInput>) =>
    request<ShopProfile>(`/ops/shops/${slug}/profile`, { method: "PUT", token, body: input }),
  opsAddShopPhoto: (token: string, slug: string, imageUrl: string) =>
    request<{ id: string; url: string }>(`/ops/shops/${slug}/photos`, { method: "POST", token, body: { imageUrl } }),
  opsRemoveShopPhoto: (token: string, slug: string, photoId: string) =>
    request<{ removed: boolean }>(`/ops/shops/${slug}/photos/${photoId}`, { method: "DELETE", token }),
  opsArchiveShop: (token: string, slug: string) =>
    request<{ archived: boolean }>(`/ops/shops/${slug}/archive`, { method: "POST", token }),
  opsCall: (token: string, slug: string, trackingToken: string) =>
    request<unknown>(`/ops/shops/${slug}/queue/${trackingToken}/call`, {
      method: "POST",
      body: {},
      token
    }),
  opsStartService: (token: string, slug: string, trackingToken: string) =>
    request<unknown>(`/ops/shops/${slug}/queue/${trackingToken}/start-service`, {
      method: "POST",
      body: {},
      token
    }),
  opsCompleteService: (token: string, slug: string, visitId: string, serviceTag?: string) =>
    request<unknown>(`/ops/shops/${slug}/visits/${visitId}/complete-service`, {
      method: "POST",
      body: serviceTag ? { serviceTag } : {},
      token
    }),
  opsReleaseNoShow: (token: string, slug: string, trackingToken: string) =>
    request<unknown>(`/ops/shops/${slug}/queue/${trackingToken}/release-no-show`, {
      method: "POST",
      body: {},
      token
    }),
  opsReinstate: (token: string, slug: string, trackingToken: string) =>
    request<unknown>(`/ops/shops/${slug}/queue/${trackingToken}/reinstate`, {
      method: "POST",
      body: {},
      token
    }),
  opsAddWalkIn: (token: string, slug: string, firstName: string, mobileNumber?: string) =>
    request<unknown>(`/ops/shops/${slug}/walk-ins`, {
      method: "POST",
      body: { firstName, ...(mobileNumber ? { mobileNumber } : {}) },
      token
    }),
  opsPauseQueue: (token: string, slug: string, reason?: string) =>
    request<unknown>(`/ops/shops/${slug}/pause-queue`, {
      method: "POST",
      body: reason ? { reason } : {},
      token
    }),
  opsResumeQueue: (token: string, slug: string) =>
    request<unknown>(`/ops/shops/${slug}/resume-queue`, { method: "POST", body: {}, token }),
  opsExtendService: (token: string, slug: string, visitId: string) =>
    request<unknown>(`/ops/shops/${slug}/visits/${visitId}/extend-service`, {
      method: "POST",
      body: { durationDeltaMin: 10, label: "+10 min" },
      token
    }),
  opsReorder: (token: string, slug: string, trackingTokens: string[]) =>
    request<OpsDashboard>(`/ops/shops/${slug}/queue/reorder`, { method: "POST", body: { trackingTokens }, token }),
  opsInsights: (token: string, slug: string) => request<ShopInsights>(`/ops/shops/${slug}/insights`, { token }),
  opsCustomers: (token: string, slug: string) =>
    request<ShopCustomerRecord[]>(`/ops/shops/${slug}/customers`, { token })
,

  // ---------- Business onboarding (owner without an account) ----------

  businessSignup: (payload: BusinessSignupPayload) =>
    request<{ id: string; approvalStatus: string; createdAt: string }>("/business-signups", { method: "POST", body: payload }),
  businessSignupStatus: (email: string, mobileNumber: string) =>
    request<BusinessSignupStatus>("/business-signups/status", { method: "POST", body: { email, mobileNumber } }),

  // ---------- Customer accounts (optional sign-in) ----------

  customerAuthApple: (identityToken: string, firstName?: string | null) =>
    request<{ token: string; profile: CustomerProfile }>("/customer/auth/apple", {
      method: "POST",
      body: { identityToken, ...(firstName ? { firstName } : {}) }
    }),
  customerAuthGoogle: (idToken: string) =>
    request<{ token: string; profile: CustomerProfile }>("/customer/auth/google", { method: "POST", body: { idToken } }),
  customerMe: (token: string) => request<CustomerProfile>("/customer/me", { token }),
  customerHistory: (token: string) => request<VisitHistoryItem[]>("/customer/me/history", { token }),
  customerClaim: (token: string, trackingToken: string) =>
    request<CustomerProfile>("/customer/me/claim", { method: "POST", body: { trackingToken }, token }),
  customerUpdateAvatar: (token: string, avatarUrl: string | null) =>
    request<CustomerProfile>("/customer/me", { method: "PATCH", token, body: { avatarUrl } }),
  customerUpdate: (token: string, firstName: string) =>
    request<CustomerProfile>("/customer/me", { method: "PATCH", body: { firstName }, token }),
  customerDelete: (token: string) => request<{ deleted: boolean }>("/customer/me", { method: "DELETE", token }),
  customerLinkDevice: (token: string, deviceKey: string) =>
    request<{ linked: boolean }>("/customer/me/link-device", { method: "POST", body: { deviceKey }, token }),

  // ---------- Favourites (per device; linked to the account on sign-in) ----------

  listFavorites: (deviceKey: string) => request<ShopSummary[]>("/preferences/favorites", { deviceKey }),
  setFavorite: (deviceKey: string, slug: string, on: boolean) =>
    request<unknown>(`/preferences/favorites/${slug}`, { method: on ? "PUT" : "DELETE", deviceKey })
};
