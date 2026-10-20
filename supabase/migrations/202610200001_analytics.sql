-- Privacy-friendly usage statistics.
-- No cookies and no IP addresses: `visitor` is a one-way hash that rotates
-- daily, so a person counts once per day but cannot be followed across days.
-- Raw events are kept 90 days; daily totals are kept indefinitely.

create table public.analytics_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  type text not null check (type in ('pageview','play','listen','search','signup','login')),
  visitor text not null default '',
  user_id uuid references public.profiles(id) on delete set null,
  path text,
  source text,
  lang text check (lang in ('en','zh')),
  device text check (device in ('mobile','tablet','desktop')),
  track_id uuid references public.tracks(id) on delete set null,
  composer_slug text,
  via text check (via in ('radio','listen')),
  query text,
  results integer,
  seconds integer check (seconds between 0 and 7200)
);
create index analytics_events_type_time_idx on public.analytics_events(type, created_at desc);
create index analytics_events_time_idx on public.analytics_events(created_at);
alter table public.analytics_events enable row level security;
revoke all on public.analytics_events from anon, authenticated;

create table public.analytics_daily (
  day date not null,
  metric text not null,
  value bigint not null,
  primary key (day, metric)
);
alter table public.analytics_daily enable row level security;
revoke all on public.analytics_daily from anon, authenticated;

-- Days are bucketed in Sydney time, where the editors are.
create or replace function public.analytics_day(ts timestamptz)
returns date language sql immutable as $$ select (ts at time zone 'Australia/Sydney')::date $$;

/** Everything the Statistics tab shows, for the last p_days days. */
create or replace function public.analytics_summary(p_days integer)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  since timestamptz := now() - make_interval(days => least(greatest(p_days, 1), 90));
  previous timestamptz := since - make_interval(days => least(greatest(p_days, 1), 90));
  result jsonb;
