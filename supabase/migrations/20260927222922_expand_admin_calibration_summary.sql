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
    'calibrated_items_any',(select count(*) from public.mbu_item_calibration where unique_learners>=1),
    'calibrated_items_2',(select count(*) from public.mbu_item_calibration where unique_learners>=2),
    'calibrated_items_5',(select count(*) from public.mbu_item_calibration where unique_learners>=5),
    'calibrated_items_25',(select count(*) from public.mbu_item_calibration where unique_learners>=25),
    'calibration_max_learners',(select coalesce(max(unique_learners),0) from public.mbu_item_calibration),
    'calibration_first_attempts',(select coalesce(sum(correct_first_attempts+incorrect_first_attempts),0) from public.mbu_item_calibration),
    'sync_state_rows',(select count(*) from public.mbu_sync_state),
    'sync_history_rows',(select count(*) from public.mbu_sync_versions),
    'guest_active_15m',(select count(*) from private.snar_guest_sessions where last_seen_at>=now()-interval '15 minutes'),
    'guest_sessions_24h',(select count(*) from private.snar_guest_sessions where last_seen_at>=now()-interval '24 hours'),
    'cat_users',(select count(distinct user_id) from private.mbu_item_contributions where session_mode='adaptive'),
    'adaptive_first_attempts',(select count(*) from private.mbu_item_contributions where session_mode='adaptive')
  ) into out;
  return out;
end;
$$;
revoke all on function public.snar_admin_system_summary() from public, anon;
grant execute on function public.snar_admin_system_summary() to authenticated;
