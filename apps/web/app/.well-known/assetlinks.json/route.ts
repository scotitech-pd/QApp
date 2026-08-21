// Android App Links: verifies com.scotitech.qapp may handle https://<domain>/shops/*.
// ANDROID_SHA256_FINGERPRINTS = comma-separated release-keystore SHA-256 fingerprints.
export const dynamic = "force-dynamic";

export function GET() {
  const fingerprints = (process.env.ANDROID_SHA256_FINGERPRINTS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const body = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: process.env.ANDROID_PACKAGE ?? "com.scotitech.qapp",
        sha256_cert_fingerprints: fingerprints
      }
    }
  ];
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
}