begin
  with e as (select * from public.analytics_events where created_at >= since),
  p as (select * from public.analytics_events where created_at >= previous and created_at < since),
  days as (
    select d::date as day from generate_series(public.analytics_day(since), public.analytics_day(now()), interval '1 day') d
  ),
  daily as (
    select days.day,
      count(distinct e.visitor) filter (where e.type = 'pageview') as visitors,
      count(*) filter (where e.type = 'pageview') as pageviews,
      count(*) filter (where e.type = 'play') as plays,
      coalesce(sum(e.seconds) filter (where e.type = 'listen'), 0) / 60 as minutes,
      count(*) filter (where e.type = 'signup') as signups,
      count(*) filter (where e.type = 'login') as logins
    from days left join e on public.analytics_day(e.created_at) = days.day
    group by days.day order by days.day
  )
  select jsonb_build_object(
    'days', least(greatest(p_days, 1), 90),
    'daily', (select coalesce(jsonb_agg(daily order by day), '[]') from daily),
    'totals', jsonb_build_object(
      'visitors', (select count(distinct visitor) from e where type = 'pageview'),
      'pageviews', (select count(*) from e where type = 'pageview'),
      'plays', (select count(*) from e where type = 'play'),
      'minutes', (select coalesce(sum(seconds), 0) / 60 from e where type = 'listen'),
      'radioPlays', (select count(*) from e where type = 'play' and via = 'radio'),
      'signups', (select count(*) from e where type = 'signup'),
      'activeUsers', (select count(distinct user_id) from e where user_id is not null),
      'searches', (select count(*) from e where type = 'search')
    ),
    'previous', jsonb_build_object(
      'visitors', (select count(distinct visitor) from p where type = 'pageview'),
      'pageviews', (select count(*) from p where type = 'pageview'),
      'plays', (select count(*) from p where type = 'play'),
      'minutes', (select coalesce(sum(seconds), 0) / 60 from p where type = 'listen'),
      'signups', (select count(*) from p where type = 'signup'),
      'activeUsers', (select count(distinct user_id) from p where user_id is not null)
    ),
    'accounts', jsonb_build_object(
      'total', (select count(*) from public.profiles),
      'active7', (select count(distinct user_id) from public.analytics_events where user_id is not null and created_at >= now() - interval '7 days'),
      'active30', (select count(distinct user_id) from public.analytics_events where user_id is not null and created_at >= now() - interval '30 days')
    ),
    'pages', (select coalesce(jsonb_agg(x), '[]') from (
      select path as label, count(*) as value from e where type = 'pageview' group by path order by 2 desc limit 10) x),
    'sources', (select coalesce(jsonb_agg(x), '[]') from (
      select coalesce(source, 'Direct or shared link') as label, count(distinct visitor) as value from e
      where type = 'pageview' and source is distinct from 'internal' group by 1 order by 2 desc limit 8) x),
    'languages', (select coalesce(jsonb_agg(x), '[]') from (
      select coalesce(lang, 'unknown') as label, count(distinct visitor) as value from e where type = 'pageview' group by 1 order by 2 desc) x),
    'devices', (select coalesce(jsonb_agg(x), '[]') from (
      select coalesce(device, 'unknown') as label, count(distinct visitor) as value from e where type = 'pageview' group by 1 order by 2 desc) x),
    'tracks', (select coalesce(jsonb_agg(x), '[]') from (
      select t.title as label, t.composer_name as detail, t.id as id, count(*) as value
      from e join public.tracks t on t.id = e.track_id where e.type = 'play'
      group by t.id, t.title, t.composer_name order by 4 desc limit 10) x),
    'composers', (select coalesce(jsonb_agg(x), '[]') from (
      select composer_slug as label, count(*) as value from e where type = 'play' and composer_slug is not null
      group by 1 order by 2 desc limit 10) x),
    'searches', (select coalesce(jsonb_agg(x), '[]') from (
      select lower(query) as label, count(*) as value, round(avg(results)) as results from e
      where type = 'search' and query is not null group by 1 order by 2 desc limit 12) x),
    'emptySearches', (select coalesce(jsonb_agg(x), '[]') from (
      select lower(query) as label, count(*) as value from e
      where type = 'search' and results = 0 and query is not null group by 1 order by 2 desc limit 12) x)
  ) into result;
  return result;
end;
$$;
revoke all on function public.analytics_summary(integer) from public, anon, authenticated;
grant execute on function public.analytics_summary(integer) to service_role;

/** Daily rollup of finished days, then removal of raw events older than 90 days. */
create or replace function public.analytics_maintenance()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  rolled integer;
  removed integer;
begin
  insert into public.analytics_daily(day, metric, value)
  select day, metric, value from (
    select public.analytics_day(created_at) as day, 'visitors' as metric, count(distinct visitor) as value from public.analytics_events where type = 'pageview' group by 1
    union all select public.analytics_day(created_at), 'pageviews', count(*) from public.analytics_events where type = 'pageview' group by 1
    union all select public.analytics_day(created_at), 'plays', count(*) from public.analytics_events where type = 'play' group by 1
    union all select public.analytics_day(created_at), 'minutes', coalesce(sum(seconds), 0) / 60 from public.analytics_events where type = 'listen' group by 1
    union all select public.analytics_day(created_at), 'signups', count(*) from public.analytics_events where type = 'signup' group by 1
    union all select public.analytics_day(created_at), 'logins', count(*) from public.analytics_events where type = 'login' group by 1
  ) totals
  -- Only finished days whose events are all still present (the oldest day may be partly purged).
  where day < public.analytics_day(now()) and day > public.analytics_day(now() - interval '89 days')
  on conflict (day, metric) do update set value = excluded.value;
  get diagnostics rolled = row_count;
  delete from public.analytics_events where created_at < now() - interval '90 days';
  get diagnostics removed = row_count;
  return jsonb_build_object('rolledUp', rolled, 'removed', removed);
end;
$$;
revoke all on function public.analytics_maintenance() from public, anon, authenticated;
grant execute on function public.analytics_maintenance() to service_role;
