create or replace function public.admin_retry_music_candidate(
  p_candidate_id uuid,
  p_reason text
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  if char_length(trim(p_reason)) < 5 then raise exception 'Audit reason required'; end if;
  update public.music_source_candidates
  set status = case
        when reviewed_at is not null then 'approved'
        when detected_license ~* '^(Public domain|CC0( 1\.0)?|CC BY(-SA)? (2\.0|2\.5|3\.0|4\.0))$' then 'ready'
        else 'pending'
      end,
      last_error = '',
      review_notes = case when reviewed_at is not null then review_notes else trim(p_reason) end
  where id = p_candidate_id and status = 'failed';
  if not found then raise exception 'Only failed candidates can be retried'; end if;
  insert into public.admin_audit_log(actor_id,action,target_type,target_id,reason)
  values(auth.uid(),'retry_music_candidate','music_source',p_candidate_id::text,trim(p_reason));
end;
$$;

grant execute on function public.admin_retry_music_candidate(uuid,text) to authenticated;
