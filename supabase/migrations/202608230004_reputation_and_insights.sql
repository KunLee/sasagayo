alter table public.profiles
  add column reputation_points integer not null default 0 check (reputation_points >= 0),
  add column reputation_title text not null default 'New Listener';

revoke update on table public.profiles from authenticated;
grant update (handle, display_name, bio, location, avatar_url, updated_at) on public.profiles to authenticated;

create table public.reputation_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_key text not null unique,
  event_type text not null,
  source_id uuid,
  points integer not null check (points between -100 and 100),
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.reputation_events enable row level security;
revoke all on table public.reputation_events from anon, authenticated;
grant select on table public.reputation_events to authenticated;
create policy "Users see their reputation history"
on public.reputation_events for select to authenticated
using (user_id = (select auth.uid()));

create or replace function public.reputation_title(points integer)
returns text language sql immutable as $$
  select case
    when points >= 3000 then 'Listener Laureate'
    when points >= 1500 then 'Community Guide'
    when points >= 750 then 'Tastemaker'
    when points >= 300 then 'Storyteller'
    when points >= 100 then 'Curious Ear'
    else 'New Listener'
  end;
$$;

create or replace function public.sync_reputation_total()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_user uuid; total integer;
begin
  if tg_op = 'DELETE' then target_user := old.user_id; else target_user := new.user_id; end if;
  select greatest(coalesce(sum(points), 0), 0) into total
  from public.reputation_events where user_id = target_user;
  update public.profiles
  set reputation_points = total,
      reputation_title = public.reputation_title(total),
      updated_at = now()
  where id = target_user;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

create trigger sync_reputation_after_change
after insert or update or delete on public.reputation_events
for each row execute function public.sync_reputation_total();

create or replace function public.award_story_reputation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'published' and (
    select count(*) from public.reputation_events
    where user_id=new.author_id and event_type='story_published' and created_at > now()-interval '1 day'
  ) < 3 then
    insert into public.reputation_events(user_id,event_key,event_type,source_id,points,reason)
    values(new.author_id,'story:'||new.id,'story_published',new.id,10,'Published a complete listening story')
    on conflict(event_key) do nothing;
  end if;
  return new;
end;
$$;
create trigger award_story_after_publish after insert or update of status on public.stories
for each row execute function public.award_story_reputation();

create or replace function public.reverse_story_reputation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin delete from public.reputation_events where event_key='story:'||old.id; return old; end;
$$;
create trigger reverse_story_after_delete after delete on public.stories
for each row execute function public.reverse_story_reputation();

create or replace function public.award_reaction_reputation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare recipient uuid;
begin
  select author_id into recipient from public.stories where id = new.story_id;
  if recipient is not null and recipient <> new.user_id then
    insert into public.reputation_events(user_id,event_key,event_type,source_id,points,reason)
    values(recipient,'reaction:'||new.story_id||':'||new.user_id,'story_reaction',new.story_id,1,'A unique listener appreciated a story')
    on conflict(event_key) do nothing;
  end if;
  return new;
end;
$$;
create trigger award_reaction_after_insert after insert on public.story_reactions
for each row execute function public.award_reaction_reputation();

create or replace function public.reverse_reaction_reputation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin delete from public.reputation_events where event_key='reaction:'||old.story_id||':'||old.user_id; return old; end;
$$;
create trigger reverse_reaction_after_delete after delete on public.story_reactions
for each row execute function public.reverse_reaction_reputation();

create or replace function public.award_bookmark_reputation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare recipient uuid;
begin
  select author_id into recipient from public.stories where id = new.story_id;
  if recipient is not null and recipient <> new.user_id then
    insert into public.reputation_events(user_id,event_key,event_type,source_id,points,reason)
    values(recipient,'bookmark:'||new.story_id||':'||new.user_id,'story_saved',new.story_id,3,'A unique listener saved a story')
    on conflict(event_key) do nothing;
  end if;
  return new;
end;
$$;
create trigger award_bookmark_after_insert after insert on public.story_bookmarks
for each row execute function public.award_bookmark_reputation();

create or replace function public.reverse_bookmark_reputation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin delete from public.reputation_events where event_key='bookmark:'||old.story_id||':'||old.user_id; return old; end;
$$;
create trigger reverse_bookmark_after_delete after delete on public.story_bookmarks
for each row execute function public.reverse_bookmark_reputation();

