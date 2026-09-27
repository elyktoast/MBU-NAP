/* Shared study intelligence: attempts, spaced review, activity, reports, analytics, and adaptive ranking. */
(()=>{'use strict';
const STORE='mbu_study_intelligence_v1',SCHEMA=1,MAX_ACTIVITY=1200,DAY=86400000;
let cache=null,lastSerialized='';
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const safeJSON=(raw,fallback)=>{try{return JSON.parse(raw)??fallback}catch{return fallback}};
const now=()=>Date.now();
const uidOf=(bank,q)=>String(q?.uid||((bank||q?.bank||'unknown')+'-'+(q?.id??q?.seq??'unknown')));
const topicOf=q=>String(q?.topic||q?.lec||q?.concept||'Other').trim()||'Other';
const bankOf=(bank,q)=>String(bank||q?.bank||'unknown');
const bankLabelOf=(label,bank,q)=>String(label||q?.bankLabel||bankOf(bank,q));
const blank=()=>({schema:SCHEMA,updatedAt:0,attempts:{},reviews:{},activity:[],issues:[],seededLegacy:false});
function normalize(raw){
  const d=plain(raw)&&Number(raw.schema)===SCHEMA?raw:blank();
  d.attempts=plain(d.attempts)?d.attempts:{};
  d.reviews=plain(d.reviews)?d.reviews:{};
  d.activity=Array.isArray(d.activity)?d.activity.filter(plain).slice(-MAX_ACTIVITY):[];
  d.issues=Array.isArray(d.issues)?d.issues.filter(plain).slice(-500):[];
  d.seededLegacy=!!d.seededLegacy;
  return d
}
function db(){if(cache)return cache;cache=normalize(safeJSON(localStorage.getItem(STORE),null));return cache}
function save(d=db()){
  d.updatedAt=now();const serialized=JSON.stringify(d);if(serialized===lastSerialized)return d;
  localStorage.setItem(STORE,serialized);lastSerialized=serialized;cache=d;window.MBUAppCore?.touchStore?.(STORE);return d
}
window.addEventListener('storage',e=>{if(e.key===STORE){cache=null;lastSerialized=''}});
function reviewInterval(attempt,ok){
  if(!ok)return 1;
  const streak=Math.max(1,Number(attempt?.streak)||1);
  return streak===1?3:streak===2?7:streak===3?14:30
}
function questionMeta(bank,q,extra={}){
  return{
    uid:uidOf(bank,q),bank:bankOf(bank,q),bankLabel:bankLabelOf(extra.bankLabel,bank,q),
    set:Number(extra.set??q?.set??q?.setn??1)||1,questionId:String(extra.questionId??q?.id??q?.seq??''),
    topic:topicOf(q),stem:String(q?.stem||q?.q||'').trim(),href:String(extra.href||location.href)
  }
}
function recordAnswer(bank,q,ok,extra={}){
  const d=db(),meta=questionMeta(bank,q,extra),t=Number(extra.at)||now(),prev=d.attempts[meta.uid]||{},correct=Number(prev.correct)||0,incorrect=Number(prev.incorrect)||0,attempts=Number(prev.attempts)||0;
  const next={...prev,...meta,attempts:attempts+1,correct:correct+(ok?1:0),incorrect:incorrect+(ok?0:1),lastAt:t,lastCorrect:!!ok,streak:ok?(Number(prev.streak)||0)+1:0};
  d.attempts[meta.uid]=next;
  const days=reviewInterval(next,!!ok);d.reviews[meta.uid]={uid:meta.uid,dueAt:t+days*DAY,intervalDays:days,lastAt:t,lastCorrect:!!ok};
  d.activity.push({id:meta.uid+':'+t,at:t,type:'answer',uid:meta.uid,bank:meta.bank,bankLabel:meta.bankLabel,topic:meta.topic,ok:!!ok,href:meta.href});
  if(d.activity.length>MAX_ACTIVITY)d.activity.splice(0,d.activity.length-MAX_ACTIVITY);
  save(d);
  window.MBUSupabase?.submitItemContribution?.(meta.uid,!!ok,extra.responseMs??null,extra.sessionMode||'unknown')?.catch?.(()=>{});
  return next
}
function seedLegacy(records=[]){
  const d=db();if(d.seededLegacy)return false;let changed=false;
  for(const r of records){
    if(!r||!r.uid||d.attempts[r.uid])continue;
    const at=Number(r.at)||0,ok=!!r.ok;
    d.attempts[r.uid]={uid:String(r.uid),bank:String(r.bank||'unknown'),bankLabel:String(r.bankLabel||r.bank||'Unknown'),set:Number(r.set)||1,questionId:String(r.questionId||''),topic:String(r.topic||'Other'),stem:String(r.stem||''),href:String(r.href||''),attempts:1,correct:ok?1:0,incorrect:ok?0:1,lastAt:at,lastCorrect:ok,streak:ok?1:0};
    if(at)d.reviews[r.uid]={uid:String(r.uid),dueAt:at+reviewInterval(d.attempts[r.uid],ok)*DAY,intervalDays:reviewInterval(d.attempts[r.uid],ok),lastAt:at,lastCorrect:ok};
    changed=true
  }
  d.seededLegacy=true;save(d);return changed
}
function due(nowAt=now()){const d=db();return Object.values(d.reviews).filter(r=>(Number(r.dueAt)||0)<=nowAt).sort((a,b)=>a.dueAt-b.dueAt)}
function scoreQuestion(q,at=now()){
  const d=db(),uid=String(q.uid),a=d.attempts[uid],r=d.reviews[uid];let score=0;
  if(!a)return 55;
  if(r&&Number(r.dueAt)<=at)score+=120+Math.min(30,Math.floor((at-r.dueAt)/DAY));
  if(!a.lastCorrect)score+=70;
  const accuracy=a.attempts?a.correct/a.attempts:0;if(accuracy<.6)score+=45;else if(accuracy<.8)score+=20;
  const stale=Math.floor((at-(Number(a.lastAt)||at))/DAY);score+=Math.min(30,Math.max(0,stale));
  score+=Math.min(20,Number(a.incorrect)||0)*2;
  return score
}
function tieRank(uid){let h=2166136261;for(const c of String(uid||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function smartReview(questions,count=50){
  const n=Math.max(1,Math.min(Number(count)||50,questions.length));
  return questions.map((q,i)=>({q,score:scoreQuestion(q),tie:tieRank(q.uid||i)})).sort((a,b)=>b.score-a.score||a.tie-b.tie).slice(0,n).map(x=>x.q)
}
function stats(rows){
  const total=rows.length,correct=rows.reduce((n,a)=>n+(Number(a.correct)||0),0),attempts=rows.reduce((n,a)=>n+(Number(a.attempts)||0),0);
  return{questions:total,attempts,correct,accuracy:attempts?Math.round(correct/attempts*100):0}
}
function analytics(){
  const attempts=Object.values(db().attempts),byTopic={},byBank={};
  for(const a of attempts){(byTopic[a.topic]??=[]).push(a);(byBank[a.bankLabel||a.bank]??=[]).push(a)}
  const convert=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,stats(v)]));
  const cutoff7=now()-7*DAY,cutoff30=now()-30*DAY,activity=db().activity.filter(x=>x.type==='answer');
  const windowStats=cutoff=>{const xs=activity.filter(x=>x.at>=cutoff);return{answered:xs.length,correct:xs.filter(x=>x.ok).length,accuracy:xs.length?Math.round(xs.filter(x=>x.ok).length/xs.length*100):0}};
  return{overall:stats(attempts),byTopic:convert(byTopic),byBank:convert(byBank),last7:windowStats(cutoff7),last30:windowStats(cutoff30),due:due().length}
}
function questionStats(uid){const a=db().attempts[String(uid||'')];return a?{...a}:null}
function topicStats(topic){const rows=Object.values(db().attempts).filter(x=>x.topic===String(topic||''));return stats(rows)}
function recentActivity(limit=20){return db().activity.slice(-Math.max(1,limit)).reverse().map(x=>({...x}))}
function summary(){const a=analytics(),todayStart=new Date();todayStart.setHours(0,0,0,0);const today=db().activity.filter(x=>x.type==='answer'&&x.at>=todayStart.getTime());return{...a,today:{answered:today.length,correct:today.filter(x=>x.ok).length,accuracy:today.length?Math.round(today.filter(x=>x.ok).length/today.length*100):0,topics:new Set(today.map(x=>x.topic)).size}}}
function addIssue(bank,q,details={}){
  const d=db(),meta=questionMeta(bank,q,details),issue={id:meta.uid+':issue:'+now(),...meta,reason:String(details.reason||'Other'),comment:String(details.comment||''),at:now(),status:'open'};
  d.issues.push(issue);if(d.issues.length>500)d.issues.splice(0,d.issues.length-500);save(d);return issue
}
function issues(){return db().issues.map(x=>({...x}))}
function closeIssue(id){const d=db(),x=d.issues.find(x=>x.id===id);if(!x)return false;x.status='closed';x.closedAt=now();save(d);return true}
function clearAll(){localStorage.removeItem(STORE);cache=null;lastSerialized=''}
window.MBUStudyIntelligence={STORE,schema:SCHEMA,recordAnswer,seedLegacy,due,smartReview,questionStats,topicStats,analytics,recentActivity,summary,addIssue,issues,closeIssue,questionMeta,clearAll};
})();