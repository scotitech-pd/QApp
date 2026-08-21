// Point the app at your API.
// - Same Wi-Fi (phone or simulator): use your Mac's LAN IP below.
// - Production later: change to your Render URL.
export const API_BASE_URL = "http://192.168.0.20:4000";

// Public web app (QR pages, share links). Later: your production domain.
export const WEB_BASE_URL = "http://192.168.0.20:3000";

// Google OAuth client IDs (project greedydog-980). Kept in code so dev builds
// don't depend on a build-time embedded manifest; the API verifies the
// ID token audience against the same three IDs.
export const GOOGLE_CLIENT_IDS = {
  iosClientId: "216837184187-q7v35ru832dnb9rqbcn051ef93lva51t.apps.googleusercontent.com",
  androidClientId: "216837184187-i2jvt542dcb2gh570an42ngc6n8sdj85.apps.googleusercontent.com",
  webClientId: "216837184187-s5hiouu90lqompuk38cpses0ehoqdkcd.apps.googleusercontent.com"
};
