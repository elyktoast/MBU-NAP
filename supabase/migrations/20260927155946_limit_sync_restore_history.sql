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
      limit 10
    );

  return new;
end;
$$;

delete from public.mbu_sync_versions v
where v.id not in (
  select keep.id
  from (
    select id,
           row_number() over (
             partition by user_id, store_key
             order by server_revision desc
           ) as rn
    from public.mbu_sync_versions
  ) keep
  where keep.rn <= 10
);

revoke execute on function public.mbu_sync_record_version() from public, anon, authenticated;
