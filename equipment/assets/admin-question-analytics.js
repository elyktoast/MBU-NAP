/* Lazy Phase 3 question-level analytics for operator admins. */
(()=>{'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const href=uid=>new URL('equipment/exam-1/studio.html?question='+encodeURIComponent(String(uid||'')),MBUSupabase.appRoot||location.href).href;
let rows=[],meta=new Map();
function signal(r){return r.review_signal==='reported'?'Reported':r.review_signal==='high_miss'?'High miss rate':r.review_signal==='very_easy'?'Very easy':''}
function matches(r,filter,q){
  if(filter==='review'&&!r.needs_review)return false;
  if(filter==='reported'&&Number(r.report_count||0)<1)return false;
  if(filter==='mature'&&Number(r.unique_learners||0)<25)return false;
  if(filter==='early'&&(Number(r.unique_learners||0)<5||Number(r.unique_learners||0)>=25))return false;
  if(filter==='collecting'&&Number(r.unique_learners||0)>=5)return false;
  if(!q)return true;const m=meta.get(r.question_id)||{},hay=[r.question_id,m.label,m.topic,m.stem,m.source].join(' ').toLowerCase();return hay.includes(q)
}
function draw(host){
  const filter=host.querySelector('[data-qa-filter]')?.value||'all',q=(host.querySelector('[data-qa-search]')?.value||'').trim().toLowerCase(),shown=rows.filter(r=>matches(r,filter,q));
  const out=host.querySelector('[data-qa-rows]');
  out.innerHTML=shown.map(r=>{const m=meta.get(r.question_id)||{},acc=r.first_attempt_accuracy==null?'—':Number(r.first_attempt_accuracy)+'%',sig=signal(r),learners=Number(r.unique_learners||0),reports=Number(r.report_count||0);
    return '<div class="mbu-cloud-row"><div><strong>'+esc(m.label||r.question_id)+' · '+esc(r.question_id)+(sig?' · '+esc(sig):'')+'</strong><span>'+learners+' learner'+(learners===1?'':'s')+' · '+acc+' first-attempt · '+Number(r.adaptive_first_attempts||0)+' Adaptive · '+esc(r.maturity)+'</span><small>'+esc(m.topic||'Unknown topic')+(m.stem?' · '+esc(m.stem):'')+'</small><small>'+reports+' report'+(reports===1?'':'s')+(r.avg_response_ms?' · avg '+Math.round(Number(r.avg_response_ms)/1000)+'s response':'')+'</small></div><a class="secondary" target="_blank" rel="noopener" href="'+esc(href(r.question_id))+'">Open exact question</a></div>'
  }).join('')||'<div class="mbu-muted">No questions match this view.</div>';
  host.querySelector('[data-qa-count]').textContent=shown.length+' shown · '+rows.length+' measured';
}
async function mount(host,msg){
  host.innerHTML='<div class="mbu-muted">Loading question analytics…</div>';
  try{
    const data=await MBUSupabase.adminRpc('snar_admin_question_analytics',{p_limit:500,p_review_only:false});
    rows=Array.isArray(data)?data:[];
    if(!window.MBUQuestionSearch)await window.MBUBuild?.loadScript?.('question-search.js');
    const index=await window.MBUQuestionSearch?.getIndex?.()||[];meta=new Map(index.map(x=>[x.uid,x]));
    const review=rows.filter(x=>x.needs_review).length,mature=rows.filter(x=>Number(x.unique_learners||0)>=25).length;
    host.innerHTML='<div class="mbu-tools-grid compact"><div><span>Measured items</span><strong>'+rows.length+'</strong></div><div><span>Needs review</span><strong>'+review+'</strong></div><div><span>25+ learners</span><strong>'+mature+'</strong></div></div><div class="mbu-app-tools__actions"><input data-qa-search type="search" placeholder="Search question, topic, source…" aria-label="Search question analytics"><select data-qa-filter aria-label="Filter question analytics"><option value="all">All measured</option><option value="review">Needs review</option><option value="reported">Reported</option><option value="mature">25+ learners</option><option value="early">5–24 learners</option><option value="collecting">Collecting &lt;5</option></select></div><p class="mbu-muted" data-qa-count></p><div data-qa-rows></div>';
    host.querySelector('[data-qa-search]').oninput=()=>draw(host);host.querySelector('[data-qa-filter]').onchange=()=>draw(host);draw(host)
  }catch(e){host.innerHTML='<div class="mbu-muted">Question analytics could not load: '+esc(e.message)+'</div>';if(msg)msg.textContent=e.message}
}
window.SRNAQuestionAnalytics={mount};
})();