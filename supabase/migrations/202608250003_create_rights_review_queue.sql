create table public.music_source_candidates (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('wikimedia_commons','free_music_archive','youtube','other')),
  source_page_url text not null unique,
  source_file_url text,
  title text not null check (char_length(title) between 1 and 240),
  artist_name text not null default 'Unknown creator',
  detected_license text not null default 'Unknown',
  license_url text not null default '',
  rights_evidence text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','link_only','rejected','imported')),
  discovered_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text not null default ''
);

create table public.catalog_references (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null unique references public.music_source_candidates(id) on delete cascade,
  title text not null,
  artist_name text not null,
  external_url text not null,
  source text not null,
  license_name text not null,
  license_url text not null default '',
  created_at timestamptz not null default now()
);

alter table public.music_source_candidates enable row level security;
alter table public.catalog_references enable row level security;
revoke all on public.music_source_candidates, public.catalog_references from anon,authenticated;
grant select on public.catalog_references to anon,authenticated;
create policy "External catalog references are public" on public.catalog_references for select using(true);

create or replace function public.admin_music_candidates()
returns table(id uuid,source text,source_page_url text,title text,artist_name text,detected_license text,license_url text,rights_evidence text,status text,discovered_at timestamptz,review_notes text)
language plpgsql security definer set search_path='' stable as $$
begin
  perform public.require_admin();
  return query select c.id,c.source,c.source_page_url,c.title,c.artist_name,c.detected_license,c.license_url,c.rights_evidence,c.status,c.discovered_at,c.review_notes
  from public.music_source_candidates c order by (c.status='pending') desc,c.discovered_at desc limit 200;
end;
$$;

create or replace function public.admin_add_music_candidate(p_source text,p_source_page_url text,p_title text,p_artist_name text,p_detected_license text,p_license_url text,p_rights_evidence text)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform public.require_admin();
  if p_source not in ('wikimedia_commons','free_music_archive','youtube','other') or p_source_page_url !~ '^https://' or char_length(trim(p_title))<1 then raise exception 'Valid source, HTTPS URL, and title required'; end if;
  insert into public.music_source_candidates(source,source_page_url,title,artist_name,detected_license,license_url,rights_evidence)
  values(p_source,p_source_page_url,trim(p_title),coalesce(nullif(trim(p_artist_name),''),'Unknown creator'),coalesce(nullif(trim(p_detected_license),''),'Unknown'),coalesce(p_license_url,''),coalesce(p_rights_evidence,''))
  on conflict(source_page_url) do update set title=excluded.title,artist_name=excluded.artist_name,detected_license=excluded.detected_license,license_url=excluded.license_url,rights_evidence=excluded.rights_evidence;
  insert into public.admin_audit_log(actor_id,action,target_type,target_id,reason) values(auth.uid(),'add_music_candidate','music_source',p_source_page_url,'Added for rights review');
end;
$$;

create or replace function public.admin_review_music_candidate(p_candidate_id uuid,p_decision text,p_notes text)
returns void language plpgsql security definer set search_path='' as $$
declare candidate public.music_source_candidates;
begin
  perform public.require_admin();
  if p_decision not in ('approved','link_only','rejected') or char_length(trim(p_notes))<5 then raise exception 'Valid decision and review notes required'; end if;
  select * into candidate from public.music_source_candidates where id=p_candidate_id;
  if candidate.id is null then raise exception 'Candidate not found'; end if;
  update public.music_source_candidates set status=p_decision,reviewed_by=auth.uid(),reviewed_at=now(),review_notes=trim(p_notes) where id=p_candidate_id;
  if p_decision='link_only' then
    insert into public.catalog_references(candidate_id,title,artist_name,external_url,source,license_name,license_url)
    values(candidate.id,candidate.title,candidate.artist_name,candidate.source_page_url,candidate.source,candidate.detected_license,candidate.license_url)
    on conflict(candidate_id) do update set title=excluded.title,artist_name=excluded.artist_name,external_url=excluded.external_url,license_name=excluded.license_name,license_url=excluded.license_url;
  else
    delete from public.catalog_references where candidate_id=p_candidate_id;
  end if;
  insert into public.admin_audit_log(actor_id,action,target_type,target_id,reason,metadata) values(auth.uid(),'review_music_candidate','music_source',p_candidate_id::text,trim(p_notes),jsonb_build_object('decision',p_decision));
end;
$$;

grant execute on function public.admin_music_candidates(),public.admin_add_music_candidate(text,text,text,text,text,text,text),public.admin_review_music_candidate(uuid,text,text) to authenticated;
create index music_candidates_status_idx on public.music_source_candidates(status,discovered_at desc);
create index catalog_references_created_idx on public.catalog_references(created_at desc);
