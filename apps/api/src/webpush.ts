import webpush from "web-push";

/* Browser push for the no-app QR path (rung 3 of the notification ladder).
 * Subscriptions are stored per queue entry; delivery is fire-and-forget. */

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const configured = Boolean(publicKey && privateKey);

if (configured) {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:hello@onq.app", publicKey as string, privateKey as string);
}

export type WebPushSubscription = { endpoint: string; keys: { p256dh: string; auth: string } };

export function webPushPublicKey() {
  return configured ? (publicKey as string) : null;
}

export function isWebPushSubscription(value: unknown): value is WebPushSubscription {
  if (!value || typeof value !== "object") return false;
  const sub = value as Record<string, unknown>;
  const keys = sub.keys as Record<string, unknown> | undefined;
  return typeof sub.endpoint === "string" && Boolean(keys) && typeof keys?.p256dh === "string" && typeof keys?.auth === "string";
}

export async function sendWebPush(subscription: unknown, title: string, body: string, data?: Record<string, unknown>) {
  if (!configured || !isWebPushSubscription(subscription)) return;
  try {
    await webpush.sendNotification(subscription, JSON.stringify({ title, body, data: data ?? {} }), { TTL: 600 });
  } catch (error) {
    console.warn("[webpush] delivery failed", error instanceof Error ? error.message : error);
  }
}
