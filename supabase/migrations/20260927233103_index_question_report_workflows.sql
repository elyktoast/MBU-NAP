create index if not exists snar_question_reports_question_uid_idx
  on private.snar_question_reports(question_uid);

create index if not exists snar_question_reports_status_updated_idx
  on private.snar_question_reports(status,updated_at);
