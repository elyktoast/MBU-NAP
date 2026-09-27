create or replace function public.snar_submit_question_report(p_report jsonb) returns bigint language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); rid bigint; r text:=trim(coalesce(p_report->>'reason','')); qid text:=trim(coalesce(p_report->>'uid','')); b text:=trim(coalesce(p_report->>'bank','')); s text:=trim(coalesce(p_report->>'stem','')); c text:=trim(coalesce(p_report->>'comment',''));
begin
if uid is null then raise exception 'Authentication required'; end if;
if not private.snar_account_is_active(uid) then raise exception 'Account access suspended'; end if;
if r not in ('Wrong answer','Ambiguous question','Typo / wording','Explanation issue','Source / citation issue','Image / figure issue','Other') then raise exception 'Invalid report reason'; end if;
if char_length(qid)<1 or char_length(qid)>160 then raise exception 'Invalid question id'; end if;
if char_length(b)<1 or char_length(b)>80 then raise exception 'Invalid bank'; end if;
if char_length(s)<1 or char_length(s)>4000 then raise exception 'Invalid question stem'; end if;
if char_length(c)<1 or char_length(c)>2000 then raise exception 'Invalid report comment'; end if;
if exists(select 1 from private.snar_question_reports where question_uid=qid and reason=r and comment=c and created_at>=now()-interval '5 minutes') then raise exception 'This report was already submitted recently.'; end if;
if (select count(*) from private.snar_question_reports where created_at>=now()-interval '10 minutes')>=100 then raise exception 'Question reporting is temporarily busy. Try again shortly.'; end if;
insert into private.snar_question_reports(reason,question_uid,bank,bank_label,set_label,question_number,topic,stem,options,answer_indexes,answer_text,selected_indexes,selected_text,explanation,source,page,page_url,build,comment)
values(r,qid,b,left(coalesce(p_report->>'bankLabel',''),200),left(coalesce(p_report->>'set',''),80),left(coalesce(p_report->>'questionNumber',''),80),left(coalesce(p_report->>'topic',''),200),s,
case when jsonb_typeof(p_report->'options')='array' then p_report->'options' else '[]'::jsonb end,
case when jsonb_typeof(p_report->'answerIndexes')='array' then p_report->'answerIndexes' else '[]'::jsonb end,
case when jsonb_typeof(p_report->'answerText')='array' then p_report->'answerText' else '[]'::jsonb end,
case when jsonb_typeof(p_report->'selectedIndexes')='array' then p_report->'selectedIndexes' else '[]'::jsonb end,
case when jsonb_typeof(p_report->'selectedText')='array' then p_report->'selectedText' else '[]'::jsonb end,
left(coalesce(p_report->>'explanation',''),8000),left(coalesce(p_report->>'source',''),2000),left(coalesce(p_report->>'page',''),200),left(coalesce(p_report->>'pageUrl',''),1000),left(coalesce(p_report->>'build',''),200),c) returning id into rid; return rid;
end;$$;
revoke all on function public.snar_submit_question_report(jsonb) from public,anon;
grant execute on function public.snar_submit_question_report(jsonb) to authenticated;
