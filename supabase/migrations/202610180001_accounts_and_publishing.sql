-- Listener accounts (synced libraries) and editor-controlled publishing.

-- Publishing policy, edited from the editor desk. One row only.
create table public.site_settings (
  id boolean primary key default true check (id),
  publish_mode text not null default 'auto' check (publish_mode in ('auto','manual')),
  publish_at integer not null default 60 check (publish_at between 30 and 100),
  review_at integer not null default 40 check (review_at between 25 and 100),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  check (review_at <= publish_at)
);
insert into public.site_settings default values;
alter table public.site_settings enable row level security;
revoke all on public.site_settings from anon, authenticated;

-- Editor decisions are recorded so automation never overrides them.
alter table public.tracks
  add column reviewed_by uuid references public.profiles(id) on delete set null,
  add column reviewed_at timestamptz;
create index tracks_discovered_idx on public.tracks(discovered_at desc);

-- A listener's saved recordings, in their chosen order.
create table public.library_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  position integer not null,
  added_at timestamptz not null default now(),
  primary key (user_id, track_id)
);
create index library_items_order_idx on public.library_items(user_id, position);
alter table public.library_items enable row level security;
revoke all on public.library_items from anon, authenticated;
grant select on public.library_items to authenticated;
create policy "Listeners read their own library" on public.library_items
  for select to authenticated using (user_id = auth.uid());

-- Replaces the caller's library with the given ordered list (max 500).
create or replace function public.set_my_library(p_track_ids uuid[])
returns integer language plpgsql security definer set search_path = '' as $$
declare
  ids uuid[];
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if not public.is_active_member() then raise exception 'This account is suspended' using errcode = '42501'; end if;
  if coalesce(array_length(p_track_ids, 1), 0) > 500 then raise exception 'A library holds at most 500 recordings'; end if;
  -- Keep first occurrence, drop unknown or unpublished tracks.
  select coalesce(array_agg(t.id order by x.ord), '{}') into ids
  from (select distinct on (id) id, ord from unnest(p_track_ids) with ordinality as u(id, ord) order by id, ord) x
  join public.tracks t on t.id = x.id and t.status = 'published';

  delete from public.library_items where user_id = auth.uid() and not (track_id = any(ids));
  insert into public.library_items(user_id, track_id, position)
  select auth.uid(), id, ord::integer from unnest(ids) with ordinality as u(id, ord)
  on conflict (user_id, track_id) do update set position = excluded.position;
  return coalesce(array_length(ids, 1), 0);
end;
$$;
revoke all on function public.set_my_library(uuid[]) from public, anon;
grant execute on function public.set_my_library(uuid[]) to authenticated;

-- The signed-in user's own profile, role and status.
create or replace function public.my_account()
returns jsonb language sql security definer set search_path = '' stable as $$
  select jsonb_build_object(
    'id', p.id, 'email', u.email, 'displayName', p.display_name, 'status', p.account_status,
    'role', coalesce(r.role, 'member'), 'createdAt', p.created_at)
  from public.profiles p join auth.users u on u.id = p.id
  left join public.user_roles r on r.user_id = p.id
  where p.id = auth.uid();
$$;
revoke all on function public.my_account() from public, anon;
grant execute on function public.my_account() to authenticated;

create or replace function public.set_my_display_name(p_name text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if char_length(trim(p_name)) not between 1 and 60 then raise exception 'Name must be 1–60 characters'; end if;
  update public.profiles set display_name = trim(p_name), updated_at = now() where id = auth.uid();
end;
$$;
revoke all on function public.set_my_display_name(text) from public, anon;
grant execute on function public.set_my_display_name(text) to authenticated;

-- Editor user list with library sizes (replaces the community-era columns).
create or replace function public.admin_list_users(p_search text default '', p_limit integer default 100)
returns table(id uuid, email text, display_name text, account_status text, role text, library_size bigint, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql security definer set search_path = '' stable as $$
begin
  perform public.require_admin();
  return query
  select p.id, u.email::text, p.display_name, p.account_status, coalesce(r.role, 'member'),
    (select count(*) from public.library_items l where l.user_id = p.id), p.created_at, u.last_sign_in_at
  from public.profiles p join auth.users u on u.id = p.id
  left join public.user_roles r on r.user_id = p.id
  where coalesce(trim(p_search), '') = ''
    or p.display_name ilike '%' || trim(p_search) || '%'
    or u.email ilike '%' || trim(p_search) || '%'
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
end;
$$;
revoke all on function public.admin_list_users(text, integer) from public, anon;
grant execute on function public.admin_list_users(text, integer) to authenticated;
