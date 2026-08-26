create or replace function public.admin_add_music_candidate(
  p_source text,p_source_page_url text,p_title text,p_artist_name text,
  p_detected_license text,p_license_url text,p_rights_evidence text
)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform public.require_admin();
  if p_source not in ('wikimedia_commons','internet_archive','library_of_congress','free_music_archive','youtube','other')
    or p_source_page_url !~ '^https://' or char_length(trim(p_title))<1 then
    raise exception 'Valid source, HTTPS URL, and title required';
  end if;
  insert into public.music_source_candidates(source,source_page_url,title,artist_name,detected_license,license_url,rights_evidence)
  values(p_source,p_source_page_url,trim(p_title),coalesce(nullif(trim(p_artist_name),''),'Unknown creator'),coalesce(nullif(trim(p_detected_license),''),'Unknown'),coalesce(p_license_url,''),coalesce(p_rights_evidence,''))
  on conflict(source_page_url) do update set title=excluded.title,artist_name=excluded.artist_name,detected_license=excluded.detected_license,license_url=excluded.license_url,rights_evidence=excluded.rights_evidence,last_seen_at=now();
  insert into public.admin_audit_log(actor_id,action,target_type,target_id,reason)
  values(auth.uid(),'add_music_candidate','music_source',p_source_page_url,'Added for rights review');
end; $$;
grant execute on function public.admin_add_music_candidate(text,text,text,text,text,text,text) to authenticated;
