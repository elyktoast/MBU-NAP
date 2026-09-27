const STORE=MBUStudio.STORE;let DB=MBUStudio.db();if(!DB.active)DB.active=null;DB.crosses=DB.crosses||{};
let BANK_MANIFEST=null,STUDIO_SOURCE_CATALOG=[],STUDIO_SOURCES=[],STUDIO_SOURCE_ORDER=[],STUDIO_SOURCE_BY_KEY=new Map(),STUDIO_SOURCE_STATE=new Map();
let ALL=[],ALL_BY_UID=new Map(),BANK_QUESTIONS=new Map(),STUDIO_BANK_LABELS=new Map(),STUDIO_SET_NAMES=new Map(),STUDIO_SET_COUNTS=new Map(),STUDIO_TOPIC_COUNTS=new Map(),session=[],pos=0,sel=new Set(),graded=false,autoTimer=null;
function seedStudioSourceCatalog(){
  STUDIO_BANK_LABELS.clear();STUDIO_SET_NAMES.clear();STUDIO_SET_COUNTS.clear();
  for(const src of STUDIO_SOURCE_CATALOG){
    if(!src.bank.startsWith('h'))STUDIO_BANK_LABELS.set(src.bank,src.label);
    for(const set of src.sets){
      const key=src.bank+':'+set;
      STUDIO_SET_NAMES.set(key,src.setLabels?.[set]||('Practice Set '+set));
      STUDIO_SET_COUNTS.set(key,src.count);
    }
  }
}
const save=()=>MBUStudio.save(DB);
function saveActive(){if(!session.length)return;const uids=session.map(q=>q.uid),existing=DB.active&&Array.isArray(DB.active.uids)?DB.active:null,same=existing&&existing.uids.length===uids.length&&existing.uids.every((uid,i)=>uid===uids[i]);if(same&&existing.pos===pos)return;DB.active={...(existing||{}),uids,pos,answers:existing&&existing.answers&&typeof existing.answers==='object'?existing.answers:{},updated:Date.now()};save()}
function sessionAnswer(uid){return DB.active&&DB.active.answers?DB.active.answers[uid]:null}
function setSessionAnswer(uid,result){if(!DB.active||!DB.active.answers)saveActive();DB.active.answers[uid]=result;save()}
function clearActive(){DB.active=null;save()}
function studioHasFailedSource(){for(const state of STUDIO_SOURCE_STATE.values())if(state.status==='failed')return true;return false}
function reconcileActiveState(){
  const a=DB.active;if(!a||!Array.isArray(a.uids)||!a.uids.length)return null;
  const old=a.uids,base=Math.min(Math.max(Number(a.pos)||0,0),old.length-1),currentUid=old[base],uids=[],seen=new Set();
  for(const uid of old)if(ALL_BY_UID.has(uid)&&!seen.has(uid)){seen.add(uid);uids.push(uid)}
  if(!uids.length){clearActive();return null}
  const answers={};for(const uid of uids)if(a.answers&&a.answers[uid])answers[uid]=a.answers[uid];
  let nextPos=currentUid?uids.indexOf(currentUid):-1;if(nextPos<0)nextPos=Math.min(base,uids.length-1);
  const changed=uids.length!==old.length||uids.some((uid,i)=>uid!==old[i])||nextPos!==a.pos||Object.keys(answers).length!==Object.keys(a.answers||{}).length;
  if(changed){DB.active={...a,uids,pos:nextPos,answers};save()}
  return DB.active
}
function resumeActive(){
  if(!DB.active||!Array.isArray(DB.active.uids)||!DB.active.uids.length)return;
  const qs=DB.active.uids.map(id=>ALL_BY_UID.get(id)).filter(Boolean);
  if(qs.length!==DB.active.uids.length){renderHome();return}
  session=qs;pos=Math.min(DB.active.pos||0,session.length-1);showQ()
}
function activeButton(){
  let old=document.getElementById('resumeActive');if(old)old.remove();
  if(!DB.active||!Array.isArray(DB.active.uids)||!DB.active.uids.length||!ALL_BY_UID.size)return;
  const missing=DB.active.uids.some(id=>!ALL_BY_UID.has(id));
  if(missing&&studioHasFailedSource()){
    const host=document.getElementById('home'),b=document.createElement('button');b.id='resumeActive';b.className='btn';b.style.cssText='margin:0 0 16px';b.disabled=true;b.textContent='⏸ Resume Active Quiz · retry failed source first';host.insertBefore(b,host.children[1]||null);return
  }
  const active=reconcileActiveState();if(!active)return;
  const host=document.getElementById('home'),b=document.createElement('button');b.id='resumeActive';b.className='btn';b.style.cssText='margin:0 0 16px';b.textContent='▶ Resume Active Quiz · Question '+(active.pos+1)+' / '+active.uids.length;b.onclick=resumeActive;host.insertBefore(b,host.children[1]||null)
}
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
async function studioFetch(url){return window.MBUBuild.fetchJSON(new URL(url,location.href),{cache:url==='banks.json'?'no-store':'force-cache',timeout:12000})}
function showLoadErrors(errors){
  const el=document.getElementById('loadmsg');
  if(!el)return;
  if(errors.length){el.classList.remove('hidden');el.textContent=errors.join(' | ')}
  else{el.classList.add('hidden');el.textContent=''}
}
function renderStudioLoadState(){
  const panel=document.getElementById('studioLoadPanel'),summary=document.getElementById('studioLoadSummary'),list=document.getElementById('studioLoadSources'),home=document.getElementById('home'),top=document.getElementById('loadmsg');
  if(!panel||!summary||!list)return;
  const states=[...STUDIO_SOURCE_STATE.values()],total=states.length;let ready=0,failed=0,loading=0;for(const x of states){if(x.status==='ready')ready++;else if(x.status==='failed')failed++;else if(x.status==='loading')loading++}
  if(home)home.setAttribute('aria-busy',loading?'true':'false');
  if(!total){panel.classList.add('hidden');return}
  const complete=ready+failed;
  const text=loading?'Loading question banks… '+complete+' / '+total+' complete · '+ALL.length+' questions ready':failed?ready+' / '+total+' sources ready · '+failed+' failed · '+ALL.length+' questions available':'All '+total+' sources ready · '+ALL.length+' questions loaded';
  summary.textContent=text;
  if(top){top.textContent=text;top.classList.toggle('hidden',!loading&&!failed)}
  list.innerHTML=states.map(x=>'<div class="studio-load-source '+(x.status==='failed'?'failed':'')+'"><span><b>'+esc(x.label)+'</b> <span class="mut">· '+(x.status==='ready'?(x.count+' questions ready'):x.status==='failed'?('failed: '+esc(x.error)):x.status==='loading'?'loading…':'waiting')+'</span></span>'+(x.status==='failed'?'<button class="btn out" type="button" id="studio-retry-'+esc(x.key)+'" onclick="retryStudioSource(\''+esc(x.key)+'\')">Retry</button>':'')+'</div>').join('');
  panel.classList.toggle('hidden',!loading&&!failed);
}
function addLoadedQuestions(qs){
  if(!qs.length)return;
  ALL.push(...qs);
  for(const q of qs){
    ALL_BY_UID.set(q.uid,q);
    if(!BANK_QUESTIONS.has(q.bank))BANK_QUESTIONS.set(q.bank,[]);
    BANK_QUESTIONS.get(q.bank).push(q);
    if(!String(q.bank).startsWith('h'))STUDIO_BANK_LABELS.set(q.bank,q.bankLabel);
    const sk=sourceSetKey(q);if(!STUDIO_SET_NAMES.has(sk))STUDIO_SET_NAMES.set(sk,setLabel(q));
    STUDIO_TOPIC_COUNTS.set(q.topic,(STUDIO_TOPIC_COUNTS.get(q.topic)||0)+1);
  }
}
function sortLoadedQuestions(){
  ALL.sort((a,b)=>STUDIO_SOURCE_ORDER.indexOf(a.bank)-STUDIO_SOURCE_ORDER.indexOf(b.bank)||a.set-b.set||a.seq-b.seq);
  for(const qs of BANK_QUESTIONS.values())qs.sort((a,b)=>a.set-b.set||a.seq-b.seq)
}
async function hydrateStudioSource(source){
  const [url,key,label,meta]=source,state=STUDIO_SOURCE_STATE.get(key)||{key,label,status:'waiting',count:0,error:''};
  state.status='loading';state.error='';STUDIO_SOURCE_STATE.set(key,state);renderStudioLoadState();
  try{
    const payload=await studioFetch(url);
    if(meta.format!=='canonical')throw Error('unsupported source format '+meta.format);
    const all=Array.isArray(payload)?payload:(payload.questions||[]);
    if(!Array.isArray(all))throw Error('canonical question data is invalid');
    const raw=meta.setFilter?all.filter(q=>Number(q.set)===Number(meta.setFilter)):all;
    const qs=raw.map((q,i)=>{
      let img=q.imageSvg||q.image||null;
      if(meta.imageBase){
        const rawKey=q.imageId||q.image||'',safe=String(rawKey).replace(/[^A-Za-z0-9_-]/g,'');
        if(safe&&safe===String(rawKey))img={kind:'direct',url:meta.imageBase.replace(/\/?$/,'/')+safe+'.png'};
      }
      const studioSet=String(key).startsWith('h')?1:(q.set||1);
      return norm({...q,img},key,studioSet,i,label,String(key).startsWith('h')?'Workstation Hazards':undefined)
    });
    addLoadedQuestions(qs);state.status='ready';state.count=qs.length;state.error='';
    try{buildTopics()}catch(e){console.error('Studio selector render failed:',label,e)}
    renderStudioLoadState();return true
  }catch(e){
    state.status='failed';state.count=0;state.error=e&&e.name==='AbortError'?'timed out':String(e&&e.message?e.message:e);
    console.error('Studio source failed:',label,e);renderStudioLoadState();return false
  }
}
async function retryStudioSource(key){
  const state=STUDIO_SOURCE_STATE.get(key),source=STUDIO_SOURCE_BY_KEY.get(key);
  if(!state||state.status!=='failed'||!source)return;
  const ok=await hydrateStudioSource(source);
  if(!ok)return;
  sortLoadedQuestions();syncBankData();buildTopics();renderHome();renderStudioLoadState()
}
async function loadBanks(){
  ALL=[];ALL_BY_UID.clear();BANK_QUESTIONS.clear();STUDIO_TOPIC_COUNTS.clear();STUDIO_SOURCE_STATE.clear();STUDIO_SOURCE_BY_KEY.clear();
  try{
    BANK_MANIFEST=await studioFetch('banks.json');
    if(!BANK_MANIFEST||!Array.isArray(BANK_MANIFEST.studioSources))throw Error('invalid bank manifest');
    window.MBU_FEATURES={...(window.MBU_FEATURES||{}),questionGenerator:BANK_MANIFEST.features?.questionGenerator||{enabled:false,status:'unconfigured'}};
  }catch(e){showLoadErrors(['Bank manifest failed: '+e.message]);console.error(e);document.getElementById('home')?.setAttribute('aria-busy','false');return}
  STUDIO_SOURCE_CATALOG=BANK_MANIFEST.studioSources.map(src=>({bank:src.key,label:src.groupLabel||src.label,sets:src.sets,setLabels:src.setLabels||null,count:src.count}));
  seedStudioSourceCatalog();buildTopics();
  STUDIO_SOURCES=BANK_MANIFEST.studioSources.map(src=>[src.data,src.key,src.label,src]);
  STUDIO_SOURCE_ORDER=STUDIO_SOURCES.map(x=>x[1]);
  for(const source of STUDIO_SOURCES){const [,key,label]=source;STUDIO_SOURCE_BY_KEY.set(key,source);STUDIO_SOURCE_STATE.set(key,{key,label,status:'waiting',count:0,error:''})}
  try{renderHome()}catch(e){}
  renderStudioLoadState();
  await Promise.all(STUDIO_SOURCES.map(source=>hydrateStudioSource(source)));
  if(window.MBUQuestionGenerator?.enabled?.()){
    const generated=window.MBUQuestionGenerator.studioQuestions();
    if(generated.length){
      const key='generated',label='Generated Bank';
      STUDIO_SOURCE_CATALOG.push({bank:key,label,sets:[1],setLabels:{1:'Approved Generated Questions'},count:generated.length});
      STUDIO_SOURCE_ORDER.push(key);seedStudioSourceCatalog();
      addLoadedQuestions(generated.map((q,i)=>norm(q,key,1,i,label,'Generated')));
    }
  }
  sortLoadedQuestions();
  try{
    syncBankData();
    window.MBUStudyIntelligence?.seedLegacy?.(Object.entries(DB.ans||{}).map(([uid,r])=>({uid,bank:r.bank,bankLabel:STUDIO_BANK_LABELS.get(r.bank)||r.bank,topic:r.topic,at:r.at,ok:r.ok})));
    window.MBUQuestionSearch?.reset?.();
    buildTopics();const params=new URLSearchParams(location.search),question=params.get('question'),requested=params.get('mode');if(question&&ALL_BY_UID.has(question))practiceSearch(question);else if(requested==='hazards-missed')startMode('hazards-missed');else if(requested==='combined-missed')startMode('combined-missed');else if(DB.active?.mode==='adaptive'&&reconcileActiveState())resumeActive();else renderHome()}catch(e){showLoadErrors(['Studio render failed: '+e.message]);console.error(e)}
  renderStudioLoadState()
}
function canonicalTopic(topic){const name=String(topic||'Other').trim();const low=name.toLowerCase().replace(/₂/g,'2');if(low.includes('co2')&&low.includes('scaveng'))return 'CO₂ & Scavenging';if(low.includes('medical gas'))return 'Medical Gases';if(low.includes('airway equipment')||low==='airway')return 'Airway';if(low.includes('intraoperative assessment')||low.startsWith('monitoring'))return 'Monitoring';if(low.includes('workstation hazards')||low.includes('hazards & safety'))return 'Workstation Hazards';return name}
function inferredTopic(q){if(q.topic)return q.topic;if(q.lec)return q.lec;const refs=Array.isArray(q.ref)?q.ref.join('; '):'';const src=String(q.citation||q.src||refs||'').trim();if(/^Medical Gas Systems in Anesthesia/i.test(src))return 'Medical Gases';if(/^Intraoperative Assessment|^Monitoring/i.test(src))return 'Monitoring';if(/^Airway Equipment/i.test(src))return 'Airway';if(/^CO2 and Scavenging|^CO2 Absorbents and Scavenging|^CO₂ & Scavenging/i.test(src))return 'CO₂ & Scavenging';if(/^Anesthesia Workstation Hazards|^Hazards & safety/i.test(src))return 'Workstation Hazards';return 'Other'}
function norm(q,b,set,i,label,forcedTopic){
  const rawAns=q.answer??q.correct??q.a??[],ans=(Array.isArray(rawAns)?rawAns:[rawAns]).map(Number).filter(Number.isInteger);
  const opts=Array.isArray(q.options)?q.options:(Array.isArray(q.c)?q.c:[]);
  const rawSrc=q.citation??((q.src||'')+(q.page?' · '+q.page:''))??'';
  const src=Array.isArray(rawSrc)?rawSrc.join('; '):String(rawSrc||((q.ref||[]).join('; ')));
  const stem=String(q.stem||q.q||''),exp=String(q.explanation||q.why||q.exp||''),topic=canonicalTopic(forcedTopic||inferredTopic(q));return{uid:b+'-'+(q.id??(set+'-'+i)),bank:b,bankLabel:label||b,set,seq:i,topic,stem,opts,ans,exp,src,img:q.imageSvg||q.img||null,searchText:(stem+' '+topic+' '+exp+' '+src).toLowerCase()}
}
function syncBankData(){
  let syncChanged=false;
  const put=(q,ok,bank,force=false)=>{if(!q)return;const prev=DB.ans[q.uid],nextOk=!!ok;if(!force&&prev)return;if(prev&&prev.ok===nextOk&&prev.bank===bank&&prev.topic===q.topic)return;DB.ans[q.uid]={ok:nextOk,at:Date.now(),topic:q.topic,bank};syncChanged=true};
  const syncCanonical=(bank,key)=>{
    try{
      const d=JSON.parse(localStorage.getItem(key)||'null');if(!d||!d.sets)return false;
      let found=false;
      for(const [setKey,st] of Object.entries(d.sets||{})){
        const set=Number(setKey),qs=(BANK_QUESTIONS.get(bank)||[]).filter(q=>q.set===set);
        if(!st||!st.graded)continue;
        for(const [i,on] of Object.entries(st.graded)){if(!on)continue;const q=qs[Number(i)];if(q){put(q,st.correct&&st.correct[i],bank);found=true}}
      }
      return found
    }catch(e){return false}
  };
  syncCanonical('b1','SRNA_COMBINED_EXAM_SET_1_2026_V1');
  syncCanonical('b2','srna_all5_groundup_v1');
  syncCanonical('b3','srna_equipment_dashboard_v1');
  try{
    const b2=JSON.parse(localStorage.getItem('srna_all5_groundup_v1')||'null');
    if(b2&&b2.sets)for(let s=0;s<5;s++){const st=b2.sets[s]||{},qs=(BANK_QUESTIONS.get('b2')||[]).filter(q=>q.set===s+1);Object.entries(st.answered||{}).forEach(([i,ok])=>put(qs[+i],ok,'b2'))}
  }catch(e){}
  try{
    const raw=localStorage.getItem('srna_equipment_dashboard_v1');
    const b3=raw&&JSON.parse(raw),byId=new Map((BANK_QUESTIONS.get('b3')||[]).map(q=>[String(q.uid).slice(3),q]));
    if(b3&&b3.ex)Object.values(b3.ex).forEach(exam=>Object.entries(exam.ans||{}).forEach(([id,result])=>put(byId.get(String(id)),result&&result.ok,'b3')));
    else if(b3&&b3.answered)Object.entries(b3.answered).forEach(([id,ok])=>put(byId.get(String(id)),ok,'b3'))
  }catch(e){}
  try{
    const combined=JSON.parse(localStorage.getItem('MBU_COMBINED_BANK_2026_V1')||'null');
    if(combined&&combined.sets){
      const byId=new Map((BANK_QUESTIONS.get('combined')||[]).map(q=>[String(q.uid).slice('combined-'.length),q]));
      for(let set=1;set<=3;set++){
        const st=combined.sets[set]||{};
        Object.keys(st.graded||{}).forEach(id=>{if(st.graded[id])put(byId.get(String(id)),st.correct&&st.correct[id],'combined')});
      }
    }
  }catch(e){}
  for(const [bank,key,kind] of [
    ['h1','SRNA_HAZARDS_BANK_1_2026_V2','graded'],
    ['h2','SRNA_HAZARDS_BANK_2_2026_V1','graded'],
    ['h3','hazards_practice3_progress_2026_V2','ans'],
    ['hh','hazards_harder_progress_2026_V1','ans']
  ]){
    try{
      const d=JSON.parse(localStorage.getItem(key)||'null');if(!d)continue;
      const map=new Map((BANK_QUESTIONS.get(bank)||[]).map(q=>[String(q.uid).slice(bank.length+1),q]));
      if(kind==='graded')Object.keys(d.graded||{}).forEach(id=>{if(d.graded[id])put(map.get(String(id)),d.correct&&d.correct[id],bank)});
      else Object.entries(d.ans||{}).forEach(([id,result])=>put(map.get(String(id)),result&&result.ok,bank,bank==='h3'||bank==='hh'));
    }catch(e){}
  }
  if(syncChanged)save();
}
let buildMode='sets';
function adaptiveAccountReady(){const status=window.MBUSupabase?.status?.()||{};return !!status.signedIn&&status.legalAccepted===true&&status.accessStatus==='active'}
function adaptiveToggleChanged(input){if(!input?.checked)return true;if(adaptiveAccountReady())return true;input.checked=false;window.MBUAppCore?.openAccount?.(input);return false}
function setBuildMode(mode){buildMode=mode==='topics'?'topics':'sets';document.getElementById('sourcePickbox').classList.toggle('hidden',buildMode!=='sets');document.getElementById('topicPickbox').classList.toggle('hidden',buildMode!=='topics');document.getElementById('buildSetsBtn').classList.toggle('out',buildMode!=='sets');document.getElementById('buildTopicsBtn').classList.toggle('out',buildMode!=='topics');document.getElementById('buildModeHelp').textContent=buildMode==='sets'?'Choose one or more practice sets. Questions can come from any topic in those sets.':'Choose one or more topics. Studio will pull matching questions from all loaded practice sets and banks.'}
function setChecks(id,on){document.querySelectorAll('#'+id+' input[type=checkbox]').forEach(x=>x.checked=on)}
function checkedValues(id){return [...document.querySelectorAll('#'+id+' input[type=checkbox]:checked')].map(x=>x.value)}
function setLabel(q){if(q.bank==='hh')return 'Challenge Set';if(q.bank==='h1'||q.bank==='h2'||q.bank==='h3')return q.bankLabel;return q.set===7?'Challenge Set':'Practice Set '+q.set}
function sourceSetKey(q){return q.bank+':'+q.set}
function buildTopics(){
  const selectedSources=new Set(checkedValues('sourceChecks')),selectedTopics=new Set(checkedValues('topicChecks'));
  const groupDefs=[...STUDIO_BANK_LABELS.entries()].map(([bank,label])=>({label,banks:[bank]})).concat({label:'Workstation Hazards',banks:['h1','h2','h3','hh']});
  document.getElementById('sourceChecks').innerHTML=groupDefs.map(g=>{
    const keys=[...STUDIO_SET_NAMES.keys()].filter(k=>g.banks.includes(k.split(':')[0]));
    if(g.label==='Workstation Hazards'){const order=['h1:1','h2:1','h3:1','hh:1'];keys.sort((a,b)=>order.indexOf(a)-order.indexOf(b))}
    return `<div style="margin-bottom:14px"><b>${esc(g.label)}</b><div style="display:grid;gap:5px;margin:5px 0 0 12px">${keys.map(key=>`<label class="checkitem"><input type="checkbox" value="${esc(key)}"${selectedSources.has(key)?' checked':''}> <span>${esc(STUDIO_SET_NAMES.get(key))} <span class="mut">(${STUDIO_SET_COUNTS.get(key)||0})</span></span></label>`).join('')}</div></div>`
  }).join('');
  document.getElementById('topicChecks').innerHTML=[...STUDIO_TOPIC_COUNTS.keys()].sort().map(x=>`<label class="checkitem"><input type="checkbox" value="${esc(x)}"${selectedTopics.has(x)?' checked':''}> <span>${esc(x)} <span class="mut">(${STUDIO_TOPIC_COUNTS.get(x)})</span></span></label>`).join('')
}
function renderHome(){
  clearTimeout(autoTimer);autoTimer=null;window.MBUCalculator?.hide();
  show('home');activeButton();
  let miss=0,flagged=0;
  for(const q of ALL){const r=DB.ans[q.uid];if(r&&!r.ok)miss++;if(DB.flags[q.uid])flagged++}
  const intel=window.MBUStudyIntelligence?.summary?.()||{overall:{attempts:0,accuracy:0},last7:{answered:0,accuracy:0},last30:{answered:0,accuracy:0},today:{answered:0,accuracy:0,topics:0},due:0,byTopic:{},byBank:{}};
  document.getElementById('missedN').textContent=miss+' currently missed';
  document.getElementById('flagN').textContent=flagged+' flagged';
  document.getElementById('smartN').textContent=intel.overall.attempts?'Uses your full answer history to target what needs work next.':'Starts broad, then adapts as you answer questions.';
  document.getElementById('dueN').textContent=intel.due+' question'+(intel.due===1?'':'s')+' due for spaced review';
  document.getElementById('dueBtn').disabled=!intel.due;
  document.getElementById('reportN').textContent=DB.reports.length+' saved reports';
  document.getElementById('analyticsSummary').innerHTML=
    '<div class="studio-metric"><span>Overall accuracy</span><strong>'+intel.overall.accuracy+'%</strong></div>'+
    '<div class="studio-metric"><span>Last 7 days</span><strong>'+intel.last7.accuracy+'%</strong><span>'+intel.last7.answered+' answers</span></div>'+
    '<div class="studio-metric"><span>Last 30 days</span><strong>'+intel.last30.accuracy+'%</strong><span>'+intel.last30.answered+' answers</span></div>'+
    '<div class="studio-metric"><span>Due for review</span><strong>'+intel.due+'</strong></div>';
  const topics=Object.entries(intel.byTopic||{}).filter(([,x])=>x.attempts).sort((a,b)=>a[1].accuracy-b[1].accuracy||b[1].attempts-a[1].attempts);
  const banks=Object.entries(intel.byBank||{}).filter(([,x])=>x.attempts).sort((a,b)=>a[0].localeCompare(b[0]));
  document.getElementById('analytics').innerHTML=
    (banks.length?'<h3>By Bank</h3>'+banks.map(([name,x])=>`<div class="topic"><span>${esc(name)} <small class="mut">(${x.attempts})</small></span><b>${x.accuracy}%</b><div class="bar"><i style="width:${x.accuracy}%"></i></div></div>`).join(''):'')+
    (topics.length?'<h3>By Topic</h3>'+topics.map(([name,x])=>`<div class="topic"><span>${esc(name)} <small class="mut">(${x.attempts})</small></span><b>${x.accuracy}%</b><div class="bar"><i style="width:${x.accuracy}%"></i></div></div>`).join(''):'<div class="mut">Answer questions to build analytics.</div>')
}
function show(id){if(id!=='quiz')window.MBUCalculator?.hide();document.body.classList.toggle('mbu-quiz-active',id==='quiz');['home','quiz','search','reports'].forEach(x=>document.getElementById(x).classList.toggle('hidden',x!==id));const ret=new URLSearchParams(location.search).get('return'),haz=ret==='hazards',combined=ret==='combined';const title=document.getElementById('studioTitle'),back=document.getElementById('studioHomeNav');title.textContent=haz?'Workstation Hazards · Missed Questions Review':combined?'Combined · Missed Questions Review':'Exam 1 Study Studio';back.textContent=haz?'← Hazards Home':combined?'← Combined Home':'← Study Studio Home';back.onclick=haz?()=>location.href='hazards.html':combined?()=>location.href='combined.html':renderHome;back.classList.toggle('hidden',id==='home'&&!haz&&!combined)}
function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function startMode(m){let pool=[...ALL];if(m==='smart')pool=window.MBUStudyIntelligence?.smartReview?.(pool,50)||pool.slice(0,50);if(m==='due'){const dueRows=window.MBUStudyIntelligence?.due?.()||[];pool=dueRows.map(r=>ALL_BY_UID.get(r.uid)).filter(Boolean)}if(m==='missed')pool=pool.filter(q=>DB.ans[q.uid]&&!DB.ans[q.uid].ok);if(m==='hazards-missed')pool=pool.filter(q=>String(q.bank).startsWith('h')&&DB.ans[q.uid]&&!DB.ans[q.uid].ok);if(m==='combined-missed')pool=pool.filter(q=>q.bank==='combined'&&DB.ans[q.uid]&&!DB.ans[q.uid].ok);if(m==='flagged')pool=pool.filter(q=>DB.flags[q.uid]);if(m==='weak'){let by={};ALL.forEach(q=>{let r=DB.ans[q.uid];if(r){(by[q.topic]??={a:0,c:0}).a++;if(r.ok)by[q.topic].c++}});let weak=Object.entries(by).filter(x=>x[1].a>=2).sort((a,b)=>a[1].c/a[1].a-b[1].c/b[1].a).slice(0,3).map(x=>x[0]);pool=pool.filter(q=>weak.includes(q.topic));if(!pool.length)pool=[...ALL]}if(m==='custom'){if(buildMode==='sets'){const bs=new Set(checkedValues('sourceChecks'));if(!bs.size)return alert('Select at least one practice set.');pool=pool.filter(q=>bs.has(sourceSetKey(q)))}else{const ts=new Set(checkedValues('topicChecks'));if(!ts.size)return alert('Select at least one topic.');pool=pool.filter(q=>ts.has(q.topic))}let n=document.getElementById('count').value,limit=n==='all'?Math.min(pool.length,200):Math.min(+n,pool.length),adaptive=!!document.getElementById('adaptiveToggle')?.checked;if(adaptive){if(!adaptiveAccountReady()){document.getElementById('adaptiveToggle').checked=false;window.MBUAppCore?.openAccount?.(document.getElementById('adaptiveToggle'));return}const seeded=window.MBUAdaptiveQuiz?.start?.(pool,limit);if(!seeded?.question)return alert('No questions are available for this adaptive session.');delete DB.searchReturn;session=[seeded.question];pos=0;DB.active={uids:[seeded.question.uid],pos,answers:{},mode:'adaptive',adaptive:seeded.state,updated:Date.now()};save();showQ();return}if(document.getElementById('order').value==='random')shuffle(pool);if(n!=='all')pool=pool.slice(0,+n)}else if(m!=='smart'&&m!=='due')shuffle(pool);if(!pool.length){if(m==='hazards-missed'||m==='combined-missed'){show('home');return}return alert('No questions are available for that mode yet.')}delete DB.searchReturn;session=pool;pos=0;const storedMode=['smart','due','missed','flagged','custom'].includes(m)?m:(m==='hazards-missed'||m==='combined-missed'?'missed':'custom');DB.active={uids:session.map(q=>q.uid),pos,answers:{},mode:storedMode,updated:Date.now()};save();showQ()}
function sessionStats(){let done=0,correct=0;for(const q of session){const r=sessionAnswer(q.uid);if(!r)continue;done++;if(r.ok)correct++}return{done,correct,missed:done-correct,score:done?Math.round(100*correct/done):0}}
function crossKey(q,i){return q.uid+':'+i}
function toggleStudioCross(q,i,b,cross){if(graded)return;const k=crossKey(q,i);DB.crosses[k]=!DB.crosses[k];if(!DB.crosses[k])delete DB.crosses[k];save();b.classList.toggle('strike',!!DB.crosses[k]);cross.setAttribute('aria-pressed',String(!!DB.crosses[k]))}
function studioImageHTML(q){if(!q.img)return '';if(typeof q.img==='string'){if(q.img.trim().startsWith('<'))return q.img;if(/^data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(q.img))return '<img alt="Question figure" style="max-width:100%;height:auto" src="'+q.img+'">';return ''}if(q.img.kind==='direct'&&q.img.url)return '<img alt="Question figure" loading="lazy" decoding="async" style="max-width:100%;height:auto" src="'+esc(q.img.url)+'">';return ''}
function showQ(){clearTimeout(autoTimer);autoTimer=null;show('quiz');let q=session[pos],saved=sessionAnswer(q.uid),savedSel=saved&&Array.isArray(saved.selected)?saved.selected.map(Number).filter(Number.isInteger):null;sel=new Set(savedSel||[]);graded=!!(saved&&savedSel);let ss=sessionStats(),adaptive=DB.active?.mode==='adaptive'&&DB.active?.adaptive,maxQuestions=adaptive?DB.active.adaptive.maxQuestions:session.length,currentLevel=adaptive?(DB.active.adaptive.currentLevel||DB.active.adaptive.level):null;document.getElementById('sessionBadge').textContent=adaptive?'ADAPTIVE · '+q.bankLabel.toUpperCase():q.bankLabel.toUpperCase();document.getElementById('qprog').textContent=`Question ${pos+1} of ${maxQuestions} · ${setLabel(q)}`;document.getElementById('sessionCompleted').textContent=ss.done;document.getElementById('sessionTotal').textContent=maxQuestions;document.getElementById('sessionScore').textContent=ss.score;document.getElementById('sessionMissed').textContent=ss.missed;document.getElementById('qmeta').textContent=(adaptive?`Adaptive Challenge ${currentLevel}/5 · `:'')+(q.ans.length>1?`Select ${q.ans.length} Options`:'Single Best Answer');document.getElementById('stem').textContent=q.stem;let im=document.getElementById('qimage'),imageHTML=studioImageHTML(q);im.innerHTML=imageHTML;im.classList.toggle('hidden',!imageHTML);const box=document.getElementById('opts');box.innerHTML='';q.opts.forEach((o,i)=>{const row=document.createElement('div');row.className='mbu-choice-row';const b=document.createElement('button');b.className='opt';b.innerHTML=`<b class="prefix">${String.fromCharCode(65+i)}.</b><span>${esc(o)}</span>`;const cross=document.createElement('button');cross.type='button';cross.className='mbu-cross';cross.textContent='✕';cross.setAttribute('aria-label',`Cross out option ${String.fromCharCode(65+i)}`);cross.setAttribute('aria-pressed',String(!!DB.crosses[crossKey(q,i)]));if(DB.crosses[crossKey(q,i)])b.classList.add('strike');if(graded){if(q.ans.includes(i))b.classList.add('correct');else if(sel.has(i))b.classList.add('incorrect');b.disabled=true;cross.disabled=true}else{b.onclick=()=>pick(i);b.oncontextmenu=e=>{e.preventDefault();toggleStudioCross(q,i,b,cross)};cross.onclick=()=>toggleStudioCross(q,i,b,cross)}row.append(b,cross);box.appendChild(row)});const submit=document.getElementById('submit'),submitRow=document.getElementById('studio-submit-row'),fb=document.getElementById('fb'),fbText=document.getElementById('fbText'),fbCitation=document.getElementById('fbCitation');if(graded){submitRow.style.display='none';fb.style.display='block';fbText.innerHTML=`<b>${saved.ok?'Correct':'Incorrect'}.</b> ${esc(q.exp)}`;fbCitation.textContent=q.src||''}else{submitRow.style.display='flex';submit.disabled=sel.size!==q.ans.length;submit.textContent=q.ans.length>1?`Submit Selections (${sel.size}/${q.ans.length})`:'Submit Answer';fb.style.display='none';fbText.innerHTML='';fbCitation.textContent=''}document.getElementById('next').disabled=adaptive?!graded:pos>=session.length-1;document.getElementById('studioPrev').disabled=pos<=0;const navToggle=document.getElementById('studioNavToggle');if(navToggle){navToggle.disabled=!!adaptive;navToggle.title=adaptive?'Adaptive sessions use sequential review; the full navigator is hidden.':''}if(adaptive)document.getElementById('navigator').classList.add('hidden');document.getElementById('flagBtn').textContent=DB.flags[q.uid]?'★ Flagged':'☆ Flag';saveActive();if(!document.getElementById('navigator').classList.contains('hidden'))renderNav();window.MBUCalculator?.besideFlag()}
function pick(i){if(graded)return;let q=session[pos];if(q.ans.length===1){sel=new Set([i])}else if(sel.has(i))sel.delete(i);else if(sel.size<q.ans.length)sel.add(i);document.querySelectorAll('#opts .opt').forEach((b,j)=>b.classList.toggle('selected',sel.has(j)));const submit=document.getElementById('submit');submit.disabled=sel.size!==q.ans.length;submit.textContent=q.ans.length>1?`Submit Selections (${sel.size}/${q.ans.length})`:'Submit Answer'}
function grade(){let q=session[pos];if(!sel.size||sel.size!==q.ans.length)return;graded=true;let a=[...sel].sort().join(),w=[...q.ans].sort().join(),ok=a===w;const selected=[...sel].sort((x,y)=>x-y);MBUStudio.stageAnswer(q.bank,q,ok);window.MBUStudyIntelligence?.recordAnswer?.(q.bank,q,ok,{bankLabel:q.bankLabel,set:q.set,questionId:q.uid,sessionMode:DB.active?.mode||'custom'});if(DB.active?.mode==='adaptive'&&DB.active?.adaptive)DB.active.adaptive=window.MBUAdaptiveQuiz?.advance?.(DB.active.adaptive,q,ok)||DB.active.adaptive;setSessionAnswer(q.uid,{ok,selected,at:Date.now()});document.querySelectorAll('#opts .opt').forEach((b,i)=>{b.classList.remove('selected');if(q.ans.includes(i))b.classList.add('correct');else if(sel.has(i))b.classList.add('incorrect');b.disabled=true});document.querySelectorAll('#opts .mbu-cross').forEach(b=>b.disabled=true);let f=document.getElementById('fb');f.style.display='block';document.getElementById('fbText').innerHTML=`<b>${ok?'Correct':'Incorrect'}.</b> ${esc(q.exp)}`+(DB.active?.mode==='adaptive'?`<div class="mut" style="margin-top:8px">Next adaptive challenge: ${DB.active.adaptive.level}/5</div>`:'');document.getElementById('fbCitation').textContent=q.src||'';document.getElementById('studio-submit-row').style.display='none';const ss=sessionStats();document.getElementById('sessionCompleted').textContent=ss.done;document.getElementById('sessionScore').textContent=ss.score;document.getElementById('sessionMissed').textContent=ss.missed;if(DB.active?.mode==='adaptive')document.getElementById('next').disabled=DB.active.adaptive.answered>=DB.active.adaptive.maxQuestions;else if(!document.getElementById('navigator').classList.contains('hidden'))renderNav();saveActive();if(ok){autoTimer=setTimeout(()=>nextQ(),350)}}
function studioNav(delta){clearTimeout(autoTimer);autoTimer=null;const n=pos+delta;if(n<0||n>=session.length)return;pos=n;saveActive();showQ()}
function resetStudioCurrent(){clearTimeout(autoTimer);autoTimer=null;const q=session[pos];let changed=false;if(DB.active&&DB.active.answers&&Object.prototype.hasOwnProperty.call(DB.active.answers,q.uid)){delete DB.active.answers[q.uid];changed=true}const prefix=q.uid+':';for(const k of Object.keys(DB.crosses))if(k.startsWith(prefix)){delete DB.crosses[k];changed=true}if(changed)save();showQ()}
function nextQ(){clearTimeout(autoTimer);autoTimer=null;if(pos+1<session.length){pos++;saveActive();showQ();return}if(DB.active?.mode==='adaptive'&&DB.active?.adaptive&&DB.active.adaptive.answered<DB.active.adaptive.maxQuestions){const picked=window.MBUAdaptiveQuiz?.pick?.(ALL,DB.active.adaptive);if(picked?.question){DB.active.adaptive=picked.state;session.push(picked.question);pos++;saveActive();showQ();return}}if(Object.prototype.hasOwnProperty.call(DB,'searchReturn')){DB.active=DB.searchReturn;delete DB.searchReturn;save()}else clearActive();session=[];const ret=new URLSearchParams(location.search).get('return');if(ret==='hazards'){location.href='hazards.html';return}if(ret==='combined'){location.href='combined.html';return}renderHome()}
function toggleFlag(){let q=session[pos],on=MBUStudio.toggleFlag(q.bank,q);document.getElementById('flagBtn').textContent=on?'★ Flagged':'☆ Flag';if(!document.getElementById('navigator').classList.contains('hidden'))renderNav()}
function toggleNav(){clearTimeout(autoTimer);autoTimer=null;const nav=document.getElementById('navigator'),opening=nav.classList.contains('hidden');nav.classList.toggle('hidden');if(opening)renderNav()}
function renderNav(){document.getElementById('navigator').innerHTML=session.map((q,i)=>{let r=sessionAnswer(q.uid);return MBUNavigator.button({label:i+1,active:i===pos,flagged:!!DB.flags[q.uid],result:r?!!r.ok:null,onClick:'clearTimeout(autoTimer);autoTimer=null;pos='+i+';saveActive();showQ()'})}).join('')}
function practiceSearch(uid){clearTimeout(autoTimer);autoTimer=null;const q=ALL_BY_UID.get(uid);if(!q)return;const previous=Object.prototype.hasOwnProperty.call(DB,'searchReturn')?DB.searchReturn:DB.active;DB.searchReturn=previous?JSON.parse(JSON.stringify(previous)):null;session=[q];pos=0;DB.active={uids:[q.uid],pos:0,answers:{},mode:'custom',updated:Date.now()};save();showQ()}
function doSearch(){let x=document.getElementById('searchbox').value.trim().toLowerCase();if(x.length<2){document.getElementById('searchresults').innerHTML='';return}const r=[];for(const q of ALL){if(q.searchText.includes(x)){r.push(q);if(r.length===100)break}}document.getElementById('searchresults').innerHTML=`<div class="mut">${r.length}${r.length===100?'+':''} matches</div>`+r.map(q=>`<div class="searchrow"><b>${esc(q.bankLabel)} · ${esc(q.topic)}</b><div>${esc(q.stem)}</div><button class="btn out" onclick="practiceSearch('${q.uid}')">Practice this question</button></div>`).join('')}
function reportCurrent(){let hadAuto=!!autoTimer;clearTimeout(autoTimer);autoTimer=null;const q=session[pos];MBUStudio.report(q.bank,q,{bankLabel:q.bankLabel,set:q.set,questionNumber:q.seq+1,selected:[...sel]});if(hadAuto&&graded&&sessionAnswer(q.uid)&&sessionAnswer(q.uid).ok)autoTimer=setTimeout(()=>nextQ(),350)}
function showReports(){show('reports');const pending=MBUStudio.pendingReports().length,btn=document.getElementById('sendSavedReportsBtn'),status=document.getElementById('savedReportStatus');btn.disabled=!pending;btn.textContent=pending?'Send Saved Reports ('+pending+')':'All Saved Reports Sent';status.textContent=pending?pending+' saved report'+(pending===1?' is':'s are')+' still stored only on this device.':'';document.getElementById('reportlist').innerHTML=DB.reports.map((r,i)=>`<div class="reportrow"><b>${esc(r.bankLabel||r.bank)}</b> · ${esc(r.reason||'Report')} · <span class="mut">${r.sent?'Sent':'Pending'}</span><div>${esc(r.stem)}</div><button class="btn bad" onclick="DB.reports.splice(${i},1);save();showReports()">Delete</button></div>`).join('')||'<div class="mut">No reports saved.</div>'}
async function sendSavedReports(){const btn=document.getElementById('sendSavedReportsBtn'),status=document.getElementById('savedReportStatus');btn.disabled=true;let message='';try{const result=await MBUStudio.sendSavedReports(p=>{status.textContent='Sending saved reports… '+p.done+' / '+p.total});message=result.failed?result.sent+' sent, '+result.failed+' still pending.':'All '+result.sent+' saved report'+(result.sent===1?'':'s')+' sent successfully.'}catch(e){message='Could not send saved reports: '+e.message}finally{showReports();status.textContent=message}}
loadBanks();
