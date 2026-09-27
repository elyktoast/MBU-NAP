
drop policy if exists "Calibration aggregates are readable" on public.mbu_item_calibration;
create policy "Calibration aggregates are readable at cohort threshold"
  on public.mbu_item_calibration
  for select
  to authenticated
  using (unique_learners >= 25);
