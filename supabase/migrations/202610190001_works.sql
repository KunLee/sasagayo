-- Group movements into works: same composer + work title + performer.

alter table public.tracks
  add column work_key text,
  add column work_title text,
  add column movement_number integer check (movement_number between 1 and 99),
  add column movement_title text;

create index tracks_work_idx on public.tracks(work_key, movement_number) where work_key is not null;

-- Works with at least two published movements; one row per work.
create or replace view public.published_works
with (security_invoker = true) as
select
  t.work_key,
  min(t.work_title) as work_title,
  min(t.composer_slug) as composer_slug,
  min(t.composer_name) as composer_name,
  min(t.performer) as performer,
  count(distinct t.movement_number)::integer as movements,
  sum(t.duration_seconds)::integer as duration_seconds,
  max(t.quality_score) as quality_score,
  (array_agg(t.id order by t.movement_number, t.id))[1] as first_track_id,
  max(t.published_at) as published_at
from public.tracks t
where t.status = 'published' and t.work_key is not null
group by t.work_key
having count(distinct t.movement_number) > 1;

grant select on public.published_works to anon, authenticated;
