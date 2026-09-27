create table if not exists private.snar_suggestions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'idea' check (category in ('idea','bug','content','other')),
  message text not null check (char_length(message) between 3 and 1500),
  status text not null default 'new' check (status in ('new','reviewing','planned','done','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table private.snar_suggestions enable row level security;
revoke all on table private.snar_suggestions from public, anon, authenticated;

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

  insert into private.snar_suggestions(user_id,category,message)
  values(uid,normalized_category,cleaned)
  returning id into out_id;
  return out_id;
end;
$$;
revoke all on function public.snar_submit_suggestion(text,text) from public, anon;
grant execute on function public.snar_submit_suggestion(text,text) to authenticated;

create or replace function public.snar_admin_suggestions()
returns table(id bigint,category text,message text,status text,created_at timestamptz,updated_at timestamptz)
language plpgsql
stable
security definer
set search_path=''
as $$
begin
  if not private.snar_is_admin(auth.uid()) then raise exception 'Admin required'; end if;
  return query
    select s.id,s.category,s.message,s.status,s.created_at,s.updated_at
    from private.snar_suggestions s
    order by case s.status when 'new' then 0 when 'reviewing' then 1 when 'planned' then 2 when 'done' then 3 else 4 end,
             s.created_at desc;
end;
$$;
revoke all on function public.snar_admin_suggestions() from public, anon;
grant execute on function public.snar_admin_suggestions() to authenticated;

create or replace function public.snar_admin_update_suggestion(p_id bigint,p_status text)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
begin
  if not private.snar_is_admin(auth.uid()) then raise exception 'Admin required'; end if;
  if p_status not in ('new','reviewing','planned','done','declined') then raise exception 'Invalid status'; end if;
  update private.snar_suggestions
  set status=p_status,updated_at=now()
  where id=p_id;
  return found;
end;
$$;
revoke all on function public.snar_admin_update_suggestion(bigint,text) from public, anon;
grant execute on function public.snar_admin_update_suggestion(bigint,text) to authenticated;

create or replace function public.snar_admin_system_summary()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare out jsonb;
begin
  if not private.snar_is_admin(auth.uid()) then raise exception 'Admin required'; end if;
  select jsonb_build_object(
    'accounts',(select count(*) from auth.users),
    'active_accounts',(select count(*) from auth.users u where private.snar_account_is_active(u.id)),
    'suspended_accounts',(select count(*) from auth.users u where not private.snar_account_is_active(u.id)),
    'legal_acceptances',(select count(*) from private.snar_legal_acceptances),
    'privacy_requests',(select count(*) from public.snar_privacy_requests),
    'privacy_received',(select count(*) from public.snar_privacy_requests where status='received'),
    'privacy_in_review',(select count(*) from public.snar_privacy_requests where status='in_review'),
    'suggestions',(select count(*) from private.snar_suggestions),
    'new_suggestions',(select count(*) from private.snar_suggestions where status='new'),
    'item_contributions',(select count(*) from private.mbu_item_contributions),
    'calibrated_items_25',(select count(*) from public.mbu_item_calibration where unique_learners>=25),
    'sync_state_rows',(select count(*) from public.mbu_sync_state),
    'sync_history_rows',(select count(*) from public.mbu_sync_versions),
    'guest_active_15m',(select count(*) from public.snar_guest_sessions where last_seen_at>=now()-interval '15 minutes'),
    'guest_sessions_24h',(select count(*) from public.snar_guest_sessions where last_seen_at>=now()-interval '24 hours'),
    'cat_users',(select count(distinct user_id) from private.mbu_item_contributions where session_mode='adaptive'),
    'adaptive_first_attempts',(select count(*) from private.mbu_item_contributions where session_mode='adaptive')
  ) into out;
  return out;
end;
$$;
revoke all on function public.snar_admin_system_summary() from public, anon;
grant execute on function public.snar_admin_system_summary() to authenticated;
