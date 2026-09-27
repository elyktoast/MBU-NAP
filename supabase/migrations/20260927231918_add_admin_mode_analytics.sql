create or replace function public.snar_admin_mode_analytics()
returns table(
  session_mode text,
  first_attempts bigint,
  first_attempts_7d bigint,
  first_attempts_30d bigint,
  unique_users bigint,
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
  select c.session_mode,
         count(*)::bigint,
         count(*) filter (where c.answered_at>=now()-interval '7 days')::bigint,
         count(*) filter (where c.answered_at>=now()-interval '30 days')::bigint,
         count(distinct c.user_id)::bigint,
         round(100.0*avg(case when c.correct then 1 else 0 end))::integer,
         count(c.response_ms)::bigint,
         round(avg(c.response_ms))::integer
  from private.mbu_item_contributions c
  group by c.session_mode
  order by count(*) desc,c.session_mode;
end;
$$;
revoke all on function public.snar_admin_mode_analytics() from public,anon;
grant execute on function public.snar_admin_mode_analytics() to authenticated;
