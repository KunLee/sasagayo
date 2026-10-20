import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/format";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/api/", "/library", "/signin", "/signup", "/forgot-password", "/reset-password", "/mix"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
