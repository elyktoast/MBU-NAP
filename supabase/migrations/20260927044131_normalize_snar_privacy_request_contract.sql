
alter table public.snar_privacy_requests drop constraint if exists snar_privacy_requests_request_type_check;
alter table public.snar_privacy_requests add constraint snar_privacy_requests_request_type_check
  check (request_type in ('access','correction','export','deletion','other'));
alter table public.snar_privacy_requests drop constraint if exists snar_privacy_requests_details_check;
alter table public.snar_privacy_requests add constraint snar_privacy_requests_details_check
  check (char_length(details) <= 4000);
