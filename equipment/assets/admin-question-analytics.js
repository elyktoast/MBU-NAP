/* Lazy Phase 3 question-level analytics for operator admins. */
(()=>{'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const href=uid=>new URL('equipment/exam-1/studio.html?question='+encodeURIComponent(String(uid||'')),MBUSupabase.appRoot||location.href).href;
let rows=[],meta=new Map(),contentReview=new Map(),measuredCount=0,reviewGroupCount=0;
function signal(r){const live=r.review_signal==='reported'?'Reported':r.review_signal==='high_miss'?'High miss rate':r.review_signal==='very_easy'?'Very easy':'',extra=contentReview.get(String(r.question_id))||[];return[live,...extra].filter(Boolean).join(' · ')}
function needsReview(r){return!!r.needs_review||contentReview.has(String(r.question_id))}
function matches(r,filter,q){
  if(filter==='review'&&!needsReview(r))return false;
  if(filter==='content'&&!contentReview.has(String(r.question_id)))return false;
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
  host.querySelector('[data-qa-count]').textContent=shown.length+' shown · '+measuredCount+' measured · '+contentReview.size+' content-review items';
}
async function mount(host,msg){
  host.innerHTML='<div class="mbu-muted">Loading question analytics…</div>';
  try{
    const reviewUrl=new URL('reports/question-content-review.json',MBUSupabase.appRoot||location.href),[data,modes,trend,review]=await Promise.all([MBUSupabase.adminRpc('snar_admin_question_analytics',{p_limit:2000,p_review_only:false}),MBUSupabase.adminRpc('snar_admin_mode_analytics'),MBUSupabase.adminRpc('snar_admin_usage_trend',{p_days:30}),MBUBuild.fetchJSON(reviewUrl,{cache:'force-cache'})]);
    const measured=Array.isArray(data)?data:[];measuredCount=measured.length;contentReview=new Map();reviewGroupCount=Array.isArray(review?.candidates)?review.candidates.length:0;for(const c of review?.candidates||[]){const label=c.type==='exact_stem_variant'?'Exact-stem variant':c.type==='near_duplicate_key_variation'?'Near-duplicate key variation':'Content review';for(const uid of c.questions||[]){const key=String(uid),list=contentReview.get(key)||[];if(!list.includes(label))list.push(label);contentReview.set(key,list)}}const merged=new Map(measured.map(x=>[String(x.question_id),x]));for(const uid of contentReview.keys())if(!merged.has(uid))merged.set(uid,{question_id:uid,unique_learners:0,first_attempt_accuracy:null,adaptive_first_attempts:0,report_count:0,maturity:'unmeasured',review_signal:'none',needs_review:false});rows=[...merged.values()];
    if(!window.MBUQuestionSearch)await window.MBUBuild?.loadScript?.('question-search.js');
    const index=await window.MBUQuestionSearch?.getIndex?.()||[];meta=new Map(index.map(x=>[x.uid,x]));
    const reviewCount=rows.filter(needsReview).length,mature=measured.filter(x=>Number(x.unique_learners||0)>=25).length,maxLearners=measured.reduce((n,x)=>Math.max(n,Number(x.unique_learners||0)),0),readiness=mature?mature+' item'+(mature===1?'':'s')+' eligible for population difficulty':'Collecting only — population difficulty is inactive until an item reaches 25 learners';
    const modeRows=(Array.isArray(modes)?modes:[]).map(x=>'<div class="mbu-cloud-row"><div><strong>'+esc(x.session_mode)+'</strong><span>'+Number(x.first_attempts||0)+' first attempts · '+Number(x.unique_users||0)+' users · '+Number(x.accuracy||0)+'% accuracy</span><small>'+Number(x.first_attempts_7d||0)+' in 7 days · '+Number(x.first_attempts_30d||0)+' in 30 days</small></div></div>').join('')||'<div class="mbu-muted">No mode usage yet.</div>';
    const trendRows=(Array.isArray(trend)?trend:[]).slice().reverse().map(x=>'<div class="mbu-cloud-row"><div><strong>'+esc(x.day)+'</strong><span>'+Number(x.first_attempts||0)+' first attempts · '+Number(x.accuracy||0)+'% accuracy · '+Number(x.adaptive_first_attempts||0)+' Adaptive</span>'+(x.avg_response_ms?'<small>Avg response '+Math.round(Number(x.avg_response_ms)/1000)+'s from '+Number(x.response_samples||0)+' timed responses</small>':'')+'</div></div>').join('')||'<div class="mbu-muted">No first-attempt activity in this window.</div>';
    host.innerHTML='<div class="mbu-tools-grid compact"><div><span>Measured items</span><strong>'+measuredCount+'</strong></div><div><span>Needs review</span><strong>'+reviewCount+'</strong></div><div><span>Content review groups</span><strong>'+reviewGroupCount+'</strong></div><div><span>25+ learners</span><strong>'+mature+'</strong></div><div><span>Max learners / item</span><strong>'+maxLearners+'</strong></div></div><p class="mbu-muted"><b>CAT readiness:</b> '+esc(readiness)+'</p><h5>First-attempt usage by mode</h5><div data-qa-modes>'+modeRows+'</div><h5>Recent first-attempt activity</h5><p class="mbu-muted">Daily aggregate only. No learner identities or raw response rows are shown.</p><div data-qa-trend>'+trendRows+'</div><div class="mbu-app-tools__actions"><input data-qa-search type="search" placeholder="Search question, topic, source…" aria-label="Search question analytics"><select data-qa-filter aria-label="Filter question analytics"><option value="all">All measured</option><option value="review">Needs review</option><option value="content">Content review</option><option value="reported">Reported</option><option value="mature">25+ learners</option><option value="early">5–24 learners</option><option value="collecting">Collecting &lt;5</option></select></div><p class="mbu-muted" data-qa-count></p><div data-qa-rows></div>';
    host.querySelector('[data-qa-search]').oninput=()=>draw(host);host.querySelector('[data-qa-filter]').onchange=()=>draw(host);draw(host)
  }catch(e){host.innerHTML='<div class="mbu-muted">Question analytics could not load: '+esc(e.message)+'</div>';if(msg)msg.textContent=e.message}
}
window.SRNAQuestionAnalytics={mount};
})();