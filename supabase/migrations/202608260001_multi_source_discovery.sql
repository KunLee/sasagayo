alter table public.music_source_candidates drop constraint if exists music_source_candidates_source_check;
alter table public.music_source_candidates add constraint music_source_candidates_source_check
  check (source in ('wikimedia_commons','internet_archive','library_of_congress','free_music_archive','youtube','other'));

alter table public.catalog_tracks drop constraint if exists catalog_tracks_source_check;
alter table public.catalog_tracks add constraint catalog_tracks_source_check
  check (source in ('wikimedia_commons','internet_archive'));

alter table public.music_source_candidates
  add column if not exists next_attempt_at timestamptz,
  add column if not exists failure_class text not null default ''
    check (failure_class in ('','transient','permanent','rights','source','storage','database'));

create index if not exists music_candidates_retry_idx
  on public.music_source_candidates(status,next_attempt_at,discovered_at)
  where status in ('ready','approved','failed');

create or replace function public.register_music_candidates(p_items jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare item jsonb; affected integer := 0; source_name text; page_url text; file_url text;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 100 then
    raise exception 'Candidate payload must be an array of at most 100 items';
  end if;
  for item in select value from jsonb_array_elements(p_items) loop
    source_name := item->>'source'; page_url := coalesce(item->>'source_page_url',''); file_url := coalesce(item->>'source_file_url','');
    if source_name not in ('wikimedia_commons','internet_archive','library_of_congress')
      or page_url !~ '^https://(commons\.wikimedia\.org|archive\.org|www\.loc\.gov)/'
      or (file_url <> '' and file_url !~ '^https://([^/]+\.)?(wikimedia\.org|archive\.org)/') then continue; end if;
    if item->>'status' = 'ready' and (coalesce(item->>'mime_type','') !~ '^audio/' or coalesce((item->>'size_bytes')::bigint,0) <= 0) then continue; end if;
    insert into public.music_source_candidates(source,source_page_url,source_file_url,source_sha1,title,artist_name,detected_license,license_url,rights_evidence,status,mime_type,size_bytes,metadata,last_seen_at)
    values(source_name,page_url,nullif(file_url,''),nullif(item->>'source_sha1',''),left(coalesce(nullif(item->>'title',''),'Untitled recording'),240),left(coalesce(nullif(item->>'artist_name',''),'Unknown creator'),240),coalesce(nullif(item->>'detected_license',''),'Unknown'),coalesce(item->>'license_url',''),coalesce(item->>'rights_evidence',''),case when item->>'status'='ready' then 'ready' else 'pending' end,nullif(item->>'mime_type',''),nullif(item->>'size_bytes','')::bigint,coalesce(item->'metadata','{}'::jsonb),now())
    on conflict(source_page_url) do update set source_file_url=coalesce(excluded.source_file_url,public.music_source_candidates.source_file_url),source_sha1=coalesce(excluded.source_sha1,public.music_source_candidates.source_sha1),title=excluded.title,artist_name=excluded.artist_name,detected_license=excluded.detected_license,license_url=excluded.license_url,rights_evidence=excluded.rights_evidence,mime_type=coalesce(excluded.mime_type,public.music_source_candidates.mime_type),size_bytes=coalesce(excluded.size_bytes,public.music_source_candidates.size_bytes),metadata=public.music_source_candidates.metadata||excluded.metadata,last_seen_at=now(),status=case when public.music_source_candidates.status in ('pending','ready') then excluded.status else public.music_source_candidates.status end;
    affected := affected + 1;
  end loop;
  return affected;
end; $$;
revoke all on function public.register_music_candidates(jsonb) from public,anon,authenticated;
grant execute on function public.register_music_candidates(jsonb) to service_role;

drop function if exists public.admin_music_candidates(text,text,integer);
create function public.admin_music_candidates(p_search text default '',p_status text default '',p_limit integer default 200)
returns table(id uuid,source text,source_page_url text,source_file_url text,title text,artist_name text,detected_license text,license_url text,rights_evidence text,status text,discovered_at timestamptz,last_seen_at timestamptz,review_notes text,mime_type text,size_bytes bigint,attempt_count integer,last_error text,catalog_track_id uuid,publication_status text,next_attempt_at timestamptz,failure_class text)
language plpgsql security definer set search_path='' stable as $$ begin perform public.require_admin(); return query
select c.id,c.source,c.source_page_url,c.source_file_url,c.title,c.artist_name,c.detected_license,c.license_url,c.rights_evidence,c.status,c.discovered_at,c.last_seen_at,c.review_notes,c.mime_type,c.size_bytes,c.attempt_count,c.last_error,c.catalog_track_id,t.publication_status,c.next_attempt_at,c.failure_class
from public.music_source_candidates c left join public.catalog_tracks t on t.id=c.catalog_track_id
where (coalesce(trim(p_status),'')='' or c.status=p_status) and (coalesce(trim(p_search),'')='' or c.title ilike '%'||trim(p_search)||'%' or c.artist_name ilike '%'||trim(p_search)||'%' or c.detected_license ilike '%'||trim(p_search)||'%' or c.source ilike '%'||trim(p_search)||'%')
order by case c.status when 'pending' then 0 when 'failed' then 1 when 'ready' then 2 when 'approved' then 3 when 'imported' then 4 else 5 end,c.discovered_at desc limit least(greatest(coalesce(p_limit,200),1),500); end; $$;
grant execute on function public.admin_music_candidates(text,text,integer) to authenticated;

create or replace function public.admin_retry_music_candidate(p_candidate_id uuid,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform public.require_admin();
  if char_length(trim(p_reason))<5 then raise exception 'Audit reason required'; end if;
  update public.music_source_candidates set
    status=case when reviewed_at is not null then 'approved' when detected_license ~* '^(Public domain|CC0( 1\.0)?|CC BY(-SA)? (2\.0|2\.5|3\.0|4\.0))$' then 'ready' else 'pending' end,
    last_error='',failure_class='',next_attempt_at=null,
    review_notes=case when reviewed_at is not null then review_notes else trim(p_reason) end
  where id=p_candidate_id and status='failed';
  if not found then raise exception 'Only failed candidates can be retried'; end if;
  insert into public.admin_audit_log(actor_id,action,target_type,target_id,reason)
  values(auth.uid(),'retry_music_candidate','music_source',p_candidate_id::text,trim(p_reason));
end; $$;
grant execute on function public.admin_retry_music_candidate(uuid,text) to authenticated;
