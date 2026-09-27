create table if not exists private.snar_legal_acceptances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  adult_ack boolean not null,
  accepted_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

revoke all on table private.snar_legal_acceptances from public, anon, authenticated;

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
  if tv is not null and pv is not null and aa is true and at is not null then
    insert into private.snar_legal_acceptances(user_id,terms_version,privacy_version,adult_ack,accepted_at)
    values(new.id,tv,pv,true,at)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function private.snar_record_legal_acceptance() from public, anon, authenticated;

drop trigger if exists snar_record_legal_acceptance_on_signup on auth.users;
create trigger snar_record_legal_acceptance_on_signup
after insert on auth.users
for each row execute function private.snar_record_legal_acceptance();
