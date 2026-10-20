-- Public listener profiles: picture, motto, bio, favourite composers, and an
-- optional public library. All writes go through validated functions.

alter table public.profiles
  add column motto text not null default '' check (char_length(motto) <= 80),
  add column favorite_composers text[] not null default '{}' check (cardinality(favorite_composers) <= 5),
  add column library_public boolean not null default false,
  -- Pictures may only come from this project's avatars bucket.
  add constraint profiles_avatar_from_bucket check (
    avatar_url is null or avatar_url ~ '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/avatars/[0-9a-f-]{36}/[A-Za-z0-9._-]+$'
  );

-- Close the community-era direct column writes; use set_my_profile / set_my_avatar instead.
revoke update on public.profiles from authenticated;
revoke update (handle, display_name, bio, location, avatar_url, updated_at) on public.profiles from authenticated;
drop policy if exists "Users update own profile" on public.profiles;

create or replace function public.is_reserved_handle(p_handle text)
returns boolean language sql immutable as $$
  select p_handle = any (array['admin','administrator','editor','editors','sasagayo','support','help','root','system','api',
    'account','settings','library','search','about','composers','works','track','mix','signin','signup','login','logout','u','me','null','undefined'])
$$;

/** The signed-in user's own profile (replaces the earlier, smaller version). */
create or replace function public.my_account()
returns jsonb language sql security definer set search_path = '' stable as $$
  select jsonb_build_object(
    'id', p.id, 'email', u.email, 'displayName', p.display_name, 'status', p.account_status,
    'role', coalesce(r.role, 'member'), 'createdAt', p.created_at,
    'handle', p.handle, 'motto', p.motto, 'bio', p.bio, 'avatarUrl', p.avatar_url,
    'favoriteComposers', to_jsonb(p.favorite_composers), 'libraryPublic', p.library_public)
  from public.profiles p join auth.users u on u.id = p.id
  left join public.user_roles r on r.user_id = p.id
  where p.id = auth.uid();
$$;

create or replace function public.set_my_profile(
  p_handle text, p_display_name text, p_motto text, p_bio text, p_favorite_composers text[], p_library_public boolean
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_handle text := lower(trim(coalesce(p_handle, '')));
  favourites text[];
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if not public.is_active_member() then raise exception 'This account is suspended' using errcode = '42501'; end if;
  if v_handle !~ '^[a-z0-9_]{3,30}$' then raise exception 'Usernames use 3–30 lowercase letters, numbers or underscores'; end if;
  if public.is_reserved_handle(v_handle) then raise exception 'That username is reserved'; end if;
  if exists (select 1 from public.profiles p where p.handle = v_handle and p.id <> auth.uid()) then
    raise exception 'That username is taken';
  end if;
  if char_length(trim(coalesce(p_display_name, ''))) not between 1 and 60 then raise exception 'Name must be 1–60 characters'; end if;
  if char_length(trim(coalesce(p_motto, ''))) > 80 then raise exception 'Motto must be 80 characters or fewer'; end if;
  if char_length(trim(coalesce(p_bio, ''))) > 280 then raise exception 'Bio must be 280 characters or fewer'; end if;
  select coalesce(array_agg(distinct slug), '{}') into favourites
  from unnest(coalesce(p_favorite_composers, '{}')) as slug where slug ~ '^[a-z0-9-]{2,40}$';
  if cardinality(favourites) > 5 then raise exception 'Choose up to five composers'; end if;

  update public.profiles set
    handle = v_handle,
    display_name = trim(p_display_name),
    motto = trim(coalesce(p_motto, '')),
    bio = trim(coalesce(p_bio, '')),
    -- Keep the order the listener chose.
    favorite_composers = (select coalesce(array_agg(slug order by ord), '{}') from (
      select distinct on (slug) slug, ord from unnest(p_favorite_composers) with ordinality as f(slug, ord)
      where slug = any (favourites) order by slug, ord) chosen),
    library_public = coalesce(p_library_public, false),
    updated_at = now()
  where id = auth.uid();
  return public.my_account();
end;
$$;

/** Sets (or clears) the caller's picture; returns the previous URL so the old file can be removed. */
create or replace function public.set_my_avatar(p_url text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  previous text;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if not public.is_active_member() then raise exception 'This account is suspended' using errcode = '42501'; end if;
  if p_url is not null and position('/avatars/' || auth.uid()::text || '/' in p_url) = 0 then
    raise exception 'Pictures must be stored in your own folder';
  end if;
  select avatar_url into previous from public.profiles where id = auth.uid();
  update public.profiles set avatar_url = p_url, updated_at = now() where id = auth.uid();
  return previous;
end;
$$;

/** What anyone may see on /u/<handle>. Suspended accounts are hidden. */
create or replace function public.public_profile(p_handle text)
returns jsonb language sql security definer set search_path = '' stable as $$
  select jsonb_build_object(
    'id', p.id, 'handle', p.handle, 'displayName', p.display_name, 'motto', p.motto, 'bio', p.bio,
    'avatarUrl', p.avatar_url, 'favoriteComposers', to_jsonb(p.favorite_composers), 'joined', p.created_at,
    'isEditor', coalesce(r.role, 'member') = 'admin', 'libraryPublic', p.library_public,
    'librarySize', (select count(*) from public.library_items l join public.tracks t on t.id = l.track_id and t.status = 'published' where l.user_id = p.id),
    'library', case when p.library_public then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', t.id, 'title', t.title, 'composer_slug', t.composer_slug, 'composer_name', t.composer_name,
        'performer', t.performer, 'duration_seconds', t.duration_seconds, 'stream_url', t.stream_url) order by l.position), '[]')
      from (select * from public.library_items where user_id = p.id order by position limit 200) l
      join public.tracks t on t.id = l.track_id and t.status = 'published')
    else '[]'::jsonb end)
  from public.profiles p left join public.user_roles r on r.user_id = p.id
  where p.handle = lower(trim(p_handle)) and p.account_status = 'active';
