create or replace function public.snar_admin_question_analytics(
  p_limit integer default 500,
  p_review_only boolean default false
)
returns table(
  question_id text,
  unique_learners integer,
  correct_first_attempts integer,
  incorrect_first_attempts integer,
  first_attempt_accuracy integer,
  adaptive_first_attempts integer,
  response_samples integer,
  avg_response_ms integer,
  difficulty_logit double precision,
  standard_error double precision,
  confidence text,
  report_count integer,
  open_report_count integer,
  maturity text,
  review_signal text,
  needs_review boolean,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path=''
as $$
begin
  if not private.snar_is_admin(auth.uid()) then
    raise exception 'Admin required';
  end if;
  return query
  with report_counts as (
    select r.question_uid,
           count(*)::integer as report_count,
           count(*) filter (where r.status in ('new','reviewing'))::integer as open_report_count
    from private.snar_question_reports r
    group by r.question_uid
  ),
  items as (
    select
      coalesce(c.question_id,rc.question_uid) as question_id,
      coalesce(c.unique_learners,0)::integer as unique_learners,
      coalesce(c.correct_first_attempts,0)::integer as correct_first_attempts,
      coalesce(c.incorrect_first_attempts,0)::integer as incorrect_first_attempts,
      case when coalesce(c.unique_learners,0)>0 then round(100.0*c.correct_first_attempts/c.unique_learners)::integer else null end as first_attempt_accuracy,
      coalesce(c.adaptive_first_attempts,0)::integer as adaptive_first_attempts,
      coalesce(c.response_samples,0)::integer as response_samples,
      c.avg_response_ms,c.difficulty_logit,c.standard_error,
      coalesce(c.confidence,'unmeasured') as confidence,
      coalesce(rc.report_count,0)::integer as report_count,
      coalesce(rc.open_report_count,0)::integer as open_report_count,
      case when coalesce(c.unique_learners,0)>=300 then 'high'
           when coalesce(c.unique_learners,0)>=100 then 'moderate'
           when coalesce(c.unique_learners,0)>=25 then 'preliminary'
           when coalesce(c.unique_learners,0)>=5 then 'early'
           when coalesce(c.unique_learners,0)>=1 then 'collecting'
           else 'unmeasured' end as maturity,
      case when coalesce(rc.open_report_count,0)>0 then 'reported'
           when coalesce(c.unique_learners,0)>=25 and (100.0*c.correct_first_attempts/c.unique_learners)<=40 then 'high_miss'
           when coalesce(c.unique_learners,0)>=25 and (100.0*c.correct_first_attempts/c.unique_learners)>=95 then 'very_easy'
           else 'none' end as review_signal,
      (coalesce(rc.open_report_count,0)>0
       or (coalesce(c.unique_learners,0)>=25 and (100.0*c.correct_first_attempts/c.unique_learners)<=40)
       or (coalesce(c.unique_learners,0)>=25 and (100.0*c.correct_first_attempts/c.unique_learners)>=95)) as needs_review,
      coalesce(c.updated_at,now()) as updated_at
    from public.mbu_item_calibration c
    full outer join report_counts rc on rc.question_uid=c.question_id
  )
  select i.question_id,i.unique_learners,i.correct_first_attempts,i.incorrect_first_attempts,
         i.first_attempt_accuracy,i.adaptive_first_attempts,i.response_samples,i.avg_response_ms,
         i.difficulty_logit,i.standard_error,i.confidence,i.report_count,i.open_report_count,
         i.maturity,i.review_signal,i.needs_review,i.updated_at
  from items i
  where not p_review_only or i.needs_review
  order by i.needs_review desc,i.open_report_count desc,i.unique_learners desc,
           i.first_attempt_accuracy asc nulls last,i.question_id
  limit greatest(1,least(coalesce(p_limit,500),2000));
end;
$$;
revoke all on function public.snar_admin_question_analytics(integer,boolean) from public,anon;
grant execute on function public.snar_admin_question_analytics(integer,boolean) to authenticated;
