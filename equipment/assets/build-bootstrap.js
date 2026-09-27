/* Immutable SRNA Study Tool build bootstrap.
   Page behavior is always loaded from build-versioned assets; this file only resolves the current build and sequences them. */
(()=>{'use strict';
const script=document.currentScript,cfg=window.MBU_BOOT||{},assetsBase=new URL(cfg.assetsBase||'./',script?.src||location.href),buildUrl=new URL(cfg.buildUrl||'../build.json',script?.src||location.href);document.documentElement.dataset.mbuBoot='loading';const gate=document.createElement('style');gate.textContent='html[data-mbu-boot="loading"] body>*{pointer-events:none}html[data-mbu-boot="loading"] body>#srna-legal-gate{pointer-events:auto}';document.head.append(gate);
const specOf=x=>typeof x==='string'?{src:x}:x||{};
async function start(){
  const response=await fetch(buildUrl.href+'?t='+Date.now(),{cache:'no-store',credentials:'same-origin'});
  if(!response.ok)throw Error('Build manifest HTTP '+response.status);
  const manifest=await response.json(),build=manifest&&typeof manifest.build==='string'?manifest.build.trim():'';
  if(!build)throw Error('Invalid build manifest');
  const urlFor=src=>{const u=new URL(src,assetsBase);u.searchParams.set('b',build);return u};
  const jsonCache=new Map();
  const fetchJSON=async(input,{cache='force-cache',timeout=12000}={})=>{
    const url=new URL(input,location.href),key=url.href;if(jsonCache.has(key))return jsonCache.get(key);
    const request=(async()=>{const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeout);try{const response=await fetch(url,{cache,credentials:'same-origin',signal:ctl.signal});if(!response.ok)throw Error('HTTP '+response.status+' for '+url.pathname);const text=await response.text();if(!text.trim())throw Error('Empty JSON response for '+url.pathname);try{return JSON.parse(text)}catch(e){throw Error('Invalid JSON at '+url.pathname+': '+e.message)}}finally{clearTimeout(timer)}})();
    jsonCache.set(key,request);try{return await request}catch(e){jsonCache.delete(key);throw e}
  };
  const loadStyle=src=>new Promise((resolve,reject)=>{const l=document.createElement('link');l.rel='stylesheet';l.href=urlFor(src).href;l.onload=resolve;l.onerror=()=>reject(Error('Stylesheet failed: '+src));document.head.append(l)});
  const loadScript=async raw=>{const spec=specOf(raw);await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=urlFor(spec.src).href;for(const [k,v] of Object.entries(spec.data||{}))s.dataset[k]=String(v);s.onload=resolve;s.onerror=()=>reject(Error('Script failed: '+spec.src));document.body.append(s)});if(spec.waitFor){const pending=window[spec.waitFor];if(pending&&typeof pending.then==='function')await pending}};
  window.MBU_BUILD_ID=build;window.MBUBuild={id:build,assetsBase,buildUrl,urlFor,loadStyle,loadScript,fetchJSON};
  await loadStyle('app-core.css');
  await loadScript('app-core.js');
  await loadScript('legal-gate.js');
  if(window.SRNALegalReady)await window.SRNALegalReady;
  await loadScript('study-intelligence.js');
  await loadScript('question-search.js');
  await loadScript('supabase-config.js');
  await loadScript('supabase-sync.js');
  await Promise.all((cfg.styles||[]).map(loadStyle));
  for(const entry of cfg.scripts||[])await loadScript(entry);
  if(typeof cfg.ready==='function')await cfg.ready();
  return build
}
const ready=start().finally(()=>{delete document.documentElement.dataset.mbuBoot;gate.remove()}).catch(e=>{console.error('SRNA Study Tool bootstrap failed',e);throw e});
window.MBUPageReady=ready;if(cfg.readyGlobal)window[cfg.readyGlobal]=ready;
})();