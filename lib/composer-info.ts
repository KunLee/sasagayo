import type { Composer } from "./composers.ts";

export type ComposerInfo = { portrait: string | null; extract: string; wikiUrl: string };

type Summary = { type?: string; thumbnail?: { source?: string }; extract?: string; content_urls?: { desktop?: { page?: string } } };

async function summary(host: string, title: string, language?: string): Promise<Summary | null> {
  try {
    const response = await fetch(`https://${host}/api/rest_v1/page/summary/${encodeURIComponent(title)}?redirect=true`, {
      headers: { "User-Agent": "Sasagayo/3.0 (https://sasagayo.kumind.com.au)", Accept: "application/json", ...(language ? { "Accept-Language": language } : {}) },
      next: { revalidate: 604_800, tags: ["composer-info"] },
      signal: AbortSignal.timeout(6_000),
    });
    return response.ok ? ((await response.json()) as Summary) : null;
  } catch {
    return null;
  }
}

/** Portrait and short biography from Wikipedia (Chinese when asked and unambiguous), cached for a week. */
export async function composerInfo(composer: Composer, locale: "en" | "zh" = "en"): Promise<ComposerInfo> {
  const enTitle = composer.name.replaceAll(" ", "_");
  const [english, chinese] = await Promise.all([
    summary("en.wikipedia.org", enTitle),
    locale === "zh" ? summary("zh.wikipedia.org", composer.zh, "zh-cn") : Promise.resolve(null),
  ]);
  const useChinese = chinese && chinese.type !== "disambiguation" && chinese.extract;
  const source = useChinese ? chinese : english;
  return {
    portrait: english?.thumbnail?.source ?? chinese?.thumbnail?.source ?? null,
    extract: source?.extract ?? "",
    wikiUrl: source?.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(enTitle)}`,
  };
}

export async function composerPortraits(composers: Composer[]) {
  const entries = await Promise.all(composers.map(async (composer) => [composer.slug, (await composerInfo(composer)).portrait] as const));
  return new Map(entries);
}
