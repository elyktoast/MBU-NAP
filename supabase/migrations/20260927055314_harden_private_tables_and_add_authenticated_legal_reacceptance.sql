
alter table private.mbu_item_contributions enable row level security;
alter table private.snar_legal_acceptances enable row level security;

alter table private.snar_legal_acceptances
  drop constraint if exists snar_legal_acceptances_pkey;
alter table private.snar_legal_acceptances
  add constraint snar_legal_acceptances_pkey
  primary key (user_id, terms_version, privacy_version);

create or replace function private.snar_record_legal_acceptance()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  tv text := nullif(new.raw_user_meta_data->>'snar_terms_version','');
  pv text := nullif(new.raw_user_meta_data->>'snar_privacy_version','');
  aa boolean := coalesce((new.raw_user_meta_data->>'snar_adult_ack')::boolean,false);
  at timestamptz;
begin
  begin
    at := (new.raw_user_meta_data->>'snar_accepted_at')::timestamptz;
  exception when others then
    at := null;
  end;
  if tv is not null and pv is not null and aa is true then
    insert into private.snar_legal_acceptances(user_id,terms_version,privacy_version,adult_ack,accepted_at)
    values(new.id,tv,pv,true,coalesce(at,now()))
    on conflict (user_id,terms_version,privacy_version) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function private.snar_record_legal_acceptance() from public, anon, authenticated;

create or replace function public.snar_has_current_legal_acceptance(
  p_terms_version text,
  p_privacy_version text
)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1
    from private.snar_legal_acceptances
    where user_id = auth.uid()
      and terms_version = p_terms_version
      and privacy_version = p_privacy_version
      and adult_ack is true
  );
$$;

revoke all on function public.snar_has_current_legal_acceptance(text,text) from public, anon;
grant execute on function public.snar_has_current_legal_acceptance(text,text) to authenticated;

create or replace function public.snar_accept_current_legal(
  p_terms_version text,
  p_privacy_version text,
  p_adult_ack boolean
)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;
  if p_adult_ack is not true then
    raise exception 'Adult acknowledgement required';
  end if;
  if nullif(trim(p_terms_version),'') is null or nullif(trim(p_privacy_version),'') is null then
    raise exception 'Legal version required';
  end if;

  insert into private.snar_legal_acceptances(
    user_id,terms_version,privacy_version,adult_ack,accepted_at
  )
  values(uid,trim(p_terms_version),trim(p_privacy_version),true,now())
  on conflict (user_id,terms_version,privacy_version) do nothing;

  return true;
end;
$$;

revoke all on function public.snar_accept_current_legal(text,text,boolean) from public, anon;
grant execute on function public.snar_accept_current_legal(text,text,boolean) to authenticated;
