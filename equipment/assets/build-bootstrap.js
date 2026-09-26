/* Immutable MBU build bootstrap.
   Page behavior is always loaded from build-versioned assets; this file only resolves the current build and sequences them. */
(()=>{'use strict';
const script=document.currentScript,cfg=window.MBU_BOOT||{},assetsBase=new URL(cfg.assetsBase||'./',script?.src||location.href),buildUrl=new URL(cfg.buildUrl||'../build.json',script?.src||location.href);document.documentElement.dataset.mbuBoot='loading';const gate=document.createElement('style');gate.textContent='html[data-mbu-boot="loading"] body{pointer-events:none}';document.head.append(gate);
const specOf=x=>typeof x==='string'?{src:x}:x||{};
async function start(){
  const response=await fetch(buildUrl.href+'?t='+Date.now(),{cache:'no-store',credentials:'same-origin'});
  if(!response.ok)throw Error('Build manifest HTTP '+response.status);
  const manifest=await response.json(),build=manifest&&typeof manifest.build==='string'?manifest.build.trim():'';
  if(!build)throw Error('Invalid build manifest');
  const urlFor=src=>{const u=new URL(src,assetsBase);u.searchParams.set('b',build);return u};
  const loadStyle=src=>new Promise((resolve,reject)=>{const l=document.createElement('link');l.rel='stylesheet';l.href=urlFor(src).href;l.onload=resolve;l.onerror=()=>reject(Error('Stylesheet failed: '+src));document.head.append(l)});
  const loadScript=async raw=>{const spec=specOf(raw);await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=urlFor(spec.src).href;for(const [k,v] of Object.entries(spec.data||{}))s.dataset[k]=String(v);s.onload=resolve;s.onerror=()=>reject(Error('Script failed: '+spec.src));document.body.append(s)});if(spec.waitFor){const pending=window[spec.waitFor];if(pending&&typeof pending.then==='function')await pending}};
  window.MBU_BUILD_ID=build;window.MBUBuild={id:build,assetsBase,buildUrl,urlFor,loadStyle,loadScript};
  await Promise.all((cfg.styles||[]).map(loadStyle));
  for(const entry of cfg.scripts||[])await loadScript(entry);
  if(typeof cfg.ready==='function')await cfg.ready();
  return build
}
const ready=start().finally(()=>{delete document.documentElement.dataset.mbuBoot;gate.remove()}).catch(e=>{console.error('MBU bootstrap failed',e);throw e});
window.MBUPageReady=ready;if(cfg.readyGlobal)window[cfg.readyGlobal]=ready;
})();