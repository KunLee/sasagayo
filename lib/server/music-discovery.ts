import { createHash } from "node:crypto";

export const MAX_SOURCE_SIZE = 40 * 1024 * 1024;
export const REQUEST_TIMEOUT_MS = 25_000;
export const USER_AGENT = "Sasagayo/2.0 (https://ai.kumind.com.au/contact)";

export type DiscoverySource =
  | "wikimedia_commons"
  | "internet_archive"
  | "library_of_congress";

export type DiscoveredCandidate = {
  source: DiscoverySource;
  source_page_url: string;
  source_file_url: string;
  source_sha1: string;
  title: string;
  artist_name: string;
  detected_license: string;
  license_url: string;
  rights_evidence: string;
  status: "ready" | "pending";
  mime_type: string;
  size_bytes: number;
  metadata: Record<string, unknown>;
};

type Meta = { value?: string };
const AUDIO_EXTENSIONS = /\.(mp3|ogg|oga|flac|wav|webm|m4a)$/i;
const AUTO_LICENSE = /^(Public domain|CC0(?: 1\.0)?|CC BY(?:-SA)? (?:2\.0|2\.5|3\.0|4\.0))$/i;

function clean(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'").replace(/\s+/g, " ").trim();
}

function first(value: unknown) {
  return Array.isArray(value) ? clean(value[0]) : clean(value);
}

function normalizedLicense(label: string, url = "") {
  const value = `${label} ${url}`.toLowerCase();
  if (/public.?domain|creativecommons\.org\/publicdomain\/mark/.test(value)) return "Public domain";
  if (/\bcc0\b|creativecommons\.org\/publicdomain\/zero/.test(value)) return "CC0 1.0";
  const match = value.match(/creativecommons\.org\/licenses\/(by(?:-sa)?)\/(2\.0|2\.5|3\.0|4\.0)/);
  if (match) return `CC ${match[1].toUpperCase()} ${match[2]}`;
  return label || "Unknown";
}

function sourceHash(value: string) {
  return createHash("sha1").update(value).digest("hex");
}

async function json(url: string, timeoutMs = REQUEST_TIMEOUT_MS) {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`Discovery request failed with ${response.status}.`);
  return response.json() as Promise<unknown>;
}

