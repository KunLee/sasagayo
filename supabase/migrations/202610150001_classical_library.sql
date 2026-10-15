-- Classical library v3.
--
-- Replaces the draft/approve import queue (music_source_candidates +
-- catalog_tracks) with a single `tracks` table. Discovery scores every
-- recording; good ones are published automatically, borderline ones wait in
-- review, and rejected ones are kept so they are never re-processed.
-- The legacy tables are left untouched; the admin "import legacy" action
-- copies their R2 objects across.

create extension if not exists pg_trgm with schema extensions;

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('wikimedia_commons','internet_archive')),
  source_key text not null unique,
  source_page_url text not null,
  original_url text not null,
  stream_url text not null,
  object_key text unique,
  title text not null check (char_length(title) between 1 and 300),
  composer_slug text not null,
  composer_name text not null,
  performer text,
  description text not null default '',
  duration_seconds integer not null check (duration_seconds > 0),
  size_bytes bigint,
  mime_type text not null,
  license_name text not null,
  license_url text not null default '',
  attribution text not null default '',
  quality_score integer not null default 0,
  quality_notes text[] not null default '{}',
  dedupe_key text not null,
  status text not null default 'review' check (status in ('published','review','rejected','hidden')),
  play_count integer not null default 0,
  search_text text not null default '',
  discovered_at timestamptz not null default now(),
  published_at timestamptz,
  updated_at timestamptz not null default now()
);

create index tracks_status_published_idx on public.tracks(status, published_at desc);
create index tracks_composer_idx on public.tracks(composer_slug, status, quality_score desc);
create index tracks_dedupe_idx on public.tracks(dedupe_key);
create index tracks_search_trgm_idx on public.tracks using gin (search_text extensions.gin_trgm_ops);

alter table public.tracks enable row level security;
revoke all on public.tracks from anon, authenticated;
grant select on public.tracks to anon, authenticated;
create policy "Published tracks are public" on public.tracks
  for select using (status = 'published');

-- Per-composer crawl cursor, so each daily run continues where the last stopped.
create table public.discovery_state (
  feed text primary key,
  next_offset integer not null default 0,
  total_hits integer,
  last_crawled_at timestamptz
);
alter table public.discovery_state enable row level security;
revoke all on public.discovery_state from anon, authenticated;

create table public.discovery_runs (
  id uuid primary key default gen_random_uuid(),
  trigger text not null default 'cron',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  feeds text[] not null default '{}',
  examined integer not null default 0,
  published integer not null default 0,
  review integer not null default 0,
  rejected integer not null default 0,
  mirrored integer not null default 0,
  errors jsonb not null default '[]'::jsonb
);
create index discovery_runs_started_idx on public.discovery_runs(started_at desc);
alter table public.discovery_runs enable row level security;
revoke all on public.discovery_runs from anon, authenticated;

-- Anonymous play counter; only touches published rows.
create or replace function public.record_play(p_track_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.tracks set play_count = play_count + 1
  where id = p_track_id and status = 'published';
$$;
revoke all on function public.record_play(uuid) from public;
grant execute on function public.record_play(uuid) to anon, authenticated;

-- Composer shelf counts for the home and composers pages.
create or replace function public.composer_counts()
returns table(composer_slug text, tracks bigint, seconds bigint)
language sql stable security definer set search_path = '' as $$
  select t.composer_slug, count(*), coalesce(sum(t.duration_seconds), 0)
  from public.tracks t where t.status = 'published'
  group by t.composer_slug;
$$;
revoke all on function public.composer_counts() from public;
grant execute on function public.composer_counts() to anon, authenticated;
