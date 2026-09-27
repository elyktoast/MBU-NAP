alter table public.snar_privacy_requests
  drop constraint if exists snar_privacy_requests_request_type_check,
  drop constraint if exists snar_privacy_requests_details_check;

alter table public.snar_privacy_requests
  alter column details set default '',
  alter column details set not null;

update public.snar_privacy_requests set details='' where details is null;
delete from public.snar_privacy_requests where request_type='export';

alter table public.snar_privacy_requests
  add constraint snar_privacy_requests_request_type_check
    check (request_type in ('access','correction','deletion','other')),
  add constraint snar_privacy_requests_details_check
    check (char_length(details) <= 4000);
