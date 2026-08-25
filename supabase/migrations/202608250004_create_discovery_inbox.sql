alter table public.catalog_tracks
  add column candidate_id uuid unique references public.music_source_candidates(id) on delete set null,
  add column publication_status text not null default 'published'
    check (publication_status in ('draft','published','unpublished')),
  add column published_at timestamptz;

update public.catalog_tracks
set published_at = imported_at
where publication_status = 'published' and published_at is null;

alter table public.music_source_candidates
  drop constraint music_source_candidates_status_check,
  add constraint music_source_candidates_status_check
    check (status in ('pending','ready','approved','imported','failed','link_only','rejected')),
  add column source_sha1 text,
  add column mime_type text,
  add column size_bytes bigint,
  add column metadata jsonb not null default '{}'::jsonb,
  add column last_seen_at timestamptz not null default now(),
  add column attempt_count integer not null default 0,
  add column last_error text not null default '',
  add column catalog_track_id uuid references public.catalog_tracks(id) on delete set null;

insert into public.music_source_candidates(
  source, source_page_url, source_file_url, source_sha1, title, artist_name,
  detected_license, license_url, rights_evidence, status, mime_type,
  size_bytes, metadata, last_seen_at, catalog_track_id
)
select t.source,t.source_page_url,t.source_file_url,t.source_sha1,t.title,
  t.artist_name,t.license_name,t.license_url,
  'Backfilled from an existing licensed Sasagayo catalog record.',
  'imported',t.mime_type,t.size_bytes,t.metadata,t.imported_at,t.id
from public.catalog_tracks t
on conflict (source_page_url) do update set
  source_file_url = excluded.source_file_url,
  source_sha1 = excluded.source_sha1,
  detected_license = excluded.detected_license,
  license_url = excluded.license_url,
  status = 'imported',
  mime_type = excluded.mime_type,
  size_bytes = excluded.size_bytes,
  metadata = public.music_source_candidates.metadata || excluded.metadata,
  catalog_track_id = excluded.catalog_track_id;

update public.catalog_tracks t
set candidate_id = c.id
from public.music_source_candidates c
where c.catalog_track_id = t.id and t.candidate_id is null;

drop policy "Licensed catalog is publicly readable" on public.catalog_tracks;
create policy "Published licensed catalog is publicly readable"
on public.catalog_tracks for select using (publication_status = 'published');

create index catalog_tracks_publication_idx
  on public.catalog_tracks(publication_status, imported_at desc);
create index music_candidates_queue_idx
  on public.music_source_candidates(status, discovered_at asc);
create unique index music_candidates_source_sha1_idx
  on public.music_source_candidates(source_sha1)
  where source_sha1 is not null;

