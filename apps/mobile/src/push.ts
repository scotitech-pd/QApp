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
