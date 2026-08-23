alter table public.profiles
  add column account_status text not null default 'active' check (account_status in ('active','suspended'));

create table public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin','moderator','member')) default 'member',
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now()
);

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  target_type text not null,
  target_id text not null,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('story','comment','profile')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 10 and 500),
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.moderation_reports enable row level security;
revoke all on public.user_roles, public.admin_audit_log, public.moderation_reports from anon, authenticated;

create or replace function public.is_admin()
returns boolean language sql security definer set search_path='' stable as $$
  select exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin');
$$;

create or replace function public.is_active_member()
returns boolean language sql security definer set search_path='' stable as $$
  select exists(select 1 from public.profiles where id=auth.uid() and account_status='active');
$$;

create or replace function public.block_suspended_writes()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is not null and not public.is_active_member() and not public.is_admin() then
    raise exception 'This account is suspended' using errcode='42501';
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end;
$$;

create trigger block_suspended_profile_writes before insert or update or delete on public.profiles for each row execute function public.block_suspended_writes();
create trigger block_suspended_story_writes before insert or update or delete on public.stories for each row execute function public.block_suspended_writes();
create trigger block_suspended_circle_writes before insert or update or delete on public.circles for each row execute function public.block_suspended_writes();
create trigger block_suspended_membership_writes before insert or update or delete on public.circle_members for each row execute function public.block_suspended_writes();
create trigger block_suspended_reaction_writes before insert or update or delete on public.story_reactions for each row execute function public.block_suspended_writes();
create trigger block_suspended_bookmark_writes before insert or update or delete on public.story_bookmarks for each row execute function public.block_suspended_writes();
create trigger block_suspended_comment_writes before insert or update or delete on public.comments for each row execute function public.block_suspended_writes();
create trigger block_suspended_media_writes before insert or update or delete on public.media_assets for each row execute function public.block_suspended_writes();
create trigger block_suspended_report_writes before insert or update or delete on public.moderation_reports for each row execute function public.block_suspended_writes();

create policy "Admins see roles" on public.user_roles for select to authenticated using (public.is_admin());
create policy "Admins see audit log" on public.admin_audit_log for select to authenticated using (public.is_admin());
create policy "Members create reports" on public.moderation_reports for insert to authenticated
with check (reporter_id=auth.uid() and public.is_active_member());
create policy "Reporters and admins see reports" on public.moderation_reports for select to authenticated
using (reporter_id=auth.uid() or public.is_admin());

create or replace function public.require_admin()
returns void language plpgsql security definer set search_path='' as $$
begin if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if; end;
$$;

