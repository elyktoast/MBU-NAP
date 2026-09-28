update private.mbu_item_contributions
set bank_id = case
  when question_id like 'b1-%' then 'b1'
  when question_id like 'b2-%' then 'b2'
  when question_id like 'b3-%' then 'b3'
  when question_id like 'combined-%' then 'combined'
  when question_id like 'h1-%' then 'h1'
  when question_id like 'h2-%' then 'h2'
  when question_id like 'h3-%' then 'h3'
  when question_id like 'hh-%' then 'hh'
  else bank_id
end
where course_id='equipment' and exam_id='exam-1' and bank_id='unknown';

update public.mbu_item_calibration
set bank_id = case
  when question_id like 'b1-%' then 'b1'
  when question_id like 'b2-%' then 'b2'
  when question_id like 'b3-%' then 'b3'
  when question_id like 'combined-%' then 'combined'
  when question_id like 'h1-%' then 'h1'
  when question_id like 'h2-%' then 'h2'
  when question_id like 'h3-%' then 'h3'
  when question_id like 'hh-%' then 'hh'
  else bank_id
end
where course_id='equipment' and exam_id='exam-1' and bank_id='unknown';
