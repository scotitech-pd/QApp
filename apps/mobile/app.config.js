// Dynamic Expo config layered over app.json. Everything that depends on the
// production domain or OAuth IDs comes from env so nothing secret is committed.
const domain = process.env.ONQ_PUBLIC_DOMAIN || "";

module.exports = ({ config }) => ({
  ...config,
  scheme: "onq",
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
    intentFilters: domain
      ? [
          {
            action: "VIEW",
            autoVerify: true,
            data: [{ scheme: "https", host: domain, pathPrefix: "/shops" }, { scheme: "https", host: domain, pathPrefix: "/queue" }],
            category: ["BROWSABLE", "DEFAULT"]
          }
        ]
      : []
  },
  plugins: [...(config.plugins ?? []), "expo-apple-authentication", "expo-notifications", "expo-location"],
  extra: {
    ...(config.extra ?? {}),
    publicDomain: domain,
    googleClientIds: {
      iosClientId: process.env.GOOGLE_IOS_CLIENT_ID || undefined,
      androidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID || undefined,
      webClientId: process.env.GOOGLE_WEB_CLIENT_ID || undefined
    }
  }
});
