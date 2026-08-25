create table public.catalog_tracks (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('wikimedia_commons')),
  source_page_url text not null unique,
  source_file_url text not null,
  source_sha1 text not null unique,
  object_key text not null unique,
  title text not null check (char_length(title) between 1 and 240),
  artist_name text not null check (char_length(artist_name) between 1 and 240),
  description text not null default '' check (char_length(description) <= 2000),
  mime_type text not null check (mime_type ~ '^audio/'),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 41943040),
  license_name text not null,
  license_url text not null,
  attribution text not null,
  imported_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

alter table public.catalog_tracks enable row level security;
revoke all on table public.catalog_tracks from anon, authenticated;
grant select on table public.catalog_tracks to anon, authenticated;
create policy "Licensed catalog is publicly readable"
on public.catalog_tracks for select using (true);

create index catalog_tracks_imported_idx on public.catalog_tracks(imported_at desc);
