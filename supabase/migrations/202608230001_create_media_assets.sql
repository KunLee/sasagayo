create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  object_key text not null unique,
  file_name text not null check (char_length(file_name) between 1 and 255),
  mime_type text not null check (mime_type ~ '^(audio|image)/'),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 209715200),
  visibility text not null default 'private'
    check (visibility in ('private', 'public')),
  status text not null default 'pending'
    check (status in ('pending', 'ready')),
  uploaded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.media_assets enable row level security;

revoke all on table public.media_assets from anon, authenticated;
grant select, insert, update, delete on table public.media_assets to authenticated;

create policy "Ready public media or owner can read"
on public.media_assets
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or (visibility = 'public' and status = 'ready')
);

create policy "Users create their own media"
on public.media_assets
for insert
to authenticated
with check (owner_id = (select auth.uid()));

create policy "Owners update their media"
on public.media_assets
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "Owners delete their media"
on public.media_assets
for delete
to authenticated
using (owner_id = (select auth.uid()));

create index media_assets_owner_created_idx
on public.media_assets (owner_id, created_at desc);

create index media_assets_public_ready_idx
on public.media_assets (created_at desc)
where visibility = 'public' and status = 'ready';

