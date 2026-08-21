// iOS Universal Links: the same printed QR (https://<domain>/shops/<slug>)
// opens the installed OnQ app directly. Served without extension, as Apple requires.
export const dynamic = "force-dynamic";

export function GET() {
  const appId = `${process.env.APPLE_TEAM_ID ?? "L5VNLM8G7B"}.${process.env.IOS_BUNDLE_ID ?? "com.scotitech.qapp"}`;
  const body = {
    applinks: {
      apps: [],
      details: [{ appID: appId, paths: ["/shops/*", "/queue/*"] }]
    }
  };
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
}
