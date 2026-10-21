import { COMPOSER_BY_SLUG, COMPOSERS } from "./composers.ts";
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
  recorded_year: number | null;
  work_key: string | null;
  work_title: string | null;
  movement_number: number | null;
  movement_title: string | null;
};

export type Work = {
  work_key: string;
  work_title: string;
  composer_slug: string;
  composer_name: string;
  performer: string | null;
  movements: number;
  duration_seconds: number;
  quality_score: number;
  first_track_id: string;
};

const FIELDS = "id,title,composer_slug,composer_name,performer,duration_seconds,stream_url,original_url,source,source_page_url,license_name,license_url,attribution,description,quality_score,published_at,recorded_year,work_key,work_title,movement_number,movement_title";
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

/** Pre-1926 recordings for the "Legends of the 78 era" shelf: the best, one per composer. */
export async function historicalTracks(limit = 8) {
  const { rows } = await publicGet<Track[]>(
    `tracks?select=${FIELDS}&${PUBLISHED}&recorded_year=not.is.null&order=quality_score.desc,play_count.desc&limit=200`,
    { revalidate: 3600 },
  );
  const seen = new Set<string>();
  return rows.filter((track) => !seen.has(track.composer_slug) && seen.add(track.composer_slug)).slice(0, limit);
}

export async function latestTracks(limit = 12) {
  // Historical sides have their own shelf; a day's 78 rpm haul would otherwise fill this one.
  const { rows } = await publicGet<Track[]>(`tracks?select=${FIELDS}&${PUBLISHED}&recorded_year=is.null&order=published_at.desc.nullslast,quality_score.desc&limit=${limit}`);
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

/** A multi-movement work and its movements in order (null unless 2+ are published). */
export async function getWork(key: string) {
  if (!/^[0-9a-f]{12}$/.test(key)) return null;
  const { rows } = await publicGet<Track[]>(`tracks?select=${FIELDS}&${PUBLISHED}&work_key=eq.${key}&order=movement_number,quality_score.desc,id&limit=120`);
  // Two uncredited recordings of one work share a key; keep the best take of each movement.
  const seen = new Set<number | null>();
  const movements = rows.filter((track) => !seen.has(track.movement_number) && seen.add(track.movement_number));
  return movements.length > 1 ? movements : null;
}

/** The strongest complete works across the library, at most one per composer. */
export async function featuredWorks(limit = 6) {
  const { rows } = await publicGet<Work[]>("published_works?select=*&movements=gte.3&order=quality_score.desc,movements.desc&limit=120", { revalidate: 3600 })
    .catch(() => ({ rows: [] as Work[] }));
  const seen = new Set<string>();
  return rows.filter((work) => !seen.has(work.composer_slug) && seen.add(work.composer_slug)).slice(0, limit);
}

export async function composerWorks(slug: string, limit = 24) {
  const { rows } = await publicGet<Work[]>(
    `published_works?select=*&composer_slug=eq.${encodeURIComponent(slug)}&order=quality_score.desc,movements.desc&limit=${limit}`,
  ).catch(() => ({ rows: [] as Work[] }));
  return rows;
}

/**
 * Tracks to keep playing after `seed`: its composer first, then contemporaries
 * from the same era. Shuffled, one movement per work, nothing in `exclude`.
 */
export async function radioTracks(seed: Track | null, exclude: Set<string>, size = 10) {
  const composer = seed ? COMPOSER_BY_SLUG.get(seed.composer_slug) : null;
  const pool = composer ? [...new Set([composer.slug, ...COMPOSERS.filter((item) => item.era === composer.era).map((item) => item.slug)])] : [];
  const filter = pool.length ? `&composer_slug=in.(${pool.join(",")})` : "";
  const { rows } = await publicGet<Track[]>(
    `tracks?select=${FIELDS}&${PUBLISHED}&quality_score=gte.68&duration_seconds=gte.120${filter}&order=quality_score.desc,play_count.desc&limit=300`,
    { revalidate: 900 },
  );
  const bias = (track: Track) => (seed && track.composer_slug === seed.composer_slug ? 0.35 : 0);
  const ranked = rows
    .filter((track) => !exclude.has(track.id) && (!seed?.work_key || track.work_key !== seed.work_key))
    .map((track) => ({ track, key: Math.random() - bias(track) }))
    .sort((a, b) => a.key - b.key)
    .map((item) => item.track);
  const works = new Set<string>();
  return ranked.filter((track) => !track.work_key || (!works.has(track.work_key) && works.add(track.work_key))).slice(0, size);
}

/** Every published recording id, for the sitemap. */
export async function allPublishedIds() {
  const ids: { id: string; published_at: string | null }[] = [];
  for (let offset = 0; offset < 50_000; offset += 1000) {
    const { rows } = await publicGet<{ id: string; published_at: string | null }[]>(
      `tracks?select=id,published_at&${PUBLISHED}&order=id&limit=1000&offset=${offset}`,
      { revalidate: 3600 },
    );
    ids.push(...rows);
    if (rows.length < 1000) break;
  }
  return ids;
}

export async function allWorkKeys() {
  const { rows } = await publicGet<{ work_key: string; published_at: string | null }[]>(
    "published_works?select=work_key,published_at&limit=10000",
    { revalidate: 3600 },
  ).catch(() => ({ rows: [] as { work_key: string; published_at: string | null }[] }));
  return rows;
}
