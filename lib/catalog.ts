import { queryTokens } from "./search-tokens.ts";
import { publicGet, publicRpc } from "./server/db.ts";

export type Track = {
  id: string;
  title: string;
  composer_slug: string;
  composer_name: string;
  performer: string | null;
  duration_seconds: number;
  stream_url: string;
  original_url: string;
  source: "wikimedia_commons" | "internet_archive";
  source_page_url: string;
  license_name: string;
  license_url: string;
  attribution: string;
  description: string;
  quality_score: number;
  published_at: string | null;
};

const FIELDS = "id,title,composer_slug,composer_name,performer,duration_seconds,stream_url,original_url,source,source_page_url,license_name,license_url,attribution,description,quality_score,published_at";
const PUBLISHED = "status=eq.published";

export async function searchTracks(query: string, options: { composer?: string; page?: number; pageSize?: number } = {}) {
  const tokens = queryTokens(query);
  const pageSize = options.pageSize ?? 30;
  const page = Math.max(1, options.page ?? 1);
  const filters = [PUBLISHED];
  if (tokens.length) filters.push(`and=(${tokens.map((token) => `search_text.ilike.*${token}*`).join(",")})`);
  if (options.composer) filters.push(`composer_slug=eq.${encodeURIComponent(options.composer)}`);
  const { rows, total } = await publicGet<Track[]>(
    `tracks?select=${FIELDS}&${filters.join("&")}&order=quality_score.desc,play_count.desc,id&limit=${pageSize}&offset=${(page - 1) * pageSize}`,
    { count: true, revalidate: 120 },
  );
  return { tracks: rows, total: total ?? rows.length, tokens };
}

export async function composerTracks(slug: string, page = 1, pageSize = 40) {
  const { rows, total } = await publicGet<Track[]>(
    `tracks?select=${FIELDS}&${PUBLISHED}&composer_slug=eq.${encodeURIComponent(slug)}&order=quality_score.desc,duration_seconds.desc,id&limit=${pageSize}&offset=${(Math.max(1, page) - 1) * pageSize}`,
    { count: true },
  );
  return { tracks: rows, total: total ?? rows.length };
}

export async function latestTracks(limit = 12) {
  const { rows } = await publicGet<Track[]>(`tracks?select=${FIELDS}&${PUBLISHED}&order=published_at.desc.nullslast,quality_score.desc&limit=${limit}`);
  return rows;
}

/** A daily programme: strong recordings, shuffled with the date as seed, one per composer. */
export async function dailyProgramme(size = 8) {
  const { rows } = await publicGet<Track[]>(
    `tracks?select=${FIELDS}&${PUBLISHED}&quality_score=gte.70&duration_seconds=gte.150&order=quality_score.desc,published_at.desc&limit=400`,
    { revalidate: 3600 },
  );
  let seed = Number(new Date().toISOString().slice(0, 10).replaceAll("-", ""));
  const random = () => ((seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648) / 2_147_483_648);
  const shuffled = rows.map((track) => ({ track, key: random() })).sort((a, b) => a.key - b.key).map((item) => item.track);
  const seen = new Set<string>();
  return shuffled.filter((track) => !seen.has(track.composer_slug) && seen.add(track.composer_slug)).slice(0, size);
}

export async function getTrack(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { rows } = await publicGet<Track[]>(`tracks?select=${FIELDS}&${PUBLISHED}&id=eq.${id}&limit=1`);
  return rows[0] ?? null;
}

export async function getTracks(ids: string[]) {
  const valid = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 100);
  if (!valid.length) return [];
  const { rows } = await publicGet<Track[]>(`tracks?select=${FIELDS}&${PUBLISHED}&id=in.(${valid.join(",")})`);
  const byId = new Map(rows.map((track) => [track.id, track]));
  return valid.map((id) => byId.get(id)).filter((track): track is Track => Boolean(track));
}

export type ComposerCount = { composer_slug: string; tracks: number; seconds: number };

export async function composerCounts() {
  try {
    const rows = await publicRpc<ComposerCount[]>("composer_counts");
    return new Map((rows ?? []).map((row) => [row.composer_slug, { tracks: Number(row.tracks), seconds: Number(row.seconds) }]));
  } catch {
    return new Map<string, { tracks: number; seconds: number }>();
  }
}

export async function libraryStats() {
  const counts = await composerCounts();
  let tracks = 0;
  let seconds = 0;
  for (const value of counts.values()) { tracks += value.tracks; seconds += value.seconds; }
  return { tracks, hours: Math.round(seconds / 3600), composers: [...counts.values()].filter((value) => value.tracks > 0).length };
}
