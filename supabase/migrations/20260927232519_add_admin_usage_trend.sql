create or replace function public.snar_admin_usage_trend(p_days integer default 30)
returns table(
  day date,
  first_attempts bigint,
  adaptive_first_attempts bigint,
  accuracy integer,
  response_samples bigint,
  avg_response_ms integer
)
language plpgsql
stable
security definer
set search_path=''
as $$
begin
  if not private.snar_is_admin(auth.uid()) then raise exception 'Admin required'; end if;
  return query
  select c.answered_at::date,
         count(*)::bigint,
         count(*) filter (where c.session_mode='adaptive')::bigint,
         round(100.0*avg(case when c.correct then 1 else 0 end))::integer,
         count(c.response_ms)::bigint,
         round(avg(c.response_ms))::integer
  from private.mbu_item_contributions c
  where c.answered_at >= current_date - (greatest(1,least(coalesce(p_days,30),90))-1) * interval '1 day'
  group by c.answered_at::date
  order by c.answered_at::date;
end;
$$;
revoke all on function public.snar_admin_usage_trend(integer) from public,anon;
grant execute on function public.snar_admin_usage_trend(integer) to authenticated;
