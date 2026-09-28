alter table private.mbu_item_contributions
  add column if not exists course_id text not null default 'equipment' check (char_length(course_id) between 1 and 80),
  add column if not exists exam_id text not null default 'exam-1' check (char_length(exam_id) between 1 and 80),
  add column if not exists bank_id text not null default 'unknown' check (char_length(bank_id) between 1 and 80),
  add column if not exists topic text not null default 'Other' check (char_length(topic) between 1 and 160);

alter table public.mbu_item_calibration
  add column if not exists course_id text not null default 'equipment' check (char_length(course_id) between 1 and 80),
  add column if not exists exam_id text not null default 'exam-1' check (char_length(exam_id) between 1 and 80),
  add column if not exists bank_id text not null default 'unknown' check (char_length(bank_id) between 1 and 80),
  add column if not exists topic text not null default 'Other' check (char_length(topic) between 1 and 160);

create index if not exists mbu_item_contributions_scope_idx
  on private.mbu_item_contributions(course_id, exam_id, bank_id, topic);

create index if not exists mbu_item_calibration_scope_idx
  on public.mbu_item_calibration(course_id, exam_id, bank_id, topic);

create or replace function private.mbu_refresh_item_calibration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  q text := coalesce(new.question_id, old.question_id);
  n integer; c integer; a integer; rs integer; avg_ms integer;
  p double precision; b double precision; se double precision; conf text;
  v_course text; v_exam text; v_bank text; v_topic text;
begin
  select count(*)::integer,
         count(*) filter (where correct)::integer,
         count(*) filter (where session_mode='adaptive')::integer,
         count(response_ms)::integer,
         round(avg(response_ms))::integer,
         min(course_id),
         min(exam_id),
         min(bank_id),
         min(topic)
    into n,c,a,rs,avg_ms,v_course,v_exam,v_bank,v_topic
  from private.mbu_item_contributions
  where question_id=q;

  if n=0 then
    delete from public.mbu_item_calibration where question_id=q;
    return coalesce(new,old);
  end if;

  p := (c + 5.0) / (n + 10.0);
  b := greatest(-2.5, least(2.5, ln((1.0-p)/p)));
  se := 1.0 / sqrt(greatest(0.0001, n*p*(1.0-p)));
  conf := case when n < 25 then 'provisional' when n < 100 then 'preliminary' when n < 300 then 'moderate' else 'high' end;

  insert into public.mbu_item_calibration(
    question_id,course_id,exam_id,bank_id,topic,
    unique_learners,correct_first_attempts,incorrect_first_attempts,
    adaptive_first_attempts,response_samples,avg_response_ms,p_value,
    difficulty_logit,standard_error,confidence,updated_at
  ) values (
    q,coalesce(v_course,'equipment'),coalesce(v_exam,'exam-1'),coalesce(v_bank,'unknown'),coalesce(v_topic,'Other'),
    n,c,n-c,a,rs,avg_ms,p,b,se,conf,now()
  )
  on conflict (question_id) do update set
    course_id=excluded.course_id,exam_id=excluded.exam_id,bank_id=excluded.bank_id,topic=excluded.topic,
    unique_learners=excluded.unique_learners,correct_first_attempts=excluded.correct_first_attempts,
    incorrect_first_attempts=excluded.incorrect_first_attempts,adaptive_first_attempts=excluded.adaptive_first_attempts,
    response_samples=excluded.response_samples,avg_response_ms=excluded.avg_response_ms,p_value=excluded.p_value,
    difficulty_logit=excluded.difficulty_logit,standard_error=excluded.standard_error,
    confidence=excluded.confidence,updated_at=excluded.updated_at;

  return coalesce(new,old);
end;
$$;

revoke all on function private.mbu_refresh_item_calibration() from public, anon, authenticated;

create or replace function public.mbu_submit_item_contribution_v2(
  p_question_id text,
  p_correct boolean,
  p_response_ms integer default null,
  p_session_mode text default 'unknown',
  p_course_id text default 'equipment',
  p_exam_id text default 'exam-1',
  p_bank_id text default 'unknown',
  p_topic text default 'Other'
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  mode text := lower(coalesce(p_session_mode,'unknown'));
  course_key text := lower(trim(coalesce(p_course_id,'equipment')));
  exam_key text := lower(trim(coalesce(p_exam_id,'exam-1')));
  bank_key text := lower(trim(coalesce(p_bank_id,'unknown')));
  topic_key text := trim(coalesce(p_topic,'Other'));
  inserted_count integer;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_question_id is null or char_length(trim(p_question_id)) < 1 or char_length(trim(p_question_id)) > 160 then raise exception 'Invalid question id'; end if;
  if p_response_ms is not null and (p_response_ms < 0 or p_response_ms > 3600000) then raise exception 'Invalid response time'; end if;
  if char_length(course_key) < 1 or char_length(course_key) > 80 then raise exception 'Invalid course id'; end if;
  if char_length(exam_key) < 1 or char_length(exam_key) > 80 then raise exception 'Invalid exam id'; end if;
  if char_length(bank_key) < 1 or char_length(bank_key) > 80 then raise exception 'Invalid bank id'; end if;
  if char_length(topic_key) < 1 or char_length(topic_key) > 160 then raise exception 'Invalid topic'; end if;
  if mode not in ('standard','custom','adaptive','smart','due','missed','flagged','hazards','combined','unknown') then mode := 'unknown'; end if;

  insert into private.mbu_item_contributions(
    user_id,question_id,correct,response_ms,session_mode,course_id,exam_id,bank_id,topic
  )
  values(uid,trim(p_question_id),p_correct,p_response_ms,mode,course_key,exam_key,bank_key,topic_key)
  on conflict (user_id,question_id) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count = 1;
end;
$$;

revoke all on function public.mbu_submit_item_contribution_v2(text,boolean,integer,text,text,text,text,text) from public, anon;
grant execute on function public.mbu_submit_item_contribution_v2(text,boolean,integer,text,text,text,text,text) to authenticated;
