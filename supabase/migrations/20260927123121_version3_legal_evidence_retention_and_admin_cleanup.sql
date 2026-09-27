
create table if not exists private.snar_legal_versions (
  version text primary key,
  terms_sha256 text not null check (char_length(terms_sha256)=64),
  privacy_sha256 text not null check (char_length(privacy_sha256)=64),
  effective_at timestamptz not null,
  archive_path text not null
);
alter table private.snar_legal_versions enable row level security;
revoke all on table private.snar_legal_versions from public, anon, authenticated;

insert into private.snar_legal_versions(version,terms_sha256,privacy_sha256,effective_at,archive_path)
values
 ('2026-09-27-v2','5064eab141c046e71757ae95ada6998111499bd69dd57f18ee923b0900654d5b','c9bd8b0d11868a0e8ec73d0e37acc27e3047942f0b22f0fdfc66ca6d057cab92','2026-09-27T00:00:00Z','legal/versions/2026-09-27-v2/'),
 ('2026-09-27-v3','69c28d6881e3493e6e83258365aa778ae19bef7454a4c1843e4cf8c1301ded1e','83c451ff71b9ce8e22f80e471030c6e8ca18de9f81098b6a9cbb087e396098d6','2026-09-27T00:00:00Z','legal/versions/2026-09-27-v3/')
on conflict (version) do update set
 terms_sha256=excluded.terms_sha256,
 privacy_sha256=excluded.privacy_sha256,
 effective_at=excluded.effective_at,
 archive_path=excluded.archive_path;

alter table private.snar_legal_acceptances
  add column if not exists email_hash text,
  add column if not exists terms_sha256 text,
  add column if not exists privacy_sha256 text,
  add column if not exists retention_until timestamptz;

update private.snar_legal_acceptances a
set email_hash=case when u.email is null then null else encode(extensions.digest(lower(u.email),'sha256'),'hex') end,
    terms_sha256=coalesce(a.terms_sha256,v.terms_sha256),
    privacy_sha256=coalesce(a.privacy_sha256,v.privacy_sha256),
    retention_until=coalesce(a.retention_until,greatest(a.accepted_at,a.recorded_at)+interval '5 years')
from auth.users u, private.snar_legal_versions v
where a.user_id=u.id and v.version=a.terms_version;

alter table private.snar_legal_acceptances
  drop constraint if exists snar_legal_acceptances_user_id_fkey;

alter table private.snar_legal_acceptances
  alter column terms_sha256 set not null,
  alter column privacy_sha256 set not null,
  alter column retention_until set not null;

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
  if tv='2026-09-27-v3' and pv='2026-09-27-v3' and aa is true then
    select * into v from private.snar_legal_versions where version='2026-09-27-v3';
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
  if p_terms_version<>'2026-09-27-v3' or p_privacy_version<>'2026-09-27-v3' then
    raise exception 'Current legal version required';
  end if;
  select * into v from private.snar_legal_versions where version='2026-09-27-v3';
  select email into mail from auth.users where id=uid;
  eh:=case when mail is null then null else encode(extensions.digest(lower(mail),'sha256'),'hex') end;
  insert into private.snar_legal_acceptances(
    user_id,terms_version,privacy_version,adult_ack,accepted_at,email_hash,terms_sha256,privacy_sha256,retention_until
  )
  values(uid,'2026-09-27-v3','2026-09-27-v3',true,now(),eh,v.terms_sha256,v.privacy_sha256,now()+interval '5 years')
  on conflict (user_id,terms_version,privacy_version) do nothing;
  return true;
end;
$$;
revoke all on function public.snar_accept_current_legal(text,text,boolean) from public, anon;
grant execute on function public.snar_accept_current_legal(text,text,boolean) to authenticated;

drop function if exists public.snar_admin_legal_acceptances();

create function public.snar_admin_legal_acceptances()
returns table(
  user_id uuid,email_hash text,terms_version text,privacy_version text,
  terms_sha256 text,privacy_sha256 text,adult_ack boolean,
  accepted_at timestamptz,recorded_at timestamptz,retention_until timestamptz
)
language plpgsql stable security definer set search_path=''
as $$
begin
  if not private.snar_is_admin(auth.uid()) then raise exception 'Admin required'; end if;
  return query
  select a.user_id,a.email_hash,a.terms_version,a.privacy_version,a.terms_sha256,a.privacy_sha256,
         a.adult_ack,a.accepted_at,a.recorded_at,a.retention_until
  from private.snar_legal_acceptances a
  order by a.recorded_at desc;
end;
$$;
revoke all on function public.snar_admin_legal_acceptances() from public, anon;
grant execute on function public.snar_admin_legal_acceptances() to authenticated;

create or replace function public.snar_admin_retention_cleanup()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare sync_deleted integer:=0;privacy_deleted integer:=0;legal_deleted integer:=0;
begin
  if not private.snar_is_admin(auth.uid()) then raise exception 'Admin required'; end if;
  delete from public.mbu_sync_versions where saved_at<now()-interval '90 days';
  get diagnostics sync_deleted=row_count;
  delete from public.snar_privacy_requests where status in ('completed','denied') and updated_at<now()-interval '3 years';
  get diagnostics privacy_deleted=row_count;
  delete from private.snar_legal_acceptances where retention_until<now();
  get diagnostics legal_deleted=row_count;
  return jsonb_build_object(
    'sync_history_deleted',sync_deleted,
    'privacy_requests_deleted',privacy_deleted,
    'legal_acceptances_deleted',legal_deleted,
    'ran_at',now()
  );
end;
$$;
revoke all on function public.snar_admin_retention_cleanup() from public, anon;
grant execute on function public.snar_admin_retention_cleanup() to authenticated;
