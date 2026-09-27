
create table if not exists private.snar_privacy_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('access','correction','export','deletion','other')),
  details text null check (details is null or char_length(details) <= 2000),
  status text not null default 'received' check (status in ('received','in_review','completed','denied')),
  created_at timestamptz not null default now(),
  completed_at timestamptz null
);
create index if not exists snar_privacy_requests_user_id_idx on private.snar_privacy_requests(user_id);
revoke all on table private.snar_privacy_requests from public, anon, authenticated;

create or replace function public.snar_submit_privacy_request(p_request_type text, p_details text default null)
returns bigint
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid := auth.uid();
  kind text := lower(coalesce(p_request_type,''));
  rid bigint;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if kind not in ('access','correction','export','deletion','other') then raise exception 'Invalid request type'; end if;
  if p_details is not null and char_length(p_details)>2000 then raise exception 'Request details are too long'; end if;
  insert into private.snar_privacy_requests(user_id,request_type,details)
  values(uid,kind,nullif(trim(p_details),''))
  returning id into rid;
  return rid;
end;
$$;
revoke all on function public.snar_submit_privacy_request(text,text) from public, anon;
grant execute on function public.snar_submit_privacy_request(text,text) to authenticated;
