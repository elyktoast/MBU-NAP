create table if not exists private.snar_account_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','suspended')),
  updated_at timestamptz not null default now(),
  updated_by uuid null,
  note text not null default ''
);
alter table private.snar_account_access enable row level security;
revoke all on table private.snar_account_access from public, anon, authenticated;

create table if not exists private.snar_guest_sessions (
  session_id uuid primary key,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
alter table private.snar_guest_sessions enable row level security;
revoke all on table private.snar_guest_sessions from public, anon, authenticated;

create or replace function public.snar_account_access_status()
returns text language sql stable security definer set search_path=''
as $$
  select case when auth.uid() is null then 'signed_out'
              when private.snar_account_is_active(auth.uid()) then 'active'
              else 'suspended' end;
$$;
revoke all on function public.snar_account_access_status() from public, anon;
grant execute on function public.snar_account_access_status() to authenticated;

create or replace function public.snar_guest_heartbeat(p_session_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
begin
  if p_session_id is null then raise exception 'Session id required'; end if;
  delete from private.snar_guest_sessions where last_seen_at<now()-interval '24 hours';
  insert into private.snar_guest_sessions(session_id,started_at,last_seen_at)
  values(p_session_id,now(),now())
  on conflict (session_id) do update set last_seen_at=excluded.last_seen_at;
  return true;
end;
$$;
revoke all on function public.snar_guest_heartbeat(uuid) from public, authenticated;
grant execute on function public.snar_guest_heartbeat(uuid) to anon;
