import type { MetadataRoute } from "next";
import { allPublishedIds, allWorkKeys } from "@/lib/catalog";
import { COMPOSERS } from "@/lib/composers";
import { SITE_URL } from "@/lib/format";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [tracks, works] = await Promise.all([
    allPublishedIds().catch(() => []),
    allWorkKeys().catch(() => []),
  ]);
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/composers`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.3 },
    ...COMPOSERS.map((composer) => ({ url: `${SITE_URL}/composers/${composer.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
    ...works.map((work) => ({ url: `${SITE_URL}/works/${work.work_key}`, lastModified: work.published_at ? new Date(work.published_at) : undefined, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...tracks.map((track) => ({ url: `${SITE_URL}/track/${track.id}`, lastModified: track.published_at ? new Date(track.published_at) : undefined, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