async function discoverWikimedia(theme: string): Promise<DiscoveredCandidate[]> {
  const params = new URLSearchParams({
    action: "query", format: "json", formatversion: "2", generator: "search",
    gsrsearch: `${theme} filetype:audio`, gsrnamespace: "6", gsrlimit: "30",
    gsrwhat: "text", prop: "imageinfo", iiprop: "url|mime|size|sha1|extmetadata",
    iiextmetadatalanguage: "en",
    iiextmetadatafilter: "ObjectName|ImageDescription|Artist|Credit|LicenseShortName|LicenseUrl|Attribution",
  });
  const payload = await json(`https://commons.wikimedia.org/w/api.php?${params}`) as {
    query?: { pages?: Array<{ pageid: number; title: string; imageinfo?: Array<{
      url?: string; mime?: string; size?: number; sha1?: string; extmetadata?: Record<string, Meta>;
    }> }> };
  };
  return (payload.query?.pages ?? []).flatMap((page) => {
    const file = page.imageinfo?.[0];
    const meta = file?.extmetadata ?? {};
    if (!file?.url || !file.mime?.startsWith("audio/") || !file.sha1 || !file.size || file.size > MAX_SOURCE_SIZE) return [];
    const license = normalizedLicense(clean(meta.LicenseShortName?.value), clean(meta.LicenseUrl?.value));
    const artist = clean(meta.Artist?.value || meta.Credit?.value, "Unknown creator");
    return [{
      source: "wikimedia_commons" as const,
      source_page_url: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`,
      source_file_url: file.url, source_sha1: file.sha1,
      title: clean(meta.ObjectName?.value, page.title.replace(/^File:/, "")).slice(0, 240),
      artist_name: artist.slice(0, 240), detected_license: license,
      license_url: clean(meta.LicenseUrl?.value),
      rights_evidence: AUTO_LICENSE.test(license)
        ? "Item-level Wikimedia license metadata matches the automatic redistribution allowlist."
        : "Wikimedia metadata was found, but the recording rights require review.",
      status: AUTO_LICENSE.test(license) ? "ready" as const : "pending" as const,
      mime_type: file.mime.toLowerCase(), size_bytes: file.size,
      metadata: { commonsPageId: page.pageid, description: clean(meta.ImageDescription?.value).slice(0, 2000), attribution: clean(meta.Attribution?.value || meta.Credit?.value || meta.Artist?.value, artist).slice(0, 1000) },
    }];
  });
}

async function discoverInternetArchive(theme: string): Promise<DiscoveredCandidate[]> {
  const params = new URLSearchParams({
    q: `mediatype:audio AND (${theme})`, fl: "identifier,title,creator,licenseurl",
    rows: "8", page: String((Math.floor(Date.now() / 86_400_000) % 5) + 1), output: "json",
  });
  const search = await json(`https://archive.org/advancedsearch.php?${params}`) as {
    response?: { docs?: Array<{ identifier?: string; title?: unknown; creator?: unknown; licenseurl?: unknown }> };
  };
  const docs = (search.response?.docs ?? []).filter((doc) => Boolean(doc.identifier));
  const inspect = async (doc: (typeof docs)[number]): Promise<DiscoveredCandidate | null> => {
    try {
      const metadata = await json(`https://archive.org/metadata/${encodeURIComponent(doc.identifier as string)}/files`, 8_000) as {
        result?: Array<{ name?: string; size?: string; sha1?: string; format?: string; source?: string }>;
      };
      const file = metadata.result?.find((item) => item.name && AUDIO_EXTENSIONS.test(item.name) && item.source === "original" && Number(item.size) > 0 && Number(item.size) <= MAX_SOURCE_SIZE);
      if (!file?.name) return null;
      const licenseUrl = first(doc.licenseurl);
      const license = normalizedLicense("", licenseUrl);
      const mime = mimeFromName(file.name);
      return {
      source: "internet_archive", source_page_url: `https://archive.org/details/${encodeURIComponent(doc.identifier)}`,
      source_file_url: `https://archive.org/download/${encodeURIComponent(doc.identifier)}/${file.name.split("/").map(encodeURIComponent).join("/")}`,
      source_sha1: file.sha1 || sourceHash(`${doc.identifier}:${file.name}`),
      title: first(doc.title).slice(0, 240) || doc.identifier.slice(0, 240),
      artist_name: first(doc.creator).slice(0, 240) || "Unknown creator",
      detected_license: license, license_url: licenseUrl,
      rights_evidence: AUTO_LICENSE.test(license)
        ? "Internet Archive item metadata contains an explicit compatible license URL; retain the source page as evidence."
        : "Archive item discovered without sufficiently explicit compatible recording rights; administrator review is required.",
      status: AUTO_LICENSE.test(license) ? "ready" : "pending", mime_type: mime,
      size_bytes: Number(file.size), metadata: { archiveIdentifier: doc.identifier, archiveFormat: file.format, attribution: first(doc.creator) || "Unknown creator" },
      };
    } catch {
      return null;
    }
  };
  const results: DiscoveredCandidate[] = [];
  for (let index = 0; index < docs.length; index += 2) {
    const batch = await Promise.all(docs.slice(index, index + 2).map(inspect));
    results.push(...batch.filter((item): item is DiscoveredCandidate => item !== null));
  }
  return results;
}

async function discoverLibraryOfCongress(theme: string): Promise<DiscoveredCandidate[]> {
  const params = new URLSearchParams({ fo: "json", q: theme, c: "20", at: "results,pagination" });
  const payload = await json(`https://www.loc.gov/audio/?${params}`) as {
    results?: Array<{ id?: string; title?: string; date?: string; contributor?: unknown; rights?: unknown; url?: string }>;
  };
  return (payload.results ?? []).flatMap((item) => {
    const page = (item.id || item.url)?.replace(/^http:\/\//, "https://");
    if (!page?.startsWith("https://www.loc.gov/")) return [];
    return [{
      source: "library_of_congress" as const, source_page_url: page, source_file_url: "",
      source_sha1: sourceHash(page), title: clean(item.title, "Library of Congress audio").slice(0, 240),
      artist_name: first(item.contributor).slice(0, 240) || "Unknown creator",
      detected_license: "Rights review required", license_url: page,
      rights_evidence: `Library of Congress catalogue discovery${item.date ? ` (${item.date})` : ""}. Item-level rights and downloadable resources must be reviewed before copying.`,
      status: "pending" as const, mime_type: "", size_bytes: 0,
      metadata: { rightsStatement: first(item.rights), discoveryOnly: true },
    }];
  });
}

export function mimeFromName(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  return ({ mp3: "audio/mpeg", ogg: "audio/ogg", oga: "audio/ogg", flac: "audio/flac", wav: "audio/wav", webm: "audio/webm", m4a: "audio/mp4" } as Record<string, string>)[ext ?? ""] ?? "application/octet-stream";
}

export function isAllowedDownload(source: DiscoverySource, url: URL) {
  if (url.protocol !== "https:") return false;
  if (source === "wikimedia_commons") return url.hostname === "wikimedia.org" || url.hostname.endsWith(".wikimedia.org");
  if (source === "internet_archive") return url.hostname === "archive.org" || url.hostname.endsWith(".archive.org");
  return false;
}

export function compatibleAudioType(expected: string, received: string, filename: string) {
  const aliases: Record<string, string[]> = {
    "audio/ogg": ["audio/ogg", "application/ogg"],
    "audio/wav": ["audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave"],
    "audio/mpeg": ["audio/mpeg", "audio/mp3"],
    "audio/flac": ["audio/flac", "audio/x-flac"],
  };
  const inferred = mimeFromName(filename);
  return received.startsWith("audio/") || aliases[expected]?.includes(received) || (received === "application/octet-stream" && inferred === expected);
}

export async function discoverMusic() {
  const themes = ["baroque classical music", "classical period music", "romantic classical music", "classical piano", "classical chamber music", "classical orchestral music", "early classical music"];
  const theme = themes[Math.floor(Date.now() / 86_400_000) % themes.length];
  const settled = await Promise.allSettled([
    discoverWikimedia(theme), discoverInternetArchive(theme), discoverLibraryOfCongress(theme),
  ]);
  const errors: Array<{ source: DiscoverySource; error: string }> = [];
  const sources: DiscoverySource[] = ["wikimedia_commons", "internet_archive", "library_of_congress"];
  const candidates = settled.flatMap((result, index) => {
    if (result.status === "fulfilled") return result.value;
    errors.push({ source: sources[index], error: result.reason instanceof Error ? result.reason.message : "Discovery failed." });
    return [];
  });
  return { theme, candidates, errors };
}
