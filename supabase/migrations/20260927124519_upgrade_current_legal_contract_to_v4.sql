
insert into private.snar_legal_versions(version,terms_sha256,privacy_sha256,effective_at,archive_path)
values(
  '2026-09-27-v4',
  '200038ba8b9938d792b867f0d7931075955f78c23aaa6cc7a324611c2779236e',
  'c3381791ece8d47dc4e74af9519ba74fd0f3930abdf9f36cd1f871660fd3d52f',
  '2026-09-27T00:00:00Z',
  'legal/versions/2026-09-27-v4/'
)
on conflict (version) do update set
  terms_sha256=excluded.terms_sha256,
  privacy_sha256=excluded.privacy_sha256,
  effective_at=excluded.effective_at,
  archive_path=excluded.archive_path;

create or replace function private.snar_record_legal_acceptance()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  tv text:=nullif(new.raw_user_meta_data->>'snar_terms_version','');
  pv text:=nullif(new.raw_user_meta_data->>'snar_privacy_version','');
  aa boolean:=coalesce((new.raw_user_meta_data->>'snar_adult_ack')::boolean,false);
  v private.snar_legal_versions%rowtype;
  eh text;
begin
  if tv='2026-09-27-v4' and pv='2026-09-27-v4' and aa is true then
    select * into v from private.snar_legal_versions where version='2026-09-27-v4';
    eh:=case when new.email is null then null else encode(extensions.digest(lower(new.email),'sha256'),'hex') end;
    insert into private.snar_legal_acceptances(
      user_id,terms_version,privacy_version,adult_ack,accepted_at,email_hash,terms_sha256,privacy_sha256,retention_until
    )
    values(new.id,tv,pv,true,now(),eh,v.terms_sha256,v.privacy_sha256,now()+interval '5 years')
    on conflict (user_id,terms_version,privacy_version) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.snar_record_legal_acceptance() from public, anon, authenticated;

create or replace function public.snar_accept_current_legal(p_terms_version text,p_privacy_version text,p_adult_ack boolean)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid:=auth.uid();
  v private.snar_legal_versions%rowtype;
  mail text;
  eh text;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_adult_ack is not true then raise exception 'Adult acknowledgement required'; end if;
  if p_terms_version<>'2026-09-27-v4' or p_privacy_version<>'2026-09-27-v4' then
    raise exception 'Current legal version required';
  end if;
  select * into v from private.snar_legal_versions where version='2026-09-27-v4';
  select email into mail from auth.users where id=uid;
  eh:=case when mail is null then null else encode(extensions.digest(lower(mail),'sha256'),'hex') end;
  insert into private.snar_legal_acceptances(
    user_id,terms_version,privacy_version,adult_ack,accepted_at,email_hash,terms_sha256,privacy_sha256,retention_until
  )
  values(uid,'2026-09-27-v4','2026-09-27-v4',true,now(),eh,v.terms_sha256,v.privacy_sha256,now()+interval '5 years')
  on conflict (user_id,terms_version,privacy_version) do nothing;
  return true;
end;
$$;
revoke all on function public.snar_accept_current_legal(text,text,boolean) from public, anon;
grant execute on function public.snar_accept_current_legal(text,text,boolean) to authenticated;

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
    'current_legal_accounts',(select count(distinct user_id) from private.snar_legal_acceptances where terms_version='2026-09-27-v4' and privacy_version='2026-09-27-v4'),
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
  user_id uuid,email text,created_at timestamptz,last_sign_in_at timestamptz,
  access_status text,current_legal_accepted boolean,cat_used boolean,is_admin boolean
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
    u.id,u.email::text,u.created_at,u.last_sign_in_at,
    case when private.snar_account_is_active(u.id) then 'active'::text else 'suspended'::text end,
    exists(select 1 from private.snar_legal_acceptances a where a.user_id=u.id and a.terms_version='2026-09-27-v4' and a.privacy_version='2026-09-27-v4'),
    exists(select 1 from private.mbu_item_contributions c where c.user_id=u.id and c.session_mode='adaptive'),
    private.snar_is_admin(u.id)
  from auth.users u
  order by u.created_at desc;
end;
$$;
revoke all on function public.snar_admin_accounts() from public, anon;
grant execute on function public.snar_admin_accounts() to authenticated;
