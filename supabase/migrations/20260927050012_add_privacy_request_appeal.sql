alter table public.snar_privacy_requests
    drop constraint if exists snar_privacy_requests_request_type_check;
  alter table public.snar_privacy_requests
    add constraint snar_privacy_requests_request_type_check
    check (request_type in ('access','correction','deletion','appeal','other'));