create or replace function public.award_comment_reputation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.reputation_events where user_id=new.author_id and event_type='comment_written' and created_at > now()-interval '1 day') < 10 then
    insert into public.reputation_events(user_id,event_key,event_type,source_id,points,reason)
    values(new.author_id,'comment:'||new.id,'comment_written',new.id,2,'Added a thoughtful comment')
    on conflict(event_key) do nothing;
  end if;
  return new;
end;
$$;
create trigger award_comment_after_insert after insert on public.comments
for each row execute function public.award_comment_reputation();

create or replace function public.reverse_comment_reputation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin delete from public.reputation_events where event_key='comment:'||old.id; return old; end;
$$;
create trigger reverse_comment_after_delete after delete on public.comments
for each row execute function public.reverse_comment_reputation();

create or replace function public.award_media_reputation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status='ready' and new.visibility='public'
    and (old.status,old.visibility) is distinct from (new.status,new.visibility)
    and (select count(*) from public.reputation_events where user_id=new.owner_id and event_type='media_published' and created_at > now()-interval '1 day') < 5 then
    insert into public.reputation_events(user_id,event_key,event_type,source_id,points,reason)
    values(new.owner_id,'media:'||new.id,'media_published',new.id,4,'Published attributed music or artwork')
    on conflict(event_key) do nothing;
  end if;
  return new;
end;
$$;
create trigger award_media_after_publish after update on public.media_assets
for each row execute function public.award_media_reputation();

create or replace function public.reverse_media_reputation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin delete from public.reputation_events where event_key='media:'||old.id; return old; end;
$$;
create trigger reverse_media_after_delete after delete on public.media_assets
for each row execute function public.reverse_media_reputation();

drop policy "Users create circles" on public.circles;
create policy "Trusted users create circles" on public.circles
for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and (select reputation_points from public.profiles where id=(select auth.uid())) >= 750
  and (select created_at from public.profiles where id=(select auth.uid())) < now()-interval '7 days'
);

create table public.visitor_presence (
  session_id uuid primary key,
  user_id uuid references public.profiles(id) on delete set null,
  path text not null default '/',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table public.user_activity_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('login')),
  created_at timestamptz not null default now()
);

alter table public.visitor_presence enable row level security;
alter table public.user_activity_events enable row level security;
revoke all on table public.visitor_presence, public.user_activity_events from anon, authenticated;

create or replace function public.heartbeat_presence(p_session_id uuid, p_path text)
returns void language plpgsql security definer set search_path='' as $$
begin
  insert into public.visitor_presence(session_id,user_id,path,last_seen_at)
  values(p_session_id,auth.uid(),left(coalesce(nullif(p_path,''),'/'),160),now())
  on conflict(session_id) do update set user_id=coalesce(auth.uid(),public.visitor_presence.user_id),path=excluded.path,last_seen_at=now();
end;
$$;

create or replace function public.record_login()
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.user_activity_events(user_id,event_type) values(auth.uid(),'login');
end;
$$;

create or replace function public.community_metrics()
returns jsonb language sql security definer set search_path='' stable as $$
  select jsonb_build_object(
    'members', (select count(*) from public.profiles),
    'publishedStories', (select count(*) from public.stories where status='published'),
    'circles', (select count(*) from public.circles where is_public),
    'activeNow', (select count(*) from public.visitor_presence where last_seen_at > now()-interval '2 minutes'),
    'activePaths', coalesce((
      select jsonb_agg(jsonb_build_object('path',path,'visitors',visitors) order by visitors desc)
      from (
        select path,count(*) visitors from public.visitor_presence
        where last_seen_at > now()-interval '2 minutes'
        group by path order by visitors desc limit 8
      ) live_paths
    ),'[]'::jsonb),
    'loginsToday', (select count(*) from public.user_activity_events where created_at > date_trunc('day',now())),
    'loginsSevenDays', (select count(*) from public.user_activity_events where created_at > now()-interval '7 days')
  );
$$;

grant execute on function public.heartbeat_presence(uuid,text) to anon, authenticated;
grant execute on function public.record_login() to authenticated;
grant execute on function public.community_metrics() to anon, authenticated;

create index visitor_presence_last_seen_idx on public.visitor_presence(last_seen_at desc);
create index user_activity_created_idx on public.user_activity_events(created_at desc);
create index reputation_events_user_created_idx on public.reputation_events(user_id,created_at desc);
