"use client";

export type ApiMeta = {
  requestId?: string;
  count?: number;
};

export type ApiEnvelope<T> = {
  data?: T;
  item?: T;
  error?: string;
  code?: string;
  details?: unknown;
  meta?: ApiMeta;
};

export type ApiListEnvelope<T> = {
  data?: T[];
  items?: T[];
  error?: string;
  code?: string;
  details?: unknown;
  meta?: ApiMeta;
};

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
};

const deviceStorageKey = "qapp.anonymousDeviceId";

export function getAnonymousDeviceId() {
  if (typeof window === "undefined") {
    return null;
  }

  const existing = window.localStorage.getItem(deviceStorageKey);

  if (existing) {
    return existing;
  }

  const randomId =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const deviceId = `qapp-web:${randomId}`;
  window.localStorage.setItem(deviceStorageKey, deviceId);

  return deviceId;
}

export function getApiBaseUrl() {
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

export async function parseItemEnvelope<T>(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!response.ok) {
    throw new Error(payload.error ?? `${response.status} ${response.statusText}`);
  }

  return payload;
}

export async function parseListEnvelope<T>(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as ApiListEnvelope<T>;

  if (!response.ok) {
    throw new Error(payload.error ?? `${response.status} ${response.statusText}`);
  }

  return payload;
}

export function unwrapItem<T>(payload: ApiEnvelope<T>) {
  return payload.data ?? payload.item ?? null;
}

export function unwrapList<T>(payload: ApiListEnvelope<T>) {
  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  return [];
}

export async function requestJson<T>(path: string, options?: RequestOptions) {
  const headers: Record<string, string> = {
    ...(options?.headers ?? {})
  };
  const deviceId = getAnonymousDeviceId();

  if (deviceId) {
    headers["X-QApp-Device-Id"] = deviceId;
  }

  if (options?.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: options?.method ?? "GET",
    headers,
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined
  });

  return parseItemEnvelope<T>(response);
}

export async function requestJsonList<T>(path: string, options?: RequestOptions) {
  const headers: Record<string, string> = {
    ...(options?.headers ?? {})
  };
  const deviceId = getAnonymousDeviceId();

  if (deviceId) {
    headers["X-QApp-Device-Id"] = deviceId;
  }

  if (options?.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: options?.method ?? "GET",
    headers,
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined
  });

  return parseListEnvelope<T>(response);
}
