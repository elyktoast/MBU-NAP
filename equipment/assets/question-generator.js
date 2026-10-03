/* Provider-neutral question generation framework. Disabled until a generation provider is explicitly chosen. */
(()=>{'use strict';
const ctx=window.MBU_CONTEXT||{},courseId=String(ctx.courseId||''),examId=String(ctx.examId||''),STORE=courseId==='equipment'&&examId==='exam-1'?'mbu_generated_questions_v1':`mbu_generated_questions_${courseId}_${examId}_v1`,SCHEMA=1,providers=new Map();
const now=()=>Date.now();
const safeJSON=(raw,fallback)=>{try{return JSON.parse(raw)??fallback}catch{return fallback}};
const id=()=>{try{return crypto.randomUUID()}catch{return 'gen-'+now().toString(36)+'-'+Math.random().toString(36).slice(2)}};
const blank=()=>({schema:SCHEMA,updatedAt:0,drafts:[],approved:[]});
function state(){const s=safeJSON(localStorage.getItem(STORE),blank());return s&&Number(s.schema)===SCHEMA?s:blank()}
function save(s){s={...s,schema:SCHEMA,updatedAt:now()};localStorage.setItem(STORE,JSON.stringify(s));window.MBUAppCore?.touchStore?.(STORE);return s}
function enabled(){
  const f=window.MBU_FEATURES?.questionGenerator;
  return f===true||f?.enabled===true
}
function normalizeQuestion(q={},meta={}){
  const options=Array.isArray(q.options)?q.options.map(x=>String(x??'').trim()):[];
  const raw=Array.isArray(q.answer)?q.answer:[q.answer],answer=raw.map(Number).filter(Number.isInteger);
  return{
    id:String(q.id||id()),status:String(q.status||'draft'),createdAt:Number(q.createdAt)||now(),updatedAt:now(),
    stem:String(q.stem||q.question||'').trim(),options,answer,type:q.type==='multi'?'multi':'single',
    explanation:String(q.explanation||q.rationale||'').trim(),topic:String(q.topic||meta.topic||'Generated').trim()||'Generated',
    citation:String(q.citation||meta.citation||'').trim(),sourceExcerpt:String(q.sourceExcerpt||meta.sourceExcerpt||'').trim(),
    sourceName:String(q.sourceName||meta.sourceName||'').trim(),difficulty:String(q.difficulty||meta.difficulty||'').trim(),
    provider:String(q.provider||meta.provider||'').trim(),generated:true
  }
}
function validateQuestion(q){
  const errors=[];
  if(!q.stem)errors.push('Question stem is required.');
  if(!Array.isArray(q.options)||q.options.length<2)errors.push('At least two answer choices are required.');
  if(q.options?.some(x=>!String(x).trim()))errors.push('Answer choices cannot be blank.');
  if(new Set((q.options||[]).map(x=>String(x).trim().toLowerCase())).size!==(q.options||[]).length)errors.push('Answer choices must be unique.');
  if(!Array.isArray(q.answer)||!q.answer.length||q.answer.some(i=>!Number.isInteger(i)||i<0||i>=q.options.length))errors.push('Correct answer indexes are invalid.');
  if(q.type==='single'&&q.answer.length!==1)errors.push('Single-answer questions must have one keyed answer.');
  if(q.type==='multi'&&q.answer.length<2)errors.push('Multi-answer questions must have at least two keyed answers.');
  if(!q.explanation)errors.push('An explanation is required before approval.');
  if(!q.sourceExcerpt&&!q.citation)errors.push('A source excerpt or citation is required before approval.');
  return errors
}
function registerProvider(name,provider){
  if(!name||!provider||typeof provider.generate!=='function')throw Error('Generator provider must implement generate(request).');
  providers.set(String(name),provider);return true
}
function providerNames(){return [...providers.keys()]}
async function generate(name,request){
  if(!enabled())throw Error('Question generation is not enabled.');
  const provider=providers.get(String(name));if(!provider)throw Error('Question generator provider is not configured: '+name);
  const material=String(request?.material||'').trim();if(!material)throw Error('Source material is required.');
  const out=await provider.generate({...request,material});
  const raw=Array.isArray(out)?out:(out?.questions||[]);
  if(!Array.isArray(raw))throw Error('Generator returned an invalid question list.');
  const drafts=raw.map(q=>normalizeQuestion(q,{provider:name,sourceName:request?.sourceName,difficulty:request?.difficulty,citation:request?.citation}));
  const s=state();s.drafts.push(...drafts);save(s);return drafts
}
function addDraft(q,meta={}){const s=state(),draft=normalizeQuestion(q,meta);s.drafts.push(draft);save(s);return draft}
function updateDraft(questionId,patch={}){
  const s=state(),i=s.drafts.findIndex(q=>q.id===questionId);if(i<0)throw Error('Generated draft not found.');
  s.drafts[i]=normalizeQuestion({...s.drafts[i],...patch,id:questionId,createdAt:s.drafts[i].createdAt});save(s);return s.drafts[i]
}
function rejectDraft(questionId){const s=state(),before=s.drafts.length;s.drafts=s.drafts.filter(q=>q.id!==questionId);if(s.drafts.length===before)return false;save(s);return true}
function approveDraft(questionId){
  const s=state(),i=s.drafts.findIndex(q=>q.id===questionId);if(i<0)throw Error('Generated draft not found.');
  const q=normalizeQuestion({...s.drafts[i],status:'approved',id:s.drafts[i].id,createdAt:s.drafts[i].createdAt}),errors=validateQuestion(q);
  if(errors.length)throw Error(errors.join(' '));
  s.drafts.splice(i,1);s.approved.push(q);save(s);return q
}
function removeApproved(questionId){const s=state(),before=s.approved.length;s.approved=s.approved.filter(q=>q.id!==questionId);if(s.approved.length===before)return false;save(s);return true}
function list(){const s=state();return{drafts:s.drafts.map(q=>({...q})),approved:s.approved.map(q=>({...q})),updatedAt:s.updatedAt}}
function studioQuestions(){
  return state().approved.map((q,i)=>({...q,id:q.id,set:1,seq:i,topic:q.topic||'Generated',citation:q.citation||q.sourceName||'Generated material'}))
}
window.MBUQuestionGenerator={STORE,schema:SCHEMA,enabled,registerProvider,providerNames,generate,addDraft,updateDraft,rejectDraft,approveDraft,removeApproved,list,studioQuestions,validateQuestion};
})();