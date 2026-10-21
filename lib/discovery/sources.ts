import { COMPOSERS, detectComposer, type Composer } from "../composers.ts";
import type { RawRecording } from "./quality.ts";

export const USER_AGENT = "Sasagayo/3.0 (https://sasagayo.kumind.com.au; classical library crawler)";
const PAGE_SIZE = 50;

type Meta = Record<string, { value?: string } | undefined>;
type CommonsPage = {
  pageid: number;
  title: string;
  categories?: { title: string }[];
  videoinfo?: {
    url: string;
    descriptionurl?: string;
    mime: string;
    size?: number;
    extmetadata?: Meta;
    metadata?: { name: string; value: unknown }[] | null;
    derivatives?: { src: string; type: string; transcodekey?: string }[];
  }[];
};

async function getJson<T>(url: string, timeoutMs: number): Promise<T> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`${new URL(url).hostname} responded ${response.status}`);
  return response.json() as Promise<T>;
}

function text(meta: Meta | undefined, key: string) {
  return meta?.[key]?.value ?? "";
}

function stripTracking(url: string) {
  const parsed = new URL(url);
  parsed.search = "";
  return parsed.toString();
}

function durationOf(metadata: { name: string; value: unknown }[] | null | undefined) {
  for (const entry of metadata ?? []) {
    if (entry.name === "length" || entry.name === "playtime_seconds") {
      const value = Number(entry.value);
      if (Number.isFinite(value) && value > 0) return value;
    }
  }
  return 0;
}

export type FeedPage = { items: RawRecording[]; nextOffset: number | null; total: number | null };

/** One page of a composer's Commons tree (category + sub-categories), newest relevance first. */
export async function commonsComposerPage(composer: Composer, offset: number, timeoutMs = 15_000): Promise<FeedPage> {
  const params = new URLSearchParams({
    action: "query", format: "json", formatversion: "2",
    generator: "search", gsrnamespace: "6", gsrlimit: String(PAGE_SIZE), gsroffset: String(offset),
    gsrsearch: `deepcat:"${composer.category}" filetype:audio`, gsrinfo: "totalhits",
    prop: "videoinfo|categories", cllimit: "max",
    viprop: "url|mime|size|extmetadata|metadata|derivatives",
    viextmetadatafilter: "ObjectName|ImageDescription|Artist|Credit|LicenseShortName|LicenseUrl|UsageTerms",
    viextmetadatalanguage: "en",
  });
  const payload = await getJson<{
    query?: { pages?: CommonsPage[]; searchinfo?: { totalhits?: number } };
    continue?: { gsroffset?: number };
  }>(`https://commons.wikimedia.org/w/api.php?${params}`, timeoutMs);

  const items = (payload.query?.pages ?? []).flatMap((page): RawRecording[] => {
    const info = page.videoinfo?.[0];
    if (!info?.url) return [];
    const meta = info.extmetadata;
    const mp3 = info.derivatives?.find((item) => item.transcodekey === "mp3")?.src;
    const original = stripTracking(info.url);
    const streamUrl = info.mime === "audio/mpeg" ? original : mp3 ? stripTracking(mp3) : original;
    return [{
      source: "wikimedia_commons",
      sourceKey: `commons:${page.pageid}`,
      pageUrl: info.descriptionurl ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`,
      originalUrl: original,
      streamUrl,
      mime: info.mime.toLowerCase(),
      sizeBytes: info.size ?? null,
      durationSeconds: durationOf(info.metadata),
      rawTitle: text(meta, "ObjectName") || page.title,
      artist: text(meta, "Artist"),
      credit: text(meta, "Credit"),
      description: text(meta, "ImageDescription"),
      licenseName: text(meta, "LicenseShortName") || text(meta, "UsageTerms"),
      licenseUrl: text(meta, "LicenseUrl"),
      categories: (page.categories ?? []).map((category) => category.title),
      composer,
      trust: 0,
    }];
  });
  const next = payload.continue?.gsroffset;
  return { items, nextOffset: typeof next === "number" && next < 9_950 ? next : null, total: payload.query?.searchinfo?.totalhits ?? null };
}

type ArchiveFile = { name?: string; format?: string; length?: string; size?: string; title?: string; creator?: string; source?: string };

/**
 * Internet Archive is only used for Musopen uploads that carry an explicit
 * CC0 / public-domain licence URL. One "page" is one archive item.
 */
export async function archiveMusopenPage(offset: number, timeoutMs = 15_000): Promise<FeedPage> {
  const params = new URLSearchParams({
    q: "collection:musopen AND mediatype:audio AND licenseurl:*",
    "fl[]": "identifier", rows: "1", page: String(offset + 1), output: "json", "sort[]": "identifier asc",
  });
  params.append("fl[]", "title");
  params.append("fl[]", "licenseurl");
  params.append("fl[]", "creator");
  const search = await getJson<{ response?: { numFound?: number; docs?: { identifier: string; title?: string; licenseurl?: string; creator?: string }[] } }>(
    `https://archive.org/advancedsearch.php?${params}`, timeoutMs,
  );
  const total = search.response?.numFound ?? 0;
  const doc = search.response?.docs?.[0];
  if (!doc) return { items: [], nextOffset: null, total };
  const files = await getJson<{ result?: ArchiveFile[] }>(`https://archive.org/metadata/${encodeURIComponent(doc.identifier)}/files`, timeoutMs);
  const itemComposer = detectComposer(`${doc.title ?? ""} ${doc.identifier}`);
  const items = (files.result ?? []).flatMap((file): RawRecording[] => {
    if (!file.name || !/\.mp3$/i.test(file.name) || /sample|_64kb|spectrogram/i.test(file.name)) return [];
    const composer = detectComposer(`${file.title ?? ""} ${file.name}`) ?? itemComposer;
    const url = `https://archive.org/download/${encodeURIComponent(doc.identifier)}/${file.name.split("/").map(encodeURIComponent).join("/")}`;
    const duration = parseDuration(file.length);
    return [{
      source: "internet_archive",
      sourceKey: `archive:${doc.identifier}/${file.name}`,
      pageUrl: `https://archive.org/details/${encodeURIComponent(doc.identifier)}`,
      originalUrl: url,
      streamUrl: url,
      mime: "audio/mpeg",
      sizeBytes: Number(file.size) || null,
      durationSeconds: duration,
      rawTitle: file.title || file.name.replace(/^.*\//, ""),
      artist: file.creator || doc.creator || "",
      credit: "Musopen",
      description: doc.title ?? "",
      licenseName: "",
      licenseUrl: doc.licenseurl ?? "",
      categories: ["Category:Musopen"],
      composer,
      trust: 5,
    }];
  });
  return { items, nextOffset: offset + 1 < total ? offset + 1 : null, total };
}

function parseDuration(value: string | undefined) {
  if (!value) return 0;
  if (value.includes(":")) return value.split(":").reduce((total, part) => total * 60 + Number(part), 0);
  return Number(value) || 0;
}

/**
 * Recordings published before this year are public domain in the US, Australia,
 * China and the EU alike (US: before 1926 as of 2026).
 */
export const PUBLIC_DOMAIN_BEFORE = 1926;
const HISTORICAL_PAGE = 25;
const DANCE_BAND = /fox.?trot|one.?step|two.?step|shimmy|dance|popular music|novelty|comic|vaudeville|hawaiian|jazz|blues|ragtime/i;
const CONCERT = /opera|classical|instrumental|concert|oratorio|art song|lieder/i;

/** "MISCHA ELMAN" → "Mischa Elman"; mixed-case names are left alone. */
export function tidyCase(value: string) {
  return /[a-z]/.test(value) ? value : value.toLowerCase().replace(/(^|[\s(\-–'"])(\p{L})/gu, (_, gap, letter) => gap + letter.toUpperCase());
}

/**
 * Performer credits for a 78 side: drop the composer entry, other composers and
 * single-word arranger credits ("Kreisler", "Elman" after the full name), and
 * collapse duplicates. A composer who performs ("Sergei Rachmaninoff") stays.
 */
export function historicalPerformers(creators: string[], composerIndex: number) {
  const seen = new Set<string>();
  return creators
    .filter((name, index) => index !== composerIndex)
    .map((name) => tidyCase(name.replace(/^\((.*)\)$/, "$1").trim()))
    .filter((name, index) => index === 0 || /\s/.test(name) || /orchestra|quartet|band|choir|chorus|ensemble|trio/i.test(name))
    .filter((name, index) => index === 0 || !detectComposer(name))
    .filter((name) => {
      const key = name.toLowerCase().replace(/[^a-z]/g, "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

type GreatDoc = { identifier: string; title?: string; creator?: string | string[]; year?: string | number; subject?: string | string[] };

/**
 * One page of the Internet Archive's Great 78 Project for a composer:
 * digitised 78 rpm sides recorded before 1926. Creators list performers first
 * and the composer after them ("Sergei Rachmaninoff; Chopin"), so the
 * composer is only taken from later entries — Rachmaninoff the pianist is not
 * Rachmaninoff the composer.
 */
export async function historicalComposerPage(composer: Composer, offset: number, timeoutMs = 15_000): Promise<FeedPage> {
  const names = [composer.short, composer.name, ...(composer.aliases ?? [])].filter((name) => name.length > 3 && !/\d|\./.test(name));
  const params = new URLSearchParams({
    q: `collection:georgeblood AND year:[1890 TO ${PUBLIC_DOMAIN_BEFORE - 1}] AND creator:(${names.map((name) => `"${name}"`).join(" OR ")})`,
    rows: String(HISTORICAL_PAGE), page: String(Math.floor(offset / HISTORICAL_PAGE) + 1), output: "json", "sort[]": "identifier asc",
  });
  for (const field of ["identifier", "title", "creator", "year", "subject"]) params.append("fl[]", field);
  const search = await getJson<{ response?: { numFound?: number; docs?: GreatDoc[] } }>(`https://archive.org/advancedsearch.php?${params}`, timeoutMs);
  const total = search.response?.numFound ?? 0;

  const candidates = (search.response?.docs ?? []).flatMap((doc) => {
    const year = Number(doc.year);
    const creators = ([] as string[]).concat(doc.creator ?? []).map((name) => name.trim()).filter(Boolean);
    const subjects = ([] as string[]).concat(doc.subject ?? []).join(" ");
    if (!Number.isInteger(year) || year < 1880 || year >= PUBLIC_DOMAIN_BEFORE || creators.length < 2) return [];
    // Dance-band and novelty versions of famous tunes are not what listeners come for.
    if ((DANCE_BAND.test(subjects) && !CONCERT.test(subjects)) || /dance (orchestra|band)|jazz|syncopat/i.test(creators.join(" "))) return [];
    // The work's composer is the first known composer after the performer(s): for
    // "Sergei Rachmaninoff; Schubert; Rachmaninoff" (Rachmaninoff playing his own
    // Schubert arrangement) it is Schubert, and that side belongs to Schubert's feed.
    const composerIndex = creators.findIndex((name, index) => index > 0 && detectComposer(name) !== null);
    if (composerIndex < 0 || detectComposer(creators[composerIndex])?.slug !== composer.slug) return [];
    return [{ doc, year, performers: historicalPerformers(creators, composerIndex) }];
  });

  // File details (duration, MP3 name) need one metadata call per side; a few at a time.
  const items: RawRecording[] = [];
  for (let index = 0; index < candidates.length; index += 5) {
    const batch = await Promise.all(candidates.slice(index, index + 5).map(async ({ doc, year, performers }) => {
      try {
        const files = await getJson<{ result?: ArchiveFile[] }>(`https://archive.org/metadata/${encodeURIComponent(doc.identifier)}/files`, timeoutMs);
        const mp3 = files.result?.find((file) => file.name && /\.mp3$/i.test(file.name) && !/_64kb|sample/i.test(file.name));
        if (!mp3?.name) return null;
        const url = `https://archive.org/download/${encodeURIComponent(doc.identifier)}/${mp3.name.split("/").map(encodeURIComponent).join("/")}`;
        const subjects = ([] as string[]).concat(doc.subject ?? []);
        const recording: RawRecording = {
          source: "internet_archive",
          sourceKey: `archive:${doc.identifier}`,
          pageUrl: `https://archive.org/details/${encodeURIComponent(doc.identifier)}`,
          originalUrl: url,
          streamUrl: url,
          mime: "audio/mpeg",
          sizeBytes: Number(mp3.size) || null,
          durationSeconds: parseDuration(mp3.length),
          rawTitle: tidyCase(String(doc.title ?? mp3.name)),
          artist: performers.join("; "),
          credit: "",
          description: `${doc.title ?? ""} — recorded ${year}`,
          licenseName: "Public domain",
          licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
          categories: [...subjects.map((subject) => `Subject:${subject}`), "Category:Great 78 Project"],
          composer,
          trust: 5,
          recordedYear: year,
        };
        return recording;
      } catch {
        return null;
      }
    }));
    items.push(...batch.filter((item): item is RawRecording => item !== null));
  }
  const next = offset + HISTORICAL_PAGE;
  return { items, nextOffset: next < total && next < 10_000 ? next : null, total };
}

export type Feed = { id: string; label: string; fetch: (offset: number) => Promise<FeedPage> };

export const FEEDS: Feed[] = [
  ...COMPOSERS.map((composer) => ({
    id: `commons:${composer.slug}`,
    label: composer.name,
    fetch: (offset: number) => commonsComposerPage(composer, offset),
  })),
  { id: "archive:musopen", label: "Musopen on Internet Archive", fetch: archiveMusopenPage },
  ...COMPOSERS.map((composer) => ({
    id: `historical:${composer.slug}`,
    label: `${composer.name} (78 rpm, before ${PUBLIC_DOMAIN_BEFORE})`,
    fetch: (offset: number) => historicalComposerPage(composer, offset),
  })),
];
