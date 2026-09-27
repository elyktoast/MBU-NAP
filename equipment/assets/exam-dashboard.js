/* Exam 1 dashboard: continue studying, recent activity, and manifest-driven bank cards. */
(()=>{'use strict';
const host=document.getElementById('examCards'),runtime=window.MBUBuild,exam=new URL('../exam-1/',runtime.assetsBase);
const safe=key=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
function continueForBank(b){
  const d=safe(b.storageKey);if(!d)return null;
  if(d.sets&&typeof d.sets==='object'){
    const states=(b.sets||[]).map(set=>{
      const st=d.sets[set]||{},count=Number(b.questionsPerSet||0)||Object.keys(st.graded||{}).length,done=Object.values(st.graded||{}).filter(Boolean).length,current=Math.min(Math.max(0,Number(st.current)||0),Math.max(0,count-1));
      return{set,count,done,current,incomplete:done<count,started:done>0||current>0}
    });
    const savedLast=Number(d.lastSet),recent=window.MBUStudyIntelligence?.recentActivity?.(100)||[],recentSet=Number(recent.find(x=>x.bank===b.studioKey)?.set)||0;
    const pick=states.find(x=>x.incomplete&&x.set===savedLast)||states.find(x=>x.incomplete&&x.set===recentSet)||states.filter(x=>x.incomplete&&x.started).sort((a,b)=>b.current-a.current||b.done-a.done||b.set-a.set)[0]||states.find(x=>x.incomplete);
    if(pick)return{label:b.label,detail:'Practice Set '+pick.set+' · Question '+(pick.current+1)+' / '+pick.count,href:b.page+'?set='+encodeURIComponent(pick.set)}
  }
  return{label:b.label,detail:'Review completed progress',href:b.page}
}
function continueCandidates(m){
  const out=[],meta=safe('mbu_sync_meta_v1')||{},studio=safe('mbu_exam1_studio_v1');
  if(studio?.active?.uids?.length)out.push({label:'Study Studio',detail:'Question '+((Number(studio.active.pos)||0)+1)+' / '+studio.active.uids.length,href:'studio.html',at:Number(studio.active.updated)||Number(meta.mbu_exam1_studio_v1?.updatedAt)||0});
  for(const b of m.banks||[]){
    if(!b.storageKey)continue;const item=continueForBank(b);if(item)item.at=Number(meta[b.storageKey]?.updatedAt)||0,out.push(item)
  }
  for(const p of m.hazards?.pages||[]){
    const raw=localStorage.getItem(p.storageKey);if(!raw)continue;
    out.push({label:p.label,detail:'Continue saved progress',href:p.page,at:Number(meta[p.storageKey]?.updatedAt)||0})
  }
  return out.sort((a,b)=>b.at-a.at)
}
function renderContinue(m){
  const panel=document.getElementById('continuePanel'),items=continueCandidates(m),due=window.MBUStudyIntelligence?.summary?.().due||0;
  if(!items.length&&!due){panel.innerHTML='<div class="dash-empty">Start any bank or Study Studio and your most recent session will appear here.</div>';return}
  let html='';
  if(items[0])html+='<a class="continue-card" href="'+items[0].href+'"><span><b>'+items[0].label+'</b><small>'+items[0].detail+'</small></span><strong>Continue →</strong></a>';
  if(due)html+='<a class="continue-card secondary" href="studio.html?mode=due"><span><b>Due Review</b><small>'+due+' question'+(due===1?'':'s')+' scheduled for spaced review</small></span><strong>Review →</strong></a>';
  panel.innerHTML=html
}
function renderActivity(){
  const host=document.getElementById('recentPanel'),s=window.MBUStudyIntelligence?.summary?.();
  if(!s||!s.overall.attempts){host.innerHTML='<div class="dash-empty">Activity and accuracy trends will appear after you answer questions.</div>';return}
  host.innerHTML='<div class="activity-metric"><span>Today</span><b>'+s.today.answered+'</b><small>questions</small></div><div class="activity-metric"><span>Today accuracy</span><b>'+s.today.accuracy+'%</b><small>'+s.today.topics+' topics</small></div><div class="activity-metric"><span>Last 7 days</span><b>'+s.last7.accuracy+'%</b><small>'+s.last7.answered+' answers</small></div><div class="activity-metric"><span>Due review</span><b>'+s.due+'</b><small>questions</small></div>'
}
async function render(){
 try{
  const m=await runtime.fetchJSON(new URL('banks.json',exam),{cache:'no-store'});renderContinue(m);renderActivity();
  for(const b of m.banks||[]){const c=document.createElement('div');c.className='card';const n=document.createElement('div');n.className='number';n.textContent=b.id==='bank1'?'1':b.id==='bank2'?'2':b.id==='bank3'?'3':b.id==='combined'?'C':b.id==='hazards'?'H':'•';const h=document.createElement('h2');h.textContent=b.label;const credit=document.createElement('div');credit.className='builder-credit';credit.textContent='Built with '+(b.creator||'Claude');const p=document.createElement('p');p.textContent=b.description||'';const a=document.createElement('a');a.className='btn';a.href=b.page;a.textContent='Open '+b.label+' →';c.append(n,h,credit,p,a);host.append(c)}
 }catch(e){console.error('Exam bank manifest failed',e);const c=document.createElement('div');c.className='card';c.innerHTML='<h2>Quiz banks could not load</h2><p>Tap SRNA Study Tool to hard refresh this page.</p>';host.append(c)}
}
render()
})();