import * as Notifications from "expo-notifications";

/* Turn alerts, two layers:
 * 1. Remote (Expo push): token registered against the queue entry; the API
 *    fires "are you coming?" / "your turn" even when the app is closed.
 *    Works in dev/TestFlight builds; Expo Go can't receive remote push.
 * 2. Local: while the app is open, state flips also present a banner+sound
 *    so the phone buzzes in hand. Works everywhere, including Expo Go. */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

export async function getPushTokenSafely(): Promise<string | null> {
  try {
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) return null;
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data ?? null;
  } catch {
    // Expo Go (no remote push) or simulator — local alerts still work.
    return null;
  }
}

export async function presentTurnAlert(title: string, body: string) {
  try {
    await Notifications.requestPermissionsAsync();
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: "default" },
      trigger: null
    });
  } catch {
    // alerting is best-effort
  }
}

/* Re-engagement: a fortnight after a completed visit, remind the customer
 * their next visit is due. Purely local — works before any server push. */
const NUDGE_KIND = "return-nudge";

export async function scheduleReturnNudge(shopName: string, slug: string) {
  try {
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return;
    // One pending nudge per shop: the latest completed visit wins.
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of pending) {
      const data = item.content.data as { kind?: string; slug?: string } | undefined;
      if (data?.kind === NUDGE_KIND && data.slug === slug) {
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
      }
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Time for a fresh look?",
        body: `It's been two weeks since ${shopName}. Join the queue from home and walk in with no wait.`,
        sound: "default",
        data: { kind: NUDGE_KIND, slug }
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 14 * 24 * 3600
      }
    });
  } catch {
    // engagement is best-effort
  }
}
