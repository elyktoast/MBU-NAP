
create table if not exists private.snar_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'operator_admin'
    check (role in ('operator_admin')),
  granted_at timestamptz not null default now(),
  note text not null default ''
);

alter table private.snar_admins enable row level security;
revoke all on table private.snar_admins from public, anon, authenticated;

do $$
declare n integer;
begin
  select count(*) into n from auth.users;
  if n <> 1 then
    raise exception 'Expected exactly one existing account before initial operator-admin grant; found %', n;
  end if;
  insert into private.snar_admins(user_id,role,note)
  select id,'operator_admin','Initial SNAR Study Tool operator account'
  from auth.users
  on conflict (user_id) do nothing;
end $$;

create or replace function private.snar_is_admin(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1
    from private.snar_admins
    where user_id=p_uid and role='operator_admin'
  );
$$;
revoke all on function private.snar_is_admin(uuid) from public, anon, authenticated;

create or replace function public.snar_admin_status()
returns jsonb
language sql
stable
security definer
set search_path=''
as $$
  select jsonb_build_object(
    'is_admin', private.snar_is_admin(auth.uid()),
    'role', case when private.snar_is_admin(auth.uid()) then 'operator_admin' else null end
  );
$$;
revoke all on function public.snar_admin_status() from public, anon;
grant execute on function public.snar_admin_status() to authenticated;

create or replace function public.snar_admin_system_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare out jsonb;
begin
  if not private.snar_is_admin(auth.uid()) then raise exception 'Admin required'; end if;
  select jsonb_build_object(
    'accounts',(select count(*) from auth.users),
    'legal_acceptances',(select count(*) from private.snar_legal_acceptances),
    'privacy_requests',(select count(*) from public.snar_privacy_requests),
    'privacy_received',(select count(*) from public.snar_privacy_requests where status='received'),
    'privacy_in_review',(select count(*) from public.snar_privacy_requests where status='in_review'),
    'item_contributions',(select count(*) from private.mbu_item_contributions),
    'calibrated_items_25',(select count(*) from public.mbu_item_calibration where unique_learners>=25),
    'sync_state_rows',(select count(*) from public.mbu_sync_state),
    'sync_history_rows',(select count(*) from public.mbu_sync_versions)
  ) into out;
  return out;
end;
$$;
revoke all on function public.snar_admin_system_summary() from public, anon;
grant execute on function public.snar_admin_system_summary() to authenticated;

create or replace function public.snar_admin_legal_acceptances()
returns table(
  user_id uuid,
  terms_version text,
  privacy_version text,
  adult_ack boolean,
  accepted_at timestamptz,
  recorded_at timestamptz
)
language plpgsql
stable
security definer
set search_path=''
as $$
begin
  if not private.snar_is_admin(auth.uid()) then raise exception 'Admin required'; end if;
  return query
  select a.user_id,a.terms_version,a.privacy_version,a.adult_ack,a.accepted_at,a.recorded_at
  from private.snar_legal_acceptances a
  order by a.recorded_at desc;
end;
$$;
revoke all on function public.snar_admin_legal_acceptances() from public, anon;
grant execute on function public.snar_admin_legal_acceptances() to authenticated;

create or replace function public.snar_admin_privacy_requests()
returns table(
  id bigint,
  user_id uuid,
  request_type text,
  details text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path=''
as $$
begin
  if not private.snar_is_admin(auth.uid()) then raise exception 'Admin required'; end if;
  return query
  select r.id,r.user_id,r.request_type,r.details,r.status,r.created_at,r.updated_at
  from public.snar_privacy_requests r
  order by r.created_at desc;
end;
$$;
revoke all on function public.snar_admin_privacy_requests() from public, anon;
grant execute on function public.snar_admin_privacy_requests() to authenticated;

create or replace function public.snar_admin_update_privacy_request(
  p_id bigint,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
begin
  if not private.snar_is_admin(auth.uid()) then raise exception 'Admin required'; end if;
  if p_status not in ('received','in_review','completed','denied') then
    raise exception 'Invalid status';
  end if;
  update public.snar_privacy_requests
  set status=p_status,updated_at=now()
  where id=p_id;
  return found;
end;
$$;
revoke all on function public.snar_admin_update_privacy_request(bigint,text) from public, anon;
grant execute on function public.snar_admin_update_privacy_request(bigint,text) to authenticated;
