insert into public.user_roles (user_id, role)
select id, 'admin'
from auth.users
where lower(email) = 'kun.leeing@gmail.com'
on conflict (user_id)
do update set role = 'admin', assigned_at = now();

create or replace function public.assign_designated_admin()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if lower(new.email) = 'kun.leeing@gmail.com' then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin')
    on conflict (user_id)
    do update set role = 'admin', assigned_at = now();
  end if;
  return new;
end;
$$;

create trigger zz_assign_designated_admin_after_signup
after insert or update of email on auth.users
for each row execute function public.assign_designated_admin();
