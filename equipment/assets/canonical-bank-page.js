/* Canonical Exam 1 bank page.
   The HTML page provides only a bank id. All shell, config, shared assets, and runtime wiring live here. */
(()=>{'use strict';
const script=document.currentScript,bankId=script?.dataset.bank||document.body?.dataset.mbuBank||'',build=new URL(script?.src||location.href).searchParams.get('b')||'dev';
const exam=new URL('../exam-1/',script?.src||location.href),assets=new URL('../assets/',script?.src||location.href);
const version=url=>{const u=new URL(url);u.searchParams.set('b',build);return u.href};
const loadStyle=name=>new Promise((resolve,reject)=>{const l=document.createElement('link');l.rel='stylesheet';l.href=version(new URL(name,assets));l.onload=resolve;l.onerror=()=>reject(Error('Stylesheet failed: '+name));document.head.append(l)});
const loadScript=(name,data={})=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=version(new URL(name,assets));for(const [k,v] of Object.entries(data))s.dataset[k]=v;s.onload=resolve;s.onerror=()=>reject(Error('Script failed: '+name));document.body.append(s)});
function shell(bank){
  const total=Array.isArray(bank.setCounts)?bank.setCounts.reduce((a,b)=>a+b,0):(bank.total||((bank.sets?.length||0)*(bank.questionsPerSet||0)));
  return '<div class="wrap">'+
  '<section id="dashboard" class="panel"><div class="hero mbu-dashboard-header"><div class="mbu-dashboard-title"><h1>'+bank.label+' Dashboard</h1><div class="mini mbu-dashboard-overall" id="overall">0 / '+total+' completed</div></div></div><div id="cards" class="grid"></div><div id="missed-review" class="hidden"></div></section>'+
  '<section id="quiz" class="panel hidden"><div class="header"><div class="row"><span class="badge" id="set-badge"></span><button class="btn out" id="mbuFlagBtn" onclick="mbuToggleFlag(currentData[currentIndex])">☆ Flag</button><button class="btn out" onclick="mbuReportQuestion(currentData[currentIndex])">Report</button><button class="btn out" onclick="document.getElementById(\'mbuNavigator\').classList.toggle(\'hidden\')">Navigator</button><button class="btn out mbu-return" onclick="goDashboard()">← '+bank.label+' Home</button></div><div class="progress" id="progress"></div></div>'+
  '<div class="stats"><div>Completed: <strong id="completed">0</strong>/<span id="total">0</span></div><div>Score: <strong id="score">0</strong>%</div><div>Missed: <strong id="missed">0</strong></div></div><div id="mbuNavigator" class="row hidden"></div><div class="type" id="type"></div><div class="stem" id="stem"></div><div class="mbu-crossout-hint">Tip: Right-click an answer to cross it out.</div><div class="image hidden" id="image"></div><div class="options" id="options"></div><div class="row" id="multi-submit-row" style="display:none;margin:4px 0 18px;justify-content:flex-end"><button class="btn" id="submit-multi" onclick="submitAnswer()">Submit Answer</button></div><div class="explain" id="explain"><div id="explain-text"></div><div class="cite" id="citation"></div></div><div class="controls"><button class="btn out" id="prev" onclick="nav(-1)">Previous</button><div class="row"><button class="btn out" onclick="resetCurrent()">Reset</button><button class="btn" id="next" onclick="nav(1)">Next</button></div></div></section></div>'
}
async function start(){
  if(!bankId)throw Error('Canonical bank id is missing');
  const response=await fetch(new URL('banks.json',exam),{cache:'no-store'});
  if(!response.ok)throw Error('Bank manifest HTTP '+response.status);
  const manifest=await response.json(),bank=(manifest.banks||[]).find(x=>x.id===bankId);
  if(!bank||bank.engine!=='canonical')throw Error('Canonical bank config not found: '+bankId);
  document.title=bank.label+' | Practice Sets';document.body.className='mbu-bank1-ui';document.body.innerHTML=shell(bank);
  window.MBU_QUIZ_CONFIG={id:bank.id,title:bank.label,studioBankKey:bank.studioKey,storageKey:bank.storageKey,dataUrl:bank.data,legacyFormat:bank.legacyFormat||null,imageBase:bank.imageBase||null};
  await Promise.all([loadStyle('site-nav.css'),loadStyle('bank1-quiz-ui.css')]);
  await loadScript('site-nav.js',{page:bank.id});
  await loadScript('studio-sync.js');
  await loadScript('navigator.js');
  await loadScript('calculator.js');
  await loadScript('quiz-engine.js');
  await loadScript('auto-update.js');
}
start().catch(e=>{console.error('Canonical bank page failed to initialize',e);document.body.className='mbu-bank1-ui';document.body.innerHTML='<div class="wrap"><section class="panel"><h1>Quiz bank could not load</h1><div class="mini">'+String(e.message||e)+'</div></section></div>'});
})();