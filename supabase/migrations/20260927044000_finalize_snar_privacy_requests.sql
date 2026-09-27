drop function if exists public.snar_submit_privacy_request(text,text);
drop table if exists private.snar_privacy_requests;

create table if not exists public.snar_privacy_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('access','correction','export','deletion','other')),
  details text not null default '' check (char_length(details) <= 4000),
  status text not null default 'received' check (status in ('received','in_review','completed','denied')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.snar_privacy_requests enable row level security;

drop policy if exists "Users can submit privacy requests" on public.snar_privacy_requests;
create policy "Users can submit privacy requests"
on public.snar_privacy_requests
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can view own privacy requests" on public.snar_privacy_requests;
create policy "Users can view own privacy requests"
on public.snar_privacy_requests
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.snar_privacy_requests from public, anon, authenticated;
grant insert, select on table public.snar_privacy_requests to authenticated;
grant usage, select on sequence public.snar_privacy_requests_id_seq to authenticated;
