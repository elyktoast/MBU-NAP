create or replace function public.snar_admin_retention_cleanup()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  sync_deleted integer:=0;
  privacy_deleted integer:=0;
  legal_deleted integer:=0;
  guest_deleted integer:=0;
  question_reports_deleted integer:=0;
begin
  if not private.snar_is_admin(auth.uid()) then raise exception 'Admin required'; end if;

  delete from public.mbu_sync_versions where saved_at<now()-interval '90 days';
  get diagnostics sync_deleted=row_count;

  delete from public.snar_privacy_requests
  where status in ('completed','denied') and updated_at<now()-interval '3 years';
  get diagnostics privacy_deleted=row_count;

  delete from private.snar_legal_acceptances where retention_until<now();
  get diagnostics legal_deleted=row_count;

  delete from private.snar_guest_sessions where last_seen_at<now()-interval '24 hours';
  get diagnostics guest_deleted=row_count;

  delete from private.snar_question_reports
  where status in ('fixed','declined') and updated_at<now()-interval '2 years';
  get diagnostics question_reports_deleted=row_count;

  return jsonb_build_object(
    'sync_history_deleted',sync_deleted,
    'privacy_requests_deleted',privacy_deleted,
    'legal_acceptances_deleted',legal_deleted,
    'guest_sessions_deleted',guest_deleted,
    'question_reports_deleted',question_reports_deleted,
    'ran_at',now()
  );
end;
$$;
revoke all on function public.snar_admin_retention_cleanup() from public, anon;
grant execute on function public.snar_admin_retention_cleanup() to authenticated;
