
create or replace function public.snar_delete_my_account()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;
  delete from auth.users where id = uid;
  return true;
end;
$$;

revoke all on function public.snar_delete_my_account() from public, anon;
grant execute on function public.snar_delete_my_account() to authenticated;
