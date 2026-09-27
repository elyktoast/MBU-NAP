
create or replace function public.mbu_submit_item_contribution(
  p_question_id text,
  p_correct boolean,
  p_response_ms integer default null,
  p_session_mode text default 'unknown'
)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid:=auth.uid();
  mode text:=lower(coalesce(p_session_mode,'unknown'));
  inserted_count integer;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if not private.snar_account_is_active(uid) then raise exception 'Account access suspended'; end if;
  if p_question_id is null or char_length(trim(p_question_id))<1 or char_length(trim(p_question_id))>160 then raise exception 'Invalid question id'; end if;
  if p_response_ms is not null and (p_response_ms<0 or p_response_ms>3600000) then raise exception 'Invalid response time'; end if;
  if mode not in ('standard','custom','adaptive','smart','due','missed','flagged','hazards','combined','unknown') then mode:='unknown'; end if;
  insert into private.mbu_item_contributions(user_id,question_id,correct,response_ms,session_mode)
  values(uid,trim(p_question_id),p_correct,p_response_ms,mode)
  on conflict (user_id,question_id) do nothing;
  get diagnostics inserted_count=row_count;
  return inserted_count=1;
end;
$$;
revoke all on function public.mbu_submit_item_contribution(text,boolean,integer,text) from public,anon;
grant execute on function public.mbu_submit_item_contribution(text,boolean,integer,text) to authenticated;

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
  if not private.snar_account_is_active(uid) then raise exception 'Account access suspended'; end if;

  select * into r from public.mbu_sync_state
  where user_id=uid and store_key=p_store_key for update;

  if not found then
    if expected<>0 then return jsonb_build_object('applied',false,'missing',true); end if;
    insert into public.mbu_sync_state(user_id,store_key,payload,device_id,client_revision,client_updated_at)
    values(uid,p_store_key,p_payload,p_device_id,p_client_revision,p_client_updated_at)
    returning * into r;
    return jsonb_build_object('applied',true,'row',to_jsonb(r));
  end if;

  if r.server_revision<>expected then return jsonb_build_object('applied',false,'row',to_jsonb(r)); end if;

  update public.mbu_sync_state
  set payload=p_payload,device_id=p_device_id,client_revision=p_client_revision,client_updated_at=p_client_updated_at
  where user_id=uid and store_key=p_store_key
  returning * into r;

  return jsonb_build_object('applied',true,'row',to_jsonb(r));
end;
$$;
revoke all on function public.mbu_sync_write_state(text,jsonb,text,bigint,timestamptz,bigint) from public,anon;
grant execute on function public.mbu_sync_write_state(text,jsonb,text,bigint,timestamptz,bigint) to authenticated;

drop policy if exists "users_select_own_sync_state" on public.mbu_sync_state;
create policy "users_select_own_active_sync_state" on public.mbu_sync_state
for select to authenticated
using ((select auth.uid())=user_id and private.snar_account_is_active((select auth.uid())));

drop policy if exists "users_insert_own_sync_state" on public.mbu_sync_state;
create policy "users_insert_own_active_sync_state" on public.mbu_sync_state
for insert to authenticated
with check ((select auth.uid())=user_id and private.snar_account_is_active((select auth.uid())));

drop policy if exists "users_update_own_sync_state" on public.mbu_sync_state;
create policy "users_update_own_active_sync_state" on public.mbu_sync_state
for update to authenticated
using ((select auth.uid())=user_id and private.snar_account_is_active((select auth.uid())))
with check ((select auth.uid())=user_id and private.snar_account_is_active((select auth.uid())));

drop policy if exists "users_delete_own_sync_state" on public.mbu_sync_state;
create policy "users_delete_own_active_sync_state" on public.mbu_sync_state
for delete to authenticated
using ((select auth.uid())=user_id and private.snar_account_is_active((select auth.uid())));

drop policy if exists "users_select_own_sync_devices" on public.mbu_sync_devices;
create policy "users_select_own_active_sync_devices" on public.mbu_sync_devices
for select to authenticated
using ((select auth.uid())=user_id and private.snar_account_is_active((select auth.uid())));

drop policy if exists "users_insert_own_sync_devices" on public.mbu_sync_devices;
create policy "users_insert_own_active_sync_devices" on public.mbu_sync_devices
for insert to authenticated
with check ((select auth.uid())=user_id and private.snar_account_is_active((select auth.uid())));

drop policy if exists "users_update_own_sync_devices" on public.mbu_sync_devices;
create policy "users_update_own_active_sync_devices" on public.mbu_sync_devices
for update to authenticated
using ((select auth.uid())=user_id and private.snar_account_is_active((select auth.uid())))
with check ((select auth.uid())=user_id and private.snar_account_is_active((select auth.uid())));

drop policy if exists "users_delete_own_sync_devices" on public.mbu_sync_devices;
create policy "users_delete_own_active_sync_devices" on public.mbu_sync_devices
for delete to authenticated
using ((select auth.uid())=user_id and private.snar_account_is_active((select auth.uid())));

drop policy if exists "users_select_own_sync_versions" on public.mbu_sync_versions;
create policy "users_select_own_active_sync_versions" on public.mbu_sync_versions
for select to authenticated
using ((select auth.uid())=user_id and private.snar_account_is_active((select auth.uid())));

drop policy if exists "Calibration aggregates are readable at cohort threshold" on public.mbu_item_calibration;
create policy "Calibration aggregates are readable by active accounts at cohort threshold"
on public.mbu_item_calibration for select to authenticated
using (unique_learners>=25 and private.snar_account_is_active((select auth.uid())));
