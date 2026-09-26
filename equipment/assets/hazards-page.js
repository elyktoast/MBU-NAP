/* Build-driven Hazards page loader. Runtime config lives in banks.json. */
(()=>{'use strict';
const runtime=window.MBUBuild,pageId=document.body?.dataset.mbuHazard||'',exam=new URL('../exam-1/',runtime?.assetsBase||location.href);
async function start(){
  if(!runtime)throw Error('MBU build runtime is missing');
  const response=await fetch(new URL('banks.json',exam),{cache:'no-store'});if(!response.ok)throw Error('Hazards manifest HTTP '+response.status);
  const manifest=await response.json(),cfg=(manifest.hazards?.pages||[]).find(x=>x.id===pageId);if(!cfg)throw Error('Hazards config not found: '+pageId);
  await Promise.all([runtime.loadStyle('site-nav.css'),runtime.loadStyle('bank1-quiz-ui.css')]);
  await runtime.loadScript({src:'site-nav.js',data:{page:pageId}});
  await runtime.loadScript('studio-sync.js');await runtime.loadScript('navigator.js');
  if(cfg.runtime==='standard')await runtime.loadScript('hazards-standard-engine.js');else await runtime.loadScript('hazards-quiz-engine.js');
  await runtime.loadScript('calculator.js');
  let ready;
  if(cfg.runtime==='standard')ready=MBUHazardsStandardEngine.startFromData({dataUrl:cfg.data,setFilter:cfg.setFilter,store:cfg.storageKey,bankKey:cfg.bankKey,setNumber:cfg.setNumber});
  else ready=MBUHazardsQuizEngine.startFromData({dataUrl:cfg.data,setFilter:cfg.setFilter,imageBase:cfg.imageBase,key:cfg.storageKey,bankKey:cfg.bankKey,badge:cfg.badge,summaryTitle:cfg.summaryTitle,resetMessage:cfg.resetMessage});
  window.MBUHazardsRuntimeReady=ready;await ready;window.MBUCalculator?.besideFlag();await runtime.loadScript('auto-update.js');return true
}
window.MBUHazardsPageReady=start().catch(e=>{console.error('Hazards page failed to initialize',e);const d=document.getElementById('dashboard')||document.getElementById('main');if(d)d.innerHTML='<div class="card"><h2>Hazards set could not load</h2><p>'+String(e.message||e)+'</p></div>';throw e});
})();