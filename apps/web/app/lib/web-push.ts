import { getApiBaseUrl } from "./api";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

/** Subscribe this browser to turn alerts for one queue place. Returns true on success. */
export async function subscribeToTurnAlerts(trackingToken: string): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  try {
    const meta = await fetch(`${getApiBaseUrl()}/v1/meta`).then((response) => response.json());
    const publicKey: string | null = meta?.data?.webPushPublicKey ?? null;
    if (!publicKey) return false;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const registration = await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      }));

    const response = await fetch(`${getApiBaseUrl()}/v1/queue/status/${trackingToken}/web-push`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subscription: subscription.toJSON() })
    });
    return response.ok;
  } catch {
    return false;
  }
}
