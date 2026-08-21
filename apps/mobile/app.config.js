// Dynamic Expo config layered over app.json. Everything that depends on the
// production domain or OAuth IDs comes from env so nothing secret is committed.
const domain = process.env.ONQ_PUBLIC_DOMAIN || "";

module.exports = ({ config }) => ({
  ...config,
  // Keep every scheme from app.json (onq, the iOS reversed Google client id,
  // and the Android package name used as the Google OAuth redirect scheme).
  scheme: config.scheme ?? "onq",
  ios: {
    ...config.ios,
    usesAppleSignIn: true,
    associatedDomains: domain ? [`applinks:${domain}`] : [],
    infoPlist: {
      ...(config.ios?.infoPlist ?? {}),
      NSLocationWhenInUseUsageDescription: "OnQ uses your location to show how far each salon is and to route you by distance."
    }
  },
  android: {
    ...config.android,
    intentFilters: [
      ...(config.android?.intentFilters ?? []),
      ...(domain
        ? [
            {
              action: "VIEW",
              autoVerify: true,
              data: [{ scheme: "https", host: domain, pathPrefix: "/shops" }, { scheme: "https", host: domain, pathPrefix: "/queue" }],
              category: ["BROWSABLE", "DEFAULT"]
            }
          ]
        : [])
    ]
  },
  plugins: [...(config.plugins ?? []), "expo-apple-authentication", "expo-notifications", "expo-location"],
  extra: {
    ...(config.extra ?? {}),
    publicDomain: domain,
    googleClientIds: {
      ...(config.extra?.googleClientIds ?? {}),
      ...(process.env.GOOGLE_IOS_CLIENT_ID ? { iosClientId: process.env.GOOGLE_IOS_CLIENT_ID } : {}),
      ...(process.env.GOOGLE_ANDROID_CLIENT_ID ? { androidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID } : {}),
      ...(process.env.GOOGLE_WEB_CLIENT_ID ? { webClientId: process.env.GOOGLE_WEB_CLIENT_ID } : {})
    }
  }
});
