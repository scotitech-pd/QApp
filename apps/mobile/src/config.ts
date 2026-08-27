// Dev builds talk to the Mac on the LAN; release builds go to production.
// One domain serves web, API (/v1) and sockets behind the reverse proxy.
const DEV_HOST = "http://192.168.0.20";

export const API_BASE_URL = __DEV__ ? `${DEV_HOST}:4000` : "https://onq.scotitech.com";
export const WEB_BASE_URL = __DEV__ ? `${DEV_HOST}:3000` : "https://onq.scotitech.com";

// Google OAuth client IDs (project greedydog-980). Kept in code so dev builds
// don't depend on a build-time embedded manifest; the API verifies the
// ID token audience against the same three IDs.
export const GOOGLE_CLIENT_IDS = {
  iosClientId: "216837184187-q7v35ru832dnb9rqbcn051ef93lva51t.apps.googleusercontent.com",
  androidClientId: "216837184187-i2jvt542dcb2gh570an42ngc6n8sdj85.apps.googleusercontent.com",
  webClientId: "216837184187-s5hiouu90lqompuk38cpses0ehoqdkcd.apps.googleusercontent.com"
};
