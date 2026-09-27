
create or replace function public.mbu_sync_write_state(
  p_store_key text,
  p_payload jsonb,
  p_device_id text,
  p_client_revision bigint,
  p_client_updated_at timestamptz,
  p_expected_server_revision bigint default 0
)
returns jsonb
language plpgsql
set search_path=''
as $$
declare
  r public.mbu_sync_state%rowtype;
  expected bigint:=coalesce(p_expected_server_revision,0);
  uid uuid:=(select auth.uid());
begin
  if uid is null then raise exception 'authentication required'; end if;
  if public.snar_account_access_status()<>'active' then raise exception 'Account access suspended'; end if;

  select * into r from public.mbu_sync_state
  where user_id=uid and store_key=p_store_key for update;

  if not found then
    if expected<>0 then return jsonb_build_object('applied',false,'missing',true); end if;
    insert into public.mbu_sync_state(user_id,store_key,payload,device_id,client_revision,client_updated_at)
    values(uid,p_store_key,p_payload,p_device_id,p_client_revision,p_client_updated_at)
    returning * into r;
    return jsonb_build_object('applied',true,'row',to_jsonb(r));
  end if;

  if r.server_revision<>expected then
    return jsonb_build_object('applied',false,'row',to_jsonb(r));
  end if;

  update public.mbu_sync_state
  set payload=p_payload,
      device_id=p_device_id,
      client_revision=p_client_revision,
      client_updated_at=p_client_updated_at
  where user_id=uid and store_key=p_store_key
  returning * into r;

  return jsonb_build_object('applied',true,'row',to_jsonb(r));
end;
$$;
