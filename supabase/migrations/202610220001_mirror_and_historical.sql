-- Our own copies of published recordings (Cloudflare R2), and the recording
-- year for historical (pre-1926, public-domain-everywhere) discs.

alter table public.tracks
  add column recorded_year integer check (recorded_year between 1880 and 2100),
  add column mirror_attempts integer not null default 0,
  add column mirror_error text not null default '',
  add column mirrored_at timestamptz;

-- The copy queue: published, not yet copied, most-played first.
create index tracks_mirror_queue_idx on public.tracks (play_count desc, quality_score desc)
  where status = 'published' and object_key is null;
create index tracks_recorded_year_idx on public.tracks (recorded_year) where recorded_year is not null;
