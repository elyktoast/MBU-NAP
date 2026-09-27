
create table public.mbu_sync_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  store_key text not null check (char_length(store_key) between 1 and 160),
  payload jsonb not null,
  device_id text not null check (char_length(device_id) between 1 and 160),
  client_revision bigint not null default 0 check (client_revision >= 0),
  client_updated_at timestamptz not null,
  server_revision bigint not null default 1 check (server_revision > 0),
  server_updated_at timestamptz not null default now(),
  primary key (user_id, store_key),
  constraint mbu_sync_payload_size check (octet_length(payload::text) <= 2097152)
);

create table public.mbu_sync_versions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  store_key text not null,
  payload jsonb not null,
  device_id text not null,
  client_revision bigint not null,
  client_updated_at timestamptz not null,
  server_revision bigint not null,
  saved_at timestamptz not null default now(),
  unique (user_id, store_key, server_revision)
);

create table public.mbu_sync_devices (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null check (char_length(device_id) between 1 and 160),
  device_label text,
  app_build text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (user_id, device_id)
);

create index mbu_sync_versions_user_store_saved_idx
  on public.mbu_sync_versions (user_id, store_key, saved_at desc);

create index mbu_sync_devices_user_seen_idx
  on public.mbu_sync_devices (user_id, last_seen_at desc);

create or replace function public.mbu_sync_prepare_state()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and new.user_id is distinct from (select auth.uid()) then
    raise exception 'user_id must match authenticated user';
  end if;

  new.server_updated_at := now();
  if tg_op = 'INSERT' then
    new.server_revision := 1;
  else
    new.server_revision := old.server_revision + 1;
  end if;
  return new;
end;
$$;

create or replace function public.mbu_sync_record_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.mbu_sync_versions (
    user_id, store_key, payload, device_id,
    client_revision, client_updated_at, server_revision
  )
  values (
    new.user_id, new.store_key, new.payload, new.device_id,
    new.client_revision, new.client_updated_at, new.server_revision
  );

  delete from public.mbu_sync_versions v
  where v.user_id = new.user_id
    and v.store_key = new.store_key
    and v.id not in (
      select keep.id
      from public.mbu_sync_versions keep
      where keep.user_id = new.user_id
        and keep.store_key = new.store_key
      order by keep.server_revision desc
      limit 100
    );

  return new;
end;
$$;

create trigger mbu_sync_state_prepare
before insert or update on public.mbu_sync_state
for each row execute function public.mbu_sync_prepare_state();

create trigger mbu_sync_state_version
after insert or update on public.mbu_sync_state
for each row execute function public.mbu_sync_record_version();

alter table public.mbu_sync_state enable row level security;
alter table public.mbu_sync_versions enable row level security;
alter table public.mbu_sync_devices enable row level security;

revoke all on public.mbu_sync_state from anon, authenticated;
revoke all on public.mbu_sync_versions from anon, authenticated;
revoke all on public.mbu_sync_devices from anon, authenticated;

grant select, insert, update, delete on public.mbu_sync_state to authenticated;
grant select on public.mbu_sync_versions to authenticated;
grant select, insert, update, delete on public.mbu_sync_devices to authenticated;

create policy "users_select_own_sync_state"
on public.mbu_sync_state
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users_insert_own_sync_state"
on public.mbu_sync_state
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users_update_own_sync_state"
on public.mbu_sync_state
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users_delete_own_sync_state"
on public.mbu_sync_state
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "users_select_own_sync_versions"
on public.mbu_sync_versions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users_select_own_sync_devices"
on public.mbu_sync_devices
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users_insert_own_sync_devices"
on public.mbu_sync_devices
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users_update_own_sync_devices"
on public.mbu_sync_devices
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users_delete_own_sync_devices"
on public.mbu_sync_devices
for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke execute on function public.mbu_sync_prepare_state() from public, anon, authenticated;
revoke execute on function public.mbu_sync_record_version() from public, anon, authenticated;
