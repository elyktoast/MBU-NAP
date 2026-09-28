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
         coalesce(min(course_id) filter (where course_id <> ''),'equipment'),
         coalesce(min(exam_id) filter (where exam_id <> ''),'exam-1'),
         coalesce(min(bank_id) filter (where bank_id <> 'unknown'),'unknown'),
         coalesce(min(topic) filter (where topic <> 'Other'),'Other')
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
    q,v_course,v_exam,v_bank,v_topic,n,c,n-c,a,rs,avg_ms,p,b,se,conf,now()
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