create or replace function public.admin_overview()
returns jsonb language plpgsql security definer set search_path='' stable as $$
begin
  perform public.require_admin();
  return jsonb_build_object(
    'members',(select count(*) from public.profiles),
    'activeMembers',(select count(*) from public.profiles where account_status='active'),
    'suspendedMembers',(select count(*) from public.profiles where account_status='suspended'),
    'admins',(select count(*) from public.user_roles where role='admin'),
    'openReports',(select count(*) from public.moderation_reports where status='open'),
    'stories',(select count(*) from public.stories where status='published'),
    'activeNow',(select count(*) from public.visitor_presence where last_seen_at>now()-interval '2 minutes'),
    'loginsToday',(select count(*) from public.user_activity_events where created_at>date_trunc('day',now())),
    'activePaths',coalesce((select jsonb_agg(jsonb_build_object('path',path,'visitors',visitors) order by visitors desc) from (select path,count(*) visitors from public.visitor_presence where last_seen_at>now()-interval '2 minutes' group by path order by visitors desc limit 10) p),'[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_users(p_search text default '', p_limit integer default 50)
returns table(id uuid,email text,handle text,display_name text,account_status text,reputation_points integer,reputation_title text,role text,created_at timestamptz,last_sign_in_at timestamptz)
language plpgsql security definer set search_path='' stable as $$
begin
  perform public.require_admin();
  return query select p.id,u.email::text,p.handle,p.display_name,p.account_status,p.reputation_points,p.reputation_title,coalesce(r.role,'member'),p.created_at,u.last_sign_in_at
  from public.profiles p join auth.users u on u.id=p.id left join public.user_roles r on r.user_id=p.id
  where coalesce(p_search,'')='' or p.handle ilike '%'||p_search||'%' or p.display_name ilike '%'||p_search||'%' or u.email ilike '%'||p_search||'%'
  order by p.created_at desc limit least(greatest(p_limit,1),100);
end;
$$;

create or replace function public.admin_activity(p_limit integer default 100)
returns table(id bigint,event_type text,email text,display_name text,created_at timestamptz)
language plpgsql security definer set search_path='' stable as $$
begin
  perform public.require_admin();
  return query select a.id,a.event_type,u.email::text,p.display_name,a.created_at
  from public.user_activity_events a join auth.users u on u.id=a.user_id join public.profiles p on p.id=a.user_id
  order by a.created_at desc limit least(greatest(p_limit,1),200);
end;
$$;

create or replace function public.admin_reports()
returns table(id uuid,target_type text,target_id uuid,reason text,status text,reporter text,created_at timestamptz)
language plpgsql security definer set search_path='' stable as $$
begin
  perform public.require_admin();
  return query select m.id,m.target_type,m.target_id,m.reason,m.status,p.display_name,m.created_at
  from public.moderation_reports m join public.profiles p on p.id=m.reporter_id order by (m.status='open') desc,m.created_at desc limit 100;
end;
$$;

create or replace function public.admin_set_role(p_user_id uuid,p_role text,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform public.require_admin();
  if p_role not in ('admin','moderator','member') or char_length(trim(p_reason))<5 then raise exception 'Valid role and reason required'; end if;
  if p_user_id=auth.uid() and p_role<>'admin' then raise exception 'Administrators cannot remove their own access'; end if;
  insert into public.user_roles(user_id,role,assigned_by) values(p_user_id,p_role,auth.uid())
  on conflict(user_id) do update set role=excluded.role,assigned_by=auth.uid(),assigned_at=now();
  insert into public.admin_audit_log(actor_id,action,target_type,target_id,reason,metadata) values(auth.uid(),'set_role','user',p_user_id::text,trim(p_reason),jsonb_build_object('role',p_role));
end;
$$;

create or replace function public.admin_set_account_status(p_user_id uuid,p_status text,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform public.require_admin();
  if p_status not in ('active','suspended') or char_length(trim(p_reason))<5 then raise exception 'Valid status and reason required'; end if;
  if p_user_id=auth.uid() and p_status='suspended' then raise exception 'Administrators cannot suspend themselves'; end if;
  update public.profiles set account_status=p_status,updated_at=now() where id=p_user_id;
  insert into public.admin_audit_log(actor_id,action,target_type,target_id,reason,metadata) values(auth.uid(),'set_account_status','user',p_user_id::text,trim(p_reason),jsonb_build_object('status',p_status));
end;
$$;

create or replace function public.admin_adjust_reputation(p_user_id uuid,p_points integer,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform public.require_admin();
  if p_points=0 or abs(p_points)>100 or char_length(trim(p_reason))<5 then raise exception 'Adjustment must be between -100 and 100 with a reason'; end if;
  insert into public.reputation_events(user_id,event_key,event_type,points,reason)
  values(p_user_id,'admin:'||gen_random_uuid(),'admin_adjustment',p_points,trim(p_reason));
  insert into public.admin_audit_log(actor_id,action,target_type,target_id,reason,metadata) values(auth.uid(),'adjust_reputation','user',p_user_id::text,trim(p_reason),jsonb_build_object('points',p_points));
end;
$$;

create or replace function public.admin_resolve_report(p_report_id uuid,p_status text,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform public.require_admin();
  if p_status not in ('resolved','dismissed') or char_length(trim(p_reason))<5 then raise exception 'Resolution and reason required'; end if;
  update public.moderation_reports set status=p_status,resolved_by=auth.uid(),resolved_at=now() where id=p_report_id;
  insert into public.admin_audit_log(actor_id,action,target_type,target_id,reason,metadata) values(auth.uid(),'resolve_report','report',p_report_id::text,trim(p_reason),jsonb_build_object('status',p_status));
end;
$$;

create or replace function public.admin_audit(p_limit integer default 100)
returns table(id bigint,actor text,action text,target_type text,target_id text,reason text,metadata jsonb,created_at timestamptz)
language plpgsql security definer set search_path='' stable as $$
begin
  perform public.require_admin();
  return query select a.id,p.display_name,a.action,a.target_type,a.target_id,a.reason,a.metadata,a.created_at
  from public.admin_audit_log a join public.profiles p on p.id=a.actor_id order by a.created_at desc limit least(greatest(p_limit,1),200);
end;
$$;

grant execute on function public.is_admin(),public.is_active_member() to authenticated;
grant execute on function public.admin_overview(),public.admin_users(text,integer),public.admin_activity(integer),public.admin_reports(),public.admin_set_role(uuid,text,text),public.admin_set_account_status(uuid,text,text),public.admin_adjust_reputation(uuid,integer,text),public.admin_resolve_report(uuid,text,text),public.admin_audit(integer) to authenticated;
revoke execute on function public.require_admin() from public,anon,authenticated;

create index user_roles_role_idx on public.user_roles(role);
create index audit_log_created_idx on public.admin_audit_log(created_at desc);
create index moderation_reports_status_idx on public.moderation_reports(status,created_at desc);
