insert into private.snar_legal_versions(version,terms_sha256,privacy_sha256,effective_at,archive_path)
values(
  '2026-09-27-v6',
  '39b6cb6dc8ff7221c135dfccb3719e8ceaac3a4d4dfa91f710af1ba845ecebac',
  '77fc72addadf1e25ee88fe3081d6abdf3eb270cf73c592354091ca5941cc9eea',
  '2026-09-27T00:00:00Z',
  'legal/versions/2026-09-27-v6/'
)
on conflict (version) do update set
  terms_sha256=excluded.terms_sha256,
  privacy_sha256=excluded.privacy_sha256,
  effective_at=excluded.effective_at,
  archive_path=excluded.archive_path;

create or replace function private.snar_record_legal_acceptance()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
  tv text:=nullif(new.raw_user_meta_data->>'snar_terms_version','');
  pv text:=nullif(new.raw_user_meta_data->>'snar_privacy_version','');
  aa boolean:=coalesce((new.raw_user_meta_data->>'snar_adult_ack')::boolean,false);
  v private.snar_legal_versions%rowtype;
  eh text;
begin
  if tv in ('2026-09-27-v4','2026-09-27-v5','2026-09-27-v6') and pv=tv and aa is true then
    select * into v from private.snar_legal_versions where version=tv;
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
returns boolean language plpgsql security definer set search_path=''
as $$
declare
  uid uuid:=auth.uid();
  v private.snar_legal_versions%rowtype;
  mail text;
  eh text;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_adult_ack is not true then raise exception 'Adult acknowledgement required'; end if;
  if p_terms_version not in ('2026-09-27-v4','2026-09-27-v5','2026-09-27-v6') or p_privacy_version<>p_terms_version then
    raise exception 'Supported legal version required';
  end if;
  select * into v from private.snar_legal_versions where version=p_terms_version;
  select email into mail from auth.users where id=uid;
  eh:=case when mail is null then null else encode(extensions.digest(lower(mail),'sha256'),'hex') end;
  insert into private.snar_legal_acceptances(
    user_id,terms_version,privacy_version,adult_ack,accepted_at,email_hash,terms_sha256,privacy_sha256,retention_until
  )
  values(uid,p_terms_version,p_privacy_version,true,now(),eh,v.terms_sha256,v.privacy_sha256,now()+interval '5 years')
  on conflict (user_id,terms_version,privacy_version) do nothing;
  return true;
end;
$$;
revoke all on function public.snar_accept_current_legal(text,text,boolean) from public, anon;
grant execute on function public.snar_accept_current_legal(text,text,boolean) to authenticated;

create or replace function public.snar_admin_accounts()
returns table(
  user_id uuid,email text,created_at timestamptz,last_sign_in_at timestamptz,
  access_status text,current_legal_accepted boolean,cat_used boolean,is_admin boolean
)
language plpgsql stable security definer set search_path=''
as $$
begin
  if not private.snar_is_admin(auth.uid()) then raise exception 'Admin required'; end if;
  return query
  select
    u.id,u.email::text,u.created_at,u.last_sign_in_at,
    case when private.snar_account_is_active(u.id) then 'active'::text else 'suspended'::text end,
    exists(select 1 from private.snar_legal_acceptances a where a.user_id=u.id and a.terms_version='2026-09-27-v6' and a.privacy_version='2026-09-27-v6'),
    exists(select 1 from private.mbu_item_contributions c where c.user_id=u.id and c.session_mode='adaptive'),
    private.snar_is_admin(u.id)
  from auth.users u
  order by u.created_at desc;
end;
$$;
revoke all on function public.snar_admin_accounts() from public, anon;
grant execute on function public.snar_admin_accounts() to authenticated;
