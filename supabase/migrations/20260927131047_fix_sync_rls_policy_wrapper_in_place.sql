
alter policy "users_select_own_active_sync_state" on public.mbu_sync_state
using ((select auth.uid())=user_id and public.snar_account_access_status()='active');

alter policy "users_insert_own_active_sync_state" on public.mbu_sync_state
with check ((select auth.uid())=user_id and public.snar_account_access_status()='active');

alter policy "users_update_own_active_sync_state" on public.mbu_sync_state
using ((select auth.uid())=user_id and public.snar_account_access_status()='active')
with check ((select auth.uid())=user_id and public.snar_account_access_status()='active');

alter policy "users_delete_own_active_sync_state" on public.mbu_sync_state
using ((select auth.uid())=user_id and public.snar_account_access_status()='active');

alter policy "users_select_own_active_sync_devices" on public.mbu_sync_devices
using ((select auth.uid())=user_id and public.snar_account_access_status()='active');

alter policy "users_insert_own_active_sync_devices" on public.mbu_sync_devices
with check ((select auth.uid())=user_id and public.snar_account_access_status()='active');

alter policy "users_update_own_active_sync_devices" on public.mbu_sync_devices
using ((select auth.uid())=user_id and public.snar_account_access_status()='active')
with check ((select auth.uid())=user_id and public.snar_account_access_status()='active');

alter policy "users_delete_own_active_sync_devices" on public.mbu_sync_devices
using ((select auth.uid())=user_id and public.snar_account_access_status()='active');

alter policy "users_select_own_active_sync_versions" on public.mbu_sync_versions
using ((select auth.uid())=user_id and public.snar_account_access_status()='active');

alter policy "Calibration aggregates are readable by active accounts at cohort threshold" on public.mbu_item_calibration
using (unique_learners>=25 and public.snar_account_access_status()='active');
