/* Shared application core: diagnostics, accessibility helpers, and local-first sync groundwork. */
(()=>{'use strict';
const runtime=window.MBUBuild,APP='MBU-NAP',SYNC_SCHEMA=1,DEVICE_KEY='mbu_device_id_v1',META_KEY='mbu_sync_meta_v1',errors=[],adapters=new Map();
let manifestPromise=null,toolsReturnFocus=null;

const now=()=>Date.now();
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const safeJSON=(raw,fallback)=>{try{const v=JSON.parse(raw);return v??fallback}catch{return fallback}};
function randomId(){try{return crypto.randomUUID()}catch{return 'dev-'+now().toString(36)+'-'+Math.random().toString(36).slice(2)}}
function deviceId(){let id=localStorage.getItem(DEVICE_KEY);if(!id){id=randomId();localStorage.setItem(DEVICE_KEY,id)}return id}
function readMeta(){const v=safeJSON(localStorage.getItem(META_KEY),{});return plain(v)?v:{}}
function writeMeta(meta){localStorage.setItem(META_KEY,JSON.stringify(meta))}
function record(kind,error,detail={}){
  const item={at:new Date().toISOString(),kind:String(kind||'error'),message:String(error?.message||error||'Unknown error'),detail:plain(detail)?detail:{}};
  errors.push(item);if(errors.length>25)errors.shift();return item
}
window.addEventListener('error',e=>record('window-error',e.error||e.message,{file:e.filename||'',line:e.lineno||0,column:e.colno||0}));
window.addEventListener('unhandledrejection',e=>record('unhandled-rejection',e.reason));

async function manifest(){
  if(!manifestPromise)manifestPromise=runtime.fetchJSON(new URL('../exam-1/banks.json',runtime.assetsBase),{cache:'no-store'}).catch(e=>{manifestPromise=null;throw e});
  return manifestPromise
}
async function trackedKeys(){
  const m=await manifest(),keys=new Set(['mbu_exam1_studio_v1']);
  for(const b of m.banks||[])if(b.storageKey)keys.add(b.storageKey);
  for(const p of m.hazards?.pages||[])if(p.storageKey)keys.add(p.storageKey);
  return [...keys].sort()
}
function touchStore(key){
  if(!key||key===META_KEY||key===DEVICE_KEY)return null;
  const meta=readMeta(),prev=plain(meta[key])?meta[key]:{},entry={revision:(Number(prev.revision)||0)+1,updatedAt:now(),deviceId:deviceId()};
  meta[key]=entry;writeMeta(meta);return entry
}
function metaRank(x){return [Number(x?.updatedAt)||0,Number(x?.revision)||0,String(x?.deviceId||'')]}
function isRemoteNewer(remote,local){
  const a=metaRank(remote),b=metaRank(local);
  if(a[0]!==b[0])return a[0]>b[0];if(a[1]!==b[1])return a[1]>b[1];return a[2]>b[2]
}
async function exportSnapshot(){
  const keys=await trackedKeys(),meta=readMeta(),stores={};
  for(const key of keys){const raw=localStorage.getItem(key);if(raw!==null)stores[key]=raw}
  return{app:APP,schema:SYNC_SCHEMA,createdAt:now(),deviceId:deviceId(),build:window.MBU_BUILD_ID||'',stores,meta:Object.fromEntries(keys.filter(k=>meta[k]).map(k=>[k,meta[k]]))}
}
function validateSnapshot(s){
  if(!plain(s)||s.app!==APP||Number(s.schema)!==SYNC_SCHEMA||!plain(s.stores))throw Error('This is not a compatible MBU-NAP backup.');
  for(const [key,raw] of Object.entries(s.stores))if(typeof key!=='string'||typeof raw!=='string')throw Error('Backup contains an invalid save entry.');
  return s
}
async function importSnapshot(input,{mode='newer'}={}){
  const s=validateSnapshot(input),allowed=new Set(await trackedKeys()),localMeta=readMeta(),nextMeta={...localMeta};let imported=0,skipped=0,unknown=0;
  for(const [key,raw] of Object.entries(s.stores)){
    if(!allowed.has(key)){unknown++;continue}
    const localRaw=localStorage.getItem(key),remoteMeta=plain(s.meta?.[key])?s.meta[key]:{updatedAt:Number(s.createdAt)||0,revision:0,deviceId:String(s.deviceId||'')},should=mode==='replace'||localRaw===null||isRemoteNewer(remoteMeta,localMeta[key]);
    if(!should){skipped++;continue}
    localStorage.setItem(key,raw);nextMeta[key]={revision:Number(remoteMeta.revision)||0,updatedAt:Number(remoteMeta.updatedAt)||Number(s.createdAt)||now(),deviceId:String(remoteMeta.deviceId||s.deviceId||'import')};imported++
  }
  writeMeta(nextMeta);return{imported,skipped,unknown}
}
async function downloadBackup(){
  const snapshot=await exportSnapshot(),blob=new Blob([JSON.stringify(snapshot,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='mbu-nap-backup-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),0);return snapshot
}
async function importFile(file,opts){if(!file)throw Error('No backup file selected.');return importSnapshot(JSON.parse(await file.text()),opts)}
function registerAdapter(name,adapter){
  if(!name||!plain(adapter)||(typeof adapter.pull!=='function'&&typeof adapter.push!=='function'))throw Error('Sync adapter must implement pull and/or push.');
  adapters.set(String(name),adapter);return true
}
async function syncWith(name){
  const adapter=adapters.get(String(name));if(!adapter)throw Error('Sync adapter is not registered: '+name);
  let merge={imported:0,skipped:0,unknown:0};
  if(typeof adapter.pull==='function'){const remote=await adapter.pull({app:APP,schema:SYNC_SCHEMA,deviceId:deviceId()});if(remote)merge=await importSnapshot(remote)}
  const snapshot=await exportSnapshot();if(typeof adapter.push==='function')await adapter.push(snapshot);
  return{...merge,pushed:typeof adapter.push==='function'}
}

function ensureA11y(){
  let live=document.getElementById('mbu-app-live');if(!live){live=document.createElement('div');live.id='mbu-app-live';live.className='mbu-visually-hidden';live.setAttribute('role','status');live.setAttribute('aria-live','polite');document.body.append(live)}
  if(!document.querySelector('.mbu-skip-link')){const a=document.createElement('a');a.className='mbu-skip-link';a.href='#mbu-main';a.textContent='Skip to main content';a.onclick=()=>setTimeout(()=>document.getElementById('mbu-main')?.focus(),0);document.body.prepend(a)}
  const main=document.querySelector('#dashboard:not(.hidden),#home:not(.hidden),#main,.container,.wrap');if(main&&!document.getElementById('mbu-main')){main.id='mbu-main';main.tabIndex=-1}
  for(const el of document.querySelectorAll('.progress,#progress,#qprog')){el.setAttribute('role','status');el.setAttribute('aria-live','polite')}
}
function announce(text){ensureA11y();const live=document.getElementById('mbu-app-live');if(live){live.textContent='';requestAnimationFrame(()=>{live.textContent=String(text||'')})}}
function focusQuestion(){
  const el=document.getElementById('stem')||document.getElementById('qstem')||document.querySelector('#quiz .stem,#main .stem');
  if(el){el.tabIndex=-1;el.focus({preventScroll:true})}
}
function diagnostics(){
  return{app:APP,build:window.MBU_BUILD_ID||'',deviceId:deviceId(),url:location.href,online:navigator.onLine,errors:[...errors],syncMeta:readMeta(),userAgent:navigator.userAgent}
}
async function copyDiagnostics(){const text=JSON.stringify(diagnostics(),null,2);if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);return text}

function closeTools(){const modal=document.getElementById('mbu-app-tools');if(!modal)return;modal.classList.remove('open');modal.setAttribute('aria-hidden','true');toolsReturnFocus?.focus?.();toolsReturnFocus=null}
async function refreshTools(){
  const modal=document.getElementById('mbu-app-tools');if(!modal)return;
  const keys=await trackedKeys(),saved=keys.filter(k=>localStorage.getItem(k)!==null).length;
  modal.querySelector('[data-build]').textContent=window.MBU_BUILD_ID||'unknown';
  modal.querySelector('[data-device]').textContent=deviceId().slice(0,12);
  modal.querySelector('[data-saves]').textContent=saved+' / '+keys.length;
  modal.querySelector('[data-errors]').textContent=String(errors.length)
}
function ensureTools(){
  if(document.getElementById('mbu-app-tools'))return;
  const wrap=document.createElement('div');wrap.innerHTML='<div id="mbu-app-tools" class="mbu-app-tools" role="dialog" aria-modal="true" aria-labelledby="mbu-app-tools-title" aria-hidden="true"><div class="mbu-app-tools__card"><div class="mbu-app-tools__head"><h2 id="mbu-app-tools-title">MBU-NAP Tools</h2><button type="button" data-close aria-label="Close tools">×</button></div><dl><div><dt>Build</dt><dd data-build></dd></div><div><dt>Device</dt><dd data-device></dd></div><div><dt>Saved stores</dt><dd data-saves></dd></div><div><dt>Captured errors</dt><dd data-errors></dd></div></dl><p class="mbu-app-tools__note">Progress is local-first. Backup/import works now; cloud adapters can be connected later without changing quiz save formats.</p><div class="mbu-app-tools__actions"><button type="button" data-export>Download backup</button><button type="button" data-import>Import backup</button><button type="button" data-copy>Copy diagnostics</button></div><input type="file" data-file accept="application/json,.json" hidden><div class="mbu-app-tools__status" role="status" aria-live="polite"></div></div></div>';document.body.append(wrap);
  const modal=document.getElementById('mbu-app-tools'),status=modal.querySelector('.mbu-app-tools__status'),file=modal.querySelector('[data-file]');
  modal.querySelector('[data-close]').onclick=closeTools;modal.onclick=e=>{if(e.target===modal)closeTools()};
  modal.querySelector('[data-export]').onclick=async()=>{try{await downloadBackup();status.textContent='Backup downloaded.'}catch(e){record('backup-export',e);status.textContent='Backup failed: '+e.message}};
  modal.querySelector('[data-import]').onclick=()=>file.click();
  file.onchange=async()=>{try{const result=await importFile(file.files?.[0]);status.textContent='Imported '+result.imported+' save'+(result.imported===1?'':'s')+'. Reload this page to use imported progress.';await refreshTools()}catch(e){record('backup-import',e);status.textContent='Import failed: '+e.message}finally{file.value=''}};
  modal.querySelector('[data-copy]').onclick=async()=>{try{await copyDiagnostics();status.textContent='Diagnostics copied.'}catch(e){status.textContent='Could not copy diagnostics.'}};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))closeTools()});
}
async function openTools(source){ensureTools();toolsReturnFocus=source||document.activeElement;const modal=document.getElementById('mbu-app-tools');modal.classList.add('open');modal.setAttribute('aria-hidden','false');await refreshTools();modal.querySelector('[data-close]').focus()}
function mountNav(nav){if(!nav||nav.querySelector('.mbu-global-nav__tools'))return;const b=document.createElement('button');b.type='button';b.className='mbu-global-nav__tools';b.textContent='Tools';b.setAttribute('aria-label','Open backup, sync, and diagnostics tools');b.onclick=()=>openTools(b);nav.append(b)}
document.addEventListener('DOMContentLoaded',ensureA11y,{once:true});
new MutationObserver(()=>ensureA11y()).observe(document.documentElement,{subtree:true,childList:true});

window.MBUDiagnostics={record,snapshot:diagnostics,copy:copyDiagnostics};
window.MBUSync={APP,schema:SYNC_SCHEMA,deviceId,touchStore,trackedKeys,exportSnapshot,importSnapshot,downloadBackup,importFile,registerAdapter,syncWith};
window.MBUAppCore={ensureA11y,announce,focusQuestion,mountNav,openTools,touchStore,diagnostics};
})();