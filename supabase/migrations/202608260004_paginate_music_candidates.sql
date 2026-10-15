drop function if exists public.admin_music_candidates(text,text,integer);

create function public.admin_music_candidates(
  p_search text default '',p_status text default '',p_before_time timestamptz default null,
  p_before_id uuid default null,p_limit integer default 51
)
returns table(id uuid,source text,source_page_url text,source_file_url text,title text,artist_name text,detected_license text,license_url text,rights_evidence text,status text,discovered_at timestamptz,last_seen_at timestamptz,review_notes text,mime_type text,size_bytes bigint,attempt_count integer,last_error text,catalog_track_id uuid,publication_status text,next_attempt_at timestamptz,failure_class text)
language plpgsql security definer set search_path='' stable as $$
begin
  perform public.require_admin();
  return query
  select c.id,c.source,c.source_page_url,c.source_file_url,c.title,c.artist_name,c.detected_license,c.license_url,c.rights_evidence,c.status,c.discovered_at,c.last_seen_at,c.review_notes,c.mime_type,c.size_bytes,c.attempt_count,c.last_error,c.catalog_track_id,t.publication_status,c.next_attempt_at,c.failure_class
  from public.music_source_candidates c left join public.catalog_tracks t on t.id=c.catalog_track_id
  where (coalesce(trim(p_status),'')='' or c.status=p_status)
    and (coalesce(trim(p_search),'')='' or c.title ilike '%'||trim(p_search)||'%' or c.artist_name ilike '%'||trim(p_search)||'%' or c.detected_license ilike '%'||trim(p_search)||'%' or c.source ilike '%'||trim(p_search)||'%')
    and (p_before_time is null or c.discovered_at<p_before_time or (c.discovered_at=p_before_time and c.id<p_before_id))
  order by c.discovered_at desc,c.id desc
  limit least(greatest(coalesce(p_limit,51),1),101);
end; $$;

revoke all on function public.admin_music_candidates(text,text,timestamptz,uuid,integer) from public,anon;
grant execute on function public.admin_music_candidates(text,text,timestamptz,uuid,integer) to authenticated;
