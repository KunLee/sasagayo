import type { Composer } from "./composers.ts";

export type ComposerInfo = { portrait: string | null; extract: string; wikiUrl: string };

/** Portrait and short biography from Wikipedia, cached for a week. */
export async function composerInfo(composer: Composer): Promise<ComposerInfo> {
  const title = encodeURIComponent(composer.name.replaceAll(" ", "_"));
  const fallback = { portrait: null, extract: "", wikiUrl: `https://en.wikipedia.org/wiki/${title}` };
  try {
    const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}?redirect=true`, {
      headers: { "User-Agent": "Sasagayo/3.0 (https://ai.kumind.com.au)", Accept: "application/json" },
      next: { revalidate: 604_800, tags: ["composer-info"] },
      signal: AbortSignal.timeout(6_000),
    });
    if (!response.ok) return fallback;
    const data = (await response.json()) as { thumbnail?: { source?: string }; extract?: string; content_urls?: { desktop?: { page?: string } } };
    return {
      portrait: data.thumbnail?.source ?? null,
      extract: data.extract ?? "",
      wikiUrl: data.content_urls?.desktop?.page ?? fallback.wikiUrl,
    };
  } catch {
    return fallback;
  }
}

export async function composerPortraits(composers: Composer[]) {
  const entries = await Promise.all(composers.map(async (composer) => [composer.slug, (await composerInfo(composer)).portrait] as const));
  return new Map(entries);
}
