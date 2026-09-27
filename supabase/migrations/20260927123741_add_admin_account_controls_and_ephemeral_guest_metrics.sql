
create table if not exists private.snar_account_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','suspended')),
  updated_at timestamptz not null default now(),
  updated_by uuid null,
  note text not null default ''
);
alter table private.snar_account_access enable row level security;
revoke all on table private.snar_account_access from public, anon, authenticated;

insert into private.snar_account_access(user_id,status,note)
select id,'active','Existing account initialized active'
from auth.users
on conflict (user_id) do nothing;

create or replace function private.snar_initialize_account_access()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  insert into private.snar_account_access(user_id,status,note)
  values(new.id,'active','Account initialized active')
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function private.snar_initialize_account_access() from public, anon, authenticated;

drop trigger if exists snar_initialize_account_access_after_user on auth.users;
create trigger snar_initialize_account_access_after_user
after insert on auth.users
for each row execute function private.snar_initialize_account_access();

create or replace function private.snar_account_is_active(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select coalesce(
    (select status='active' from private.snar_account_access where user_id=p_uid),
    true
  );
$$;
revoke all on function private.snar_account_is_active(uuid) from public, anon, authenticated;

create or replace function public.snar_account_access_status()
returns text
language sql
stable
security definer
set search_path=''
as $$
  select case
    when auth.uid() is null then 'signed_out'
    when private.snar_account_is_active(auth.uid()) then 'active'
    else 'suspended'
  end;
$$;
revoke all on function public.snar_account_access_status() from public, anon;
grant execute on function public.snar_account_access_status() to authenticated;

create table if not exists private.snar_guest_sessions (
  session_id uuid primary key,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
alter table private.snar_guest_sessions enable row level security;
revoke all on table private.snar_guest_sessions from public, anon, authenticated;

create or replace function public.snar_guest_heartbeat(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
begin
  if p_session_id is null then raise exception 'Session id required'; end if;

  delete from private.snar_guest_sessions
  where last_seen_at < now()-interval '24 hours';

  insert into private.snar_guest_sessions(session_id,started_at,last_seen_at)
  values(p_session_id,now(),now())
  on conflict (session_id) do update set last_seen_at=excluded.last_seen_at;

  return true;
end;
$$;
revoke all on function public.snar_guest_heartbeat(uuid) from public, authenticated;
grant execute on function public.snar_guest_heartbeat(uuid) to anon;

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
    'active_accounts',(select count(*) from auth.users u where private.snar_account_is_active(u.id)),
    'suspended_accounts',(select count(*) from auth.users u where not private.snar_account_is_active(u.id)),
    'legal_acceptances',(select count(*) from private.snar_legal_acceptances),
    'current_legal_accounts',(select count(distinct user_id) from private.snar_legal_acceptances where terms_version='2026-09-27-v3' and privacy_version='2026-09-27-v3'),
    'privacy_requests',(select count(*) from public.snar_privacy_requests),
    'privacy_received',(select count(*) from public.snar_privacy_requests where status='received'),
    'privacy_in_review',(select count(*) from public.snar_privacy_requests where status='in_review'),
    'item_contributions',(select count(*) from private.mbu_item_contributions),
    'cat_users',(select count(distinct user_id) from private.mbu_item_contributions where session_mode='adaptive'),
    'adaptive_first_attempts',(select count(*) from private.mbu_item_contributions where session_mode='adaptive'),
    'calibrated_items_25',(select count(*) from public.mbu_item_calibration where unique_learners>=25),
    'guest_active_15m',(select count(*) from private.snar_guest_sessions where last_seen_at>=now()-interval '15 minutes'),
    'guest_sessions_24h',(select count(*) from private.snar_guest_sessions where last_seen_at>=now()-interval '24 hours'),
    'sync_state_rows',(select count(*) from public.mbu_sync_state),
    'sync_history_rows',(select count(*) from public.mbu_sync_versions)
  ) into out;
  return out;
end;
$$;
revoke all on function public.snar_admin_system_summary() from public, anon;
grant execute on function public.snar_admin_system_summary() to authenticated;

create or replace function public.snar_admin_accounts()
returns table(
  user_id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  access_status text,
  current_legal_accepted boolean,
  cat_used boolean,
  is_admin boolean
)
language plpgsql
stable
security definer
set search_path=''
as $$
begin
  if not private.snar_is_admin(auth.uid()) then raise exception 'Admin required'; end if;
  return query
  select
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    case when private.snar_account_is_active(u.id) then 'active'::text else 'suspended'::text end,
    exists(
      select 1 from private.snar_legal_acceptances a
      where a.user_id=u.id and a.terms_version='2026-09-27-v3' and a.privacy_version='2026-09-27-v3'
    ),
    exists(
      select 1 from private.mbu_item_contributions c
      where c.user_id=u.id and c.session_mode='adaptive'
    ),
    private.snar_is_admin(u.id)
  from auth.users u
  order by u.created_at desc;
end;
$$;
revoke all on function public.snar_admin_accounts() from public, anon;
grant execute on function public.snar_admin_accounts() to authenticated;

create or replace function public.snar_admin_set_account_access(p_user_id uuid,p_status text)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
begin
  if not private.snar_is_admin(auth.uid()) then raise exception 'Admin required'; end if;
  if p_status not in ('active','suspended') then raise exception 'Invalid access status'; end if;
  if p_user_id=auth.uid() and p_status='suspended' then raise exception 'Cannot suspend your own operator-admin account'; end if;
  if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'Account not found'; end if;

  insert into private.snar_account_access(user_id,status,updated_at,updated_by,note)
  values(p_user_id,p_status,now(),auth.uid(),'Operator-admin account access change')
  on conflict (user_id) do update
  set status=excluded.status,updated_at=excluded.updated_at,updated_by=excluded.updated_by,note=excluded.note;
  return true;
end;
$$;
revoke all on function public.snar_admin_set_account_access(uuid,text) from public, anon;
grant execute on function public.snar_admin_set_account_access(uuid,text) to authenticated;

create or replace function public.snar_admin_delete_account(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
begin
  if not private.snar_is_admin(auth.uid()) then raise exception 'Admin required'; end if;
  if p_user_id=auth.uid() then raise exception 'Use self-service deletion for your own operator-admin account'; end if;
  if private.snar_is_admin(p_user_id) then raise exception 'Cannot delete another operator-admin account through this function'; end if;
  if not exists(select 1 from auth.users where id=p_user_id) then return false; end if;

  delete from auth.users where id=p_user_id;
  return true;
end;
$$;
revoke all on function public.snar_admin_delete_account(uuid) from public, anon;
grant execute on function public.snar_admin_delete_account(uuid) to authenticated;

create or replace function public.snar_admin_retention_cleanup()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare sync_deleted integer:=0;privacy_deleted integer:=0;legal_deleted integer:=0;guest_deleted integer:=0;
begin
  if not private.snar_is_admin(auth.uid()) then raise exception 'Admin required'; end if;
  delete from public.mbu_sync_versions where saved_at<now()-interval '90 days';
  get diagnostics sync_deleted=row_count;
  delete from public.snar_privacy_requests where status in ('completed','denied') and updated_at<now()-interval '3 years';
  get diagnostics privacy_deleted=row_count;
  delete from private.snar_legal_acceptances where retention_until<now();
  get diagnostics legal_deleted=row_count;
  delete from private.snar_guest_sessions where last_seen_at<now()-interval '24 hours';
  get diagnostics guest_deleted=row_count;
  return jsonb_build_object(
    'sync_history_deleted',sync_deleted,
    'privacy_requests_deleted',privacy_deleted,
    'legal_acceptances_deleted',legal_deleted,
    'guest_sessions_deleted',guest_deleted,
    'ran_at',now()
  );
end;
$$;
revoke all on function public.snar_admin_retention_cleanup() from public, anon;
grant execute on function public.snar_admin_retention_cleanup() to authenticated;
