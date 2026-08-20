// Expo push delivery. Tokens come from the OnQ app (expo-notifications);
// Expo's push service relays to APNs/FCM, so no Firebase/Apple server setup
// is needed on our side. Fire-and-forget: a failed push must never break a
// queue transition.

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export function isExpoPushToken(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length < 200 &&
    (value.startsWith("ExponentPushToken[") || value.startsWith("ExpoPushToken["))
  );
}

export async function sendQueuePush(
  pushToken: string | null | undefined,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  if (!isExpoPushToken(pushToken)) return;

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        to: pushToken,
        title,
        body,
        sound: "default",
        priority: "high",
        data: data ?? {}
      })
    });

    if (!response.ok) {
      console.warn(`[push] Expo push responded ${response.status}`);
    }
  } catch (error) {
    console.warn("[push] delivery failed", error instanceof Error ? error.message : error);
  }
}
