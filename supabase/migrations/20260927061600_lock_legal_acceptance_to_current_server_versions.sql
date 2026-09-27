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
begin
  if tv='2026-09-27-v2' and pv='2026-09-27-v2' and aa is true then
    insert into private.snar_legal_acceptances(user_id,terms_version,privacy_version,adult_ack,accepted_at)
    values(new.id,tv,pv,true,now())
    on conflict (user_id,terms_version,privacy_version) do nothing;
  end if;
  return new;
end;
$$;

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
  if uid is null then raise exception 'Authentication required'; end if;
  if p_adult_ack is not true then raise exception 'Adult acknowledgement required'; end if;
  if p_terms_version <> '2026-09-27-v2' or p_privacy_version <> '2026-09-27-v2' then
    raise exception 'Current legal version required';
  end if;

  insert into private.snar_legal_acceptances(
    user_id,terms_version,privacy_version,adult_ack,accepted_at
  )
  values(uid,'2026-09-27-v2','2026-09-27-v2',true,now())
  on conflict (user_id,terms_version,privacy_version) do nothing;

  return true;
end;
$$;

revoke all on function private.snar_record_legal_acceptance() from public, anon, authenticated;
revoke all on function public.snar_accept_current_legal(text,text,boolean) from public, anon;
grant execute on function public.snar_accept_current_legal(text,text,boolean) to authenticated;
