create or replace function public.heartbeat_presence(p_session_id uuid, p_path text)
returns void language plpgsql security definer set search_path='' as $$
begin
  delete from public.visitor_presence where last_seen_at < now()-interval '24 hours';
  insert into public.visitor_presence(session_id,user_id,path,last_seen_at)
  values(p_session_id,auth.uid(),left(coalesce(nullif(p_path,''),'/'),160),now())
  on conflict(session_id) do update
  set user_id=coalesce(auth.uid(),public.visitor_presence.user_id),
      path=excluded.path,
      last_seen_at=now();
end;
$$;

create or replace function public.record_login()
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.user_activity_events
    where user_id=auth.uid() and event_type='login' and created_at>now()-interval '1 minute'
  ) then
    insert into public.user_activity_events(user_id,event_type) values(auth.uid(),'login');
  end if;
end;
$$;
