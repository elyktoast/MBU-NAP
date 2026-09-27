alter table private.snar_suggestions drop column if exists user_id;

create or replace function public.snar_submit_suggestion(p_category text, p_message text)
returns bigint
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid := auth.uid();
  normalized_category text := lower(trim(coalesce(p_category,'idea')));
  cleaned text := trim(coalesce(p_message,''));
  out_id bigint;
begin
  if uid is null then raise exception 'Sign in to submit a suggestion.'; end if;
  if not private.snar_account_is_active(uid) then raise exception 'Account access suspended'; end if;
  if normalized_category not in ('idea','bug','content','other') then normalized_category := 'other'; end if;
  if char_length(cleaned) < 3 then raise exception 'Suggestion is too short.'; end if;
  if char_length(cleaned) > 1500 then raise exception 'Suggestion must be 1500 characters or fewer.'; end if;
  insert into private.snar_suggestions(category,message)
  values(normalized_category,cleaned)
  returning id into out_id;
  return out_id;
end;
$$;
revoke all on function public.snar_submit_suggestion(text,text) from public, anon;
grant execute on function public.snar_submit_suggestion(text,text) to authenticated;