$$;
grant execute on function public.public_profile(text) to anon, authenticated;

/** A signed-in listener reports a profile; one open report per reporter and profile. */
create or replace function public.report_profile(p_handle text, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  target uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to report a profile' using errcode = '42501'; end if;
  if not public.is_active_member() then raise exception 'This account is suspended' using errcode = '42501'; end if;
  select id into target from public.profiles where handle = lower(trim(p_handle));
  if target is null then raise exception 'Profile not found'; end if;
  if target = auth.uid() then raise exception 'You cannot report your own profile'; end if;
  if char_length(trim(coalesce(p_reason, ''))) not between 10 and 500 then raise exception 'Please describe the problem in 10–500 characters'; end if;
  update public.moderation_reports set reason = trim(p_reason), created_at = now()
  where reporter_id = auth.uid() and target_type = 'profile' and target_id = target and status = 'open';
  if not found then
    insert into public.moderation_reports(reporter_id, target_type, target_id, reason) values (auth.uid(), 'profile', target, trim(p_reason));
  end if;
end;
$$;

create or replace function public.admin_profile_reports()
returns table(id uuid, reason text, status text, created_at timestamptz, reporter text,
  target_id uuid, target_handle text, target_name text, target_motto text, target_bio text, target_avatar text, target_status text)
language plpgsql security definer set search_path = '' stable as $$
begin
  perform public.require_admin();
  return query
  select m.id, m.reason, m.status, m.created_at, rp.display_name,
    t.id, t.handle, t.display_name, t.motto, t.bio, t.avatar_url, t.account_status
  from public.moderation_reports m
  join public.profiles rp on rp.id = m.reporter_id
  join public.profiles t on t.id = m.target_id
  where m.target_type = 'profile'
  order by (m.status = 'open') desc, m.created_at desc
  limit 100;
end;
$$;

/** Editor clean-up of a profile; returns the removed picture URL (if any) for storage deletion. */
create or replace function public.admin_moderate_profile(p_user_id uuid, p_action text, p_reason text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  removed text;
begin
  perform public.require_admin();
  if p_action not in ('remove_avatar', 'clear_text', 'reset_handle') or char_length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Valid action and reason required';
  end if;
  if p_action = 'remove_avatar' then
    select avatar_url into removed from public.profiles where id = p_user_id;
    update public.profiles set avatar_url = null, updated_at = now() where id = p_user_id;
  elsif p_action = 'clear_text' then
    update public.profiles set motto = '', bio = '', display_name = 'Listener', updated_at = now() where id = p_user_id;
  else
    update public.profiles set handle = 'listener_' || substr(replace(p_user_id::text, '-', ''), 1, 10), updated_at = now() where id = p_user_id;
  end if;
  insert into public.admin_audit_log(actor_id, action, target_type, target_id, reason, metadata)
  values (auth.uid(), 'moderate_profile', 'user', p_user_id::text, trim(p_reason), jsonb_build_object('action', p_action));
  return removed;
end;
$$;

revoke all on function public.set_my_profile(text, text, text, text, text[], boolean), public.set_my_avatar(text),
  public.report_profile(text, text), public.admin_profile_reports(), public.admin_moderate_profile(uuid, text, text) from public, anon;
grant execute on function public.set_my_profile(text, text, text, text, text[], boolean), public.set_my_avatar(text),
  public.report_profile(text, text), public.admin_profile_reports(), public.admin_moderate_profile(uuid, text, text) to authenticated;

-- Picture storage: public reads, owners write only inside their own folder, 512 KB max.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 524288, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 524288, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy "Owners upload their picture" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text and public.is_active_member());
create policy "Owners delete their picture" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Editor user list now includes the username, for links to public profiles.
drop function if exists public.admin_list_users(text, integer);
create function public.admin_list_users(p_search text default '', p_limit integer default 100)
returns table(id uuid, email text, handle text, display_name text, account_status text, role text, library_size bigint, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql security definer set search_path = '' stable as $$
begin
  perform public.require_admin();
  return query
  select p.id, u.email::text, p.handle, p.display_name, p.account_status, coalesce(r.role, 'member'),
    (select count(*) from public.library_items l where l.user_id = p.id), p.created_at, u.last_sign_in_at
  from public.profiles p join auth.users u on u.id = p.id
  left join public.user_roles r on r.user_id = p.id
  where coalesce(trim(p_search), '') = ''
    or p.display_name ilike '%' || trim(p_search) || '%'
    or p.handle ilike '%' || trim(p_search) || '%'
    or u.email ilike '%' || trim(p_search) || '%'
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
end;
$$;
revoke all on function public.admin_list_users(text, integer) from public, anon;
grant execute on function public.admin_list_users(text, integer) to authenticated;
