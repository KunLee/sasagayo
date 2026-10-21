/** The subset of a track the player, library and share links need. */
export type PlayerTrack = {
  id: string;
  title: string;
  composer_slug: string;
  composer_name: string;
  performer: string | null;
  duration_seconds: number;
  stream_url: string;
  recorded_year?: number | null;
};

export function toPlayerTrack<T extends PlayerTrack>(track: T): PlayerTrack {
  const { id, title, composer_slug, composer_name, performer, duration_seconds, stream_url, recorded_year } = track;
  return { id, title, composer_slug, composer_name, performer, duration_seconds, stream_url, recorded_year: recorded_year ?? null };
}