create or replace function public.register_music_candidates(p_items jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  affected integer := 0;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 100 then
    raise exception 'Candidate payload must be an array of at most 100 items';
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    if item->>'source' <> 'wikimedia_commons'
      or coalesce(item->>'source_page_url', '') !~ '^https://commons\.wikimedia\.org/'
      or coalesce(item->>'source_file_url', '') !~ '^https://([a-z0-9-]+\.)?wikimedia\.org/'
      or coalesce(item->>'mime_type', '') !~ '^audio/'
      or coalesce((item->>'size_bytes')::bigint, 0) <= 0 then
      continue;
    end if;

    insert into public.music_source_candidates(
      source, source_page_url, source_file_url, source_sha1, title,
      artist_name, detected_license, license_url, rights_evidence, status,
      mime_type, size_bytes, metadata, last_seen_at
    ) values (
      item->>'source', item->>'source_page_url', item->>'source_file_url',
      nullif(item->>'source_sha1', ''), left(item->>'title', 240),
      left(coalesce(nullif(item->>'artist_name', ''), 'Unknown creator'), 240),
      coalesce(nullif(item->>'detected_license', ''), 'Unknown'),
      coalesce(item->>'license_url', ''), coalesce(item->>'rights_evidence', ''),
      case when item->>'status' = 'ready' then 'ready' else 'pending' end,
      item->>'mime_type', (item->>'size_bytes')::bigint,
      coalesce(item->'metadata', '{}'::jsonb), now()
    )
    on conflict (source_page_url) do update set
      source_file_url = excluded.source_file_url,
      source_sha1 = coalesce(excluded.source_sha1, public.music_source_candidates.source_sha1),
      title = excluded.title,
      artist_name = excluded.artist_name,
      detected_license = excluded.detected_license,
      license_url = excluded.license_url,
      rights_evidence = excluded.rights_evidence,
      mime_type = excluded.mime_type,
      size_bytes = excluded.size_bytes,
      metadata = public.music_source_candidates.metadata || excluded.metadata,
      last_seen_at = now(),
      status = case
        when public.music_source_candidates.status in ('pending','ready') then excluded.status
        else public.music_source_candidates.status
      end;
    affected := affected + 1;
  end loop;
  return affected;
end;
$$;

revoke all on function public.register_music_candidates(jsonb) from public, anon, authenticated;
grant execute on function public.register_music_candidates(jsonb) to service_role;

drop function public.admin_music_candidates();
create function public.admin_music_candidates(
  p_search text default '',
  p_status text default '',
  p_limit integer default 200
)
returns table(
  id uuid, source text, source_page_url text, source_file_url text,
  title text, artist_name text, detected_license text, license_url text,
  rights_evidence text, status text, discovered_at timestamptz,
  last_seen_at timestamptz, review_notes text, mime_type text,
  size_bytes bigint, attempt_count integer, last_error text,
  catalog_track_id uuid, publication_status text
)
language plpgsql security definer set search_path = '' stable as $$
begin
  perform public.require_admin();
  return query
  select c.id,c.source,c.source_page_url,c.source_file_url,c.title,c.artist_name,
    c.detected_license,c.license_url,c.rights_evidence,c.status,c.discovered_at,
    c.last_seen_at,c.review_notes,c.mime_type,c.size_bytes,c.attempt_count,
    c.last_error,c.catalog_track_id,t.publication_status
  from public.music_source_candidates c
  left join public.catalog_tracks t on t.id = c.catalog_track_id
  where (coalesce(trim(p_status),'') = '' or c.status = p_status)
    and (coalesce(trim(p_search),'') = '' or
      c.title ilike '%' || trim(p_search) || '%' or
      c.artist_name ilike '%' || trim(p_search) || '%' or
      c.detected_license ilike '%' || trim(p_search) || '%')
  order by
    case c.status when 'pending' then 0 when 'failed' then 1 when 'ready' then 2
      when 'approved' then 3 when 'imported' then 4 else 5 end,
    c.discovered_at desc
  limit least(greatest(coalesce(p_limit,200),1),500);
end;
$$;

create or replace function public.admin_set_catalog_publication(
  p_track_id uuid,
  p_status text,
  p_reason text
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  if p_status not in ('published','unpublished') or char_length(trim(p_reason)) < 5 then
    raise exception 'Valid publication status and audit reason required';
  end if;
  update public.catalog_tracks
  set publication_status = p_status,
      published_at = case when p_status = 'published' then coalesce(published_at,now()) else published_at end
  where id = p_track_id;
  if not found then raise exception 'Catalog track not found'; end if;
  insert into public.admin_audit_log(actor_id,action,target_type,target_id,reason,metadata)
  values(auth.uid(),'set_catalog_publication','catalog_track',p_track_id::text,trim(p_reason),jsonb_build_object('status',p_status));
end;
$$;

create or replace function public.admin_retry_music_candidate(
  p_candidate_id uuid,
  p_reason text
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  if char_length(trim(p_reason)) < 5 then raise exception 'Audit reason required'; end if;
  update public.music_source_candidates
  set status = case when detected_license ~* '^(Public domain|CC0|CC BY)' then 'ready' else 'approved' end,
      last_error = '', reviewed_by = auth.uid(), reviewed_at = now(), review_notes = trim(p_reason)
  where id = p_candidate_id and status in ('failed','pending','approved','ready');
  if not found then raise exception 'Candidate cannot be queued'; end if;
  insert into public.admin_audit_log(actor_id,action,target_type,target_id,reason)
  values(auth.uid(),'retry_music_candidate','music_source',p_candidate_id::text,trim(p_reason));
end;
$$;

grant execute on function public.admin_music_candidates(text,text,integer),
  public.admin_set_catalog_publication(uuid,text,text),
  public.admin_retry_music_candidate(uuid,text) to authenticated;
