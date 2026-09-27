create schema if not exists private;

create table if not exists private.mbu_item_contributions (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null check (char_length(question_id) between 1 and 160),
  correct boolean not null,
  response_ms integer null check (response_ms is null or response_ms between 0 and 3600000),
  session_mode text not null default 'unknown'
    check (session_mode in ('standard','custom','adaptive','smart','due','missed','flagged','hazards','combined','unknown')),
  answered_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create index if not exists mbu_item_contributions_question_id_idx
  on private.mbu_item_contributions(question_id);

revoke all on schema private from public, anon, authenticated;
revoke all on table private.mbu_item_contributions from public, anon, authenticated;

create table if not exists public.mbu_item_calibration (
  question_id text primary key check (char_length(question_id) between 1 and 160),
  unique_learners integer not null default 0 check (unique_learners >= 0),
  correct_first_attempts integer not null default 0 check (correct_first_attempts >= 0),
  incorrect_first_attempts integer not null default 0 check (incorrect_first_attempts >= 0),
  adaptive_first_attempts integer not null default 0 check (adaptive_first_attempts >= 0),
  response_samples integer not null default 0 check (response_samples >= 0),
  avg_response_ms integer null check (avg_response_ms is null or avg_response_ms >= 0),
  p_value double precision not null default 0.5 check (p_value > 0 and p_value < 1),
  difficulty_logit double precision not null default 0,
  standard_error double precision not null default 1,
  confidence text not null default 'provisional'
    check (confidence in ('provisional','preliminary','moderate','high')),
  updated_at timestamptz not null default now()
);

alter table public.mbu_item_calibration enable row level security;
drop policy if exists "Calibration aggregates are readable" on public.mbu_item_calibration;
create policy "Calibration aggregates are readable"
  on public.mbu_item_calibration
  for select
  to authenticated
  using (true);

revoke all on table public.mbu_item_calibration from public, anon, authenticated;
grant select on table public.mbu_item_calibration to authenticated;

create or replace function private.mbu_refresh_item_calibration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  q text := coalesce(new.question_id, old.question_id);
  n integer;
  c integer;
  a integer;
  rs integer;
  avg_ms integer;
  p double precision;
  b double precision;
  se double precision;
  conf text;
begin
  select count(*)::integer,
         count(*) filter (where correct)::integer,
         count(*) filter (where session_mode='adaptive')::integer,
         count(response_ms)::integer,
         round(avg(response_ms))::integer
    into n,c,a,rs,avg_ms
  from private.mbu_item_contributions
  where question_id=q;

  if n=0 then
    delete from public.mbu_item_calibration where question_id=q;
    return coalesce(new,old);
  end if;

  p := (c + 5.0) / (n + 10.0);
  b := greatest(-2.5, least(2.5, ln((1.0-p)/p)));
  se := 1.0 / sqrt(greatest(0.0001, n*p*(1.0-p)));
  conf := case
    when n < 25 then 'provisional'
    when n < 100 then 'preliminary'
    when n < 300 then 'moderate'
    else 'high'
  end;

  insert into public.mbu_item_calibration(
    question_id,unique_learners,correct_first_attempts,incorrect_first_attempts,
    adaptive_first_attempts,response_samples,avg_response_ms,p_value,
    difficulty_logit,standard_error,confidence,updated_at
  ) values (
    q,n,c,n-c,a,rs,avg_ms,p,b,se,conf,now()
  )
  on conflict (question_id) do update set
    unique_learners=excluded.unique_learners,
    correct_first_attempts=excluded.correct_first_attempts,
    incorrect_first_attempts=excluded.incorrect_first_attempts,
    adaptive_first_attempts=excluded.adaptive_first_attempts,
    response_samples=excluded.response_samples,
    avg_response_ms=excluded.avg_response_ms,
    p_value=excluded.p_value,
    difficulty_logit=excluded.difficulty_logit,
    standard_error=excluded.standard_error,
    confidence=excluded.confidence,
    updated_at=excluded.updated_at;

  return coalesce(new,old);
end;
$$;

revoke all on function private.mbu_refresh_item_calibration() from public, anon, authenticated;

drop trigger if exists mbu_refresh_item_calibration_after_change on private.mbu_item_contributions;
create trigger mbu_refresh_item_calibration_after_change
after insert or delete on private.mbu_item_contributions
for each row execute function private.mbu_refresh_item_calibration();

create or replace function public.mbu_submit_item_contribution(
  p_question_id text,
  p_correct boolean,
  p_response_ms integer default null,
  p_session_mode text default 'unknown'
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  mode text := lower(coalesce(p_session_mode,'unknown'));
  inserted_count integer;
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;
  if p_question_id is null or char_length(trim(p_question_id)) < 1 or char_length(trim(p_question_id)) > 160 then
    raise exception 'Invalid question id';
  end if;
  if p_response_ms is not null and (p_response_ms < 0 or p_response_ms > 3600000) then
    raise exception 'Invalid response time';
  end if;
  if mode not in ('standard','custom','adaptive','smart','due','missed','flagged','hazards','combined','unknown') then
    mode := 'unknown';
  end if;

  insert into private.mbu_item_contributions(user_id,question_id,correct,response_ms,session_mode)
  values(uid,trim(p_question_id),p_correct,p_response_ms,mode)
  on conflict (user_id,question_id) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count = 1;
end;
$$;

revoke all on function public.mbu_submit_item_contribution(text,boolean,integer,text) from public, anon;
grant execute on function public.mbu_submit_item_contribution(text,boolean,integer,text) to authenticated;
