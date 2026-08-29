import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin/", "/ops/", "/shop/", "/lab/"] }],
    sitemap: "https://onq.scotitech.com/sitemap.xml"
  };
}
