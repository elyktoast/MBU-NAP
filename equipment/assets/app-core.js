(()=>{'use strict';
const runtime=window.MBUBuild,APP='SNAR Study Tool',SYNC_SCHEMA=1,DEVICE_KEY='mbu_device_id_v1',META_KEY='mbu_sync_meta_v1',errors=[],adapters=new Map(),ROOT_URL=new URL('../../',runtime.assetsBase);
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
  const m=await manifest(),keys=new Set(['mbu_exam1_studio_v1','mbu_study_intelligence_v1']);
  for(const b of m.banks||[])if(b.storageKey)keys.add(b.storageKey);
  for(const p of m.hazards?.pages||[])if(p.storageKey)keys.add(p.storageKey);
  if(m.features?.questionGenerator?.storageKey)keys.add(m.features.questionGenerator.storageKey);
  return [...keys].sort()
}
function touchStore(key){
  if(!key||key===META_KEY||key===DEVICE_KEY)return null;
  const meta=readMeta(),prev=plain(meta[key])?meta[key]:{},entry={revision:(Number(prev.revision)||0)+1,updatedAt:now(),deviceId:deviceId(),serverRevision:Number(prev.serverRevision)||0};
  meta[key]=entry;writeMeta(meta);window.MBUSupabase?.scheduleSync?.();return entry
}
function metaRank(x){return [Number(x?.updatedAt)||0,Number(x?.revision)||0,String(x?.deviceId||'')]}
function isRemoteNewer(remote,local){
  const remoteServer=Number(remote?.serverRevision)||0,localServer=Number(local?.serverRevision)||0;
  if(remoteServer>0&&localServer>0&&remoteServer!==localServer)return remoteServer>localServer;
  const a=metaRank(remote),b=metaRank(local);
  if(a[0]!==b[0])return a[0]>b[0];if(a[1]!==b[1])return a[1]>b[1];return a[2]>b[2]
}
async function exportSnapshot(){
  const keys=await trackedKeys(),meta=readMeta(),stores={};
  for(const key of keys){const raw=localStorage.getItem(key);if(raw!==null)stores[key]=raw}
  return{app:APP,schema:SYNC_SCHEMA,createdAt:now(),deviceId:deviceId(),build:window.MBU_BUILD_ID||'',stores,meta:Object.fromEntries(keys.filter(k=>meta[k]).map(k=>[k,meta[k]]))}
}
function validateSnapshot(s){
  if(!plain(s)||Number(s.schema)!==SYNC_SCHEMA||!plain(s.stores))throw Error('This is not a compatible SNAR Study Tool backup.');
  for(const [key,raw] of Object.entries(s.stores))if(typeof key!=='string'||typeof raw!=='string')throw Error('Backup contains an invalid save entry.');
  return s
}
async function importSnapshot(input,{mode='newer'}={}){
  const s=validateSnapshot(input),allowed=new Set(await trackedKeys()),localMeta=readMeta(),nextMeta={...localMeta};let imported=0,skipped=0,unknown=0;
  for(const [key,raw] of Object.entries(s.stores)){
    if(!allowed.has(key)){unknown++;continue}
    const localRaw=localStorage.getItem(key),remoteMeta=plain(s.meta?.[key])?s.meta[key]:{updatedAt:Number(s.createdAt)||0,revision:0,deviceId:String(s.deviceId||'')},should=mode==='replace'||localRaw===null||isRemoteNewer(remoteMeta,localMeta[key]);
    if(!should){skipped++;continue}
    localStorage.setItem(key,raw);nextMeta[key]={revision:Number(remoteMeta.revision)||0,updatedAt:Number(remoteMeta.updatedAt)||Number(s.createdAt)||now(),deviceId:String(remoteMeta.deviceId||s.deviceId||'import'),serverRevision:Number(remoteMeta.serverRevision)||0};imported++
  }
  writeMeta(nextMeta);return{imported,skipped,unknown}
}
async function downloadBackup(){
  const snapshot=await exportSnapshot(),blob=new Blob([JSON.stringify(snapshot,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='snar-study-tool-backup-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),0);return snapshot
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
  const snapshot=await exportSnapshot();let pushResult=null;if(typeof adapter.push==='function')pushResult=await adapter.push(snapshot);
  return{...merge,pushed:typeof adapter.push==='function',pushResult}
}

function ensureLegalFooter(){
  if(document.getElementById('snar-legal-footer'))return;
  const privacyURL=new URL('privacy.html',ROOT_URL).href,termsURL=new URL('terms.html',ROOT_URL).href,footer=document.createElement('footer');
  footer.id='snar-legal-footer';footer.className='snar-legal-footer';footer.innerHTML='<a href="'+privacyURL+'">Privacy Notice</a><span aria-hidden="true">·</span><a href="'+termsURL+'">Terms of Use</a><span>SNAR Study Tool</span>';
  document.body.append(footer)
}
function ensureA11y(){ensureLegalFooter();
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

function formatTime(ts){return ts?new Date(ts).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}):'Not yet'}
function lastLocalSave(){const vals=Object.values(readMeta()).map(x=>Number(x?.updatedAt)||0).filter(Boolean);return vals.length?Math.max(...vals):0}
function cloudStatusText(info){
  if(!info?.signedIn){if(info?.state==='confirmation-required')return 'Confirmation email sent';if(info?.state==='recovery-sent')return 'Password reset email sent';return 'Signed out'}
  if(info.legalAccepted!==true)return info.state==='error'?'Could not verify account agreement':'Terms & Privacy acceptance required';
  if(info.accessStatus==='suspended')return 'Account access suspended';
  if(info.state==='syncing')return 'Syncing…';
  if(info.state==='error')return 'Sync error';
  if(info.lastSyncAt)return 'Synced '+formatTime(info.lastSyncAt);
  return 'Connected'
}
function cloudAutoSyncText(info){
  if(!info?.signedIn)return 'Starts when signed in';
  if(info.legalAccepted!==true)return 'Paused until account agreement is accepted';
  if(info.accessStatus==='suspended')return 'Cloud sync and Adaptive Mode are suspended';
  const mins=Math.max(1,Math.round(Number(info.autoSyncIntervalMs||0)/60000)),next=Number(info.nextAutoSyncAt)||0;
  return 'Every '+mins+' min'+(next?' · next ~'+formatTime(next):'')
}
function modalFocusable(modal){return [...modal.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href],details summary')].filter(x=>x.offsetParent!==null)}
function trapModalKey(e,modal,close){
  if(e.key==='Escape'){close();return}
  if(e.key!=='Tab')return;
  const f=modalFocusable(modal);if(!f.length)return;const first=f[0],last=f[f.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
}
function closeTools(){const modal=document.getElementById('mbu-app-tools');if(!modal)return;modal.classList.remove('open');modal.setAttribute('aria-hidden','true');toolsReturnFocus?.focus?.();toolsReturnFocus=null}
function closeAccount(){const modal=document.getElementById('mbu-account-panel');if(!modal)return;modal.classList.remove('open');modal.setAttribute('aria-hidden','true');toolsReturnFocus?.focus?.();toolsReturnFocus=null}
function updateCloudChip(){
  const b=document.querySelector('.mbu-global-nav__cloud');if(!b)return;
  const info=window.MBUSupabase?.status?.()||{signedIn:false,state:'unavailable'},label=b.querySelector('[data-cloud-chip-label]');
  b.dataset.state=info.state||'signed-out';
  label.textContent=!info.signedIn?'Cloud: Signed out':info.legalAccepted!==true?'Cloud: Action required':info.accessStatus==='suspended'?'Cloud: Suspended':info.state==='syncing'?'Cloud: Syncing':info.state==='error'?'Cloud: Error':'Cloud: Synced';
  b.title=info.signedIn?(info.email||'Account')+' · '+cloudStatusText(info):'Sign in for cross-device sync';
  b.setAttribute('aria-label',b.title)
}
async function refreshTools(){
  const modal=document.getElementById('mbu-app-tools');if(!modal)return;
  const keys=await trackedKeys(),saved=keys.filter(k=>localStorage.getItem(k)!==null).length,info=window.MBUSupabase?.status?.()||{signedIn:false,state:'unavailable'},local=lastLocalSave();
  modal.querySelector('[data-tools-cloud]').textContent=window.MBUSupabase?cloudStatusText(info):'Unavailable';
  modal.querySelector('[data-tools-auto]').textContent=window.MBUSupabase?cloudAutoSyncText(info):'Unavailable';
  modal.querySelector('[data-tools-saves]').textContent=saved+' of '+keys.length;
  modal.querySelector('[data-tools-saves-help]').textContent=saved?'Progress exists in '+saved+' study area'+(saved===1?'':'s')+' on this device.':'No study progress has been saved on this device yet.';
  modal.querySelector('[data-tools-local]').textContent=local?formatTime(local):'No local saves yet';
  modal.querySelector('[data-build]').textContent=window.MBU_BUILD_ID||'unknown';
  modal.querySelector('[data-device]').textContent=deviceId().slice(0,12);
  modal.querySelector('[data-errors]').textContent=errors.length?errors.length+' captured':'0 issues detected';
  const syncBtn=modal.querySelector('[data-tools-sync]');syncBtn.hidden=!info.signedIn;syncBtn.disabled=info.state==='syncing'||info.legalAccepted!==true||info.accessStatus==='suspended';
  modal.querySelector('[data-tools-account]').textContent=info.signedIn?'Manage account':'Sign in to cloud';
  updateCloudChip()
}
function refreshAccount(){
  const modal=document.getElementById('mbu-account-panel');if(!modal)return;
  const info=window.MBUSupabase?.status?.()||{signedIn:false,state:'unavailable'},out=modal.querySelector('[data-cloud-signed-out]'),inside=modal.querySelector('[data-cloud-signed-in]'),recovery=modal.querySelector('[data-cloud-recovery]');
  out.hidden=!!info.signedIn;inside.hidden=!info.signedIn||!!info.recoveryMode;recovery.hidden=!info.recoveryMode;
  modal.querySelector('[data-cloud-user]').textContent=info.email||'';
  const legalRequired=modal.querySelector('[data-cloud-legal-required]');
  if(legalRequired)legalRequired.hidden=!(info.signedIn&&!info.recoveryMode&&info.legalAccepted!==true);
  modal.querySelector('[data-cloud-status]').textContent=window.MBUSupabase?cloudStatusText(info):'Cloud sync unavailable';
  modal.querySelector('[data-cloud-auto]').textContent=window.MBUSupabase?cloudAutoSyncText(info):'';
  const syncBtn=modal.querySelector('[data-cloud-sync]');if(syncBtn)syncBtn.disabled=info.legalAccepted!==true||info.accessStatus==='suspended'||info.state==='syncing';
  const deviceDetails=modal.querySelector('[data-cloud-devices-details]'),historyDetails=modal.querySelector('[data-cloud-history-details]');
  if(deviceDetails)deviceDetails.hidden=info.legalAccepted!==true||info.accessStatus==='suspended';
  if(historyDetails)historyDetails.hidden=info.legalAccepted!==true||info.accessStatus==='suspended';
  const suspended=modal.querySelector('[data-cloud-suspended]');if(suspended)suspended.hidden=!(info.signedIn&&info.accessStatus==='suspended');
  updateCloudChip()
}
function storeLabel(key){
  const map={
    SRNA_COMBINED_EXAM_SET_1_2026_V1:'Quiz Bank 1',
    srna_all5_groundup_v1:'Quiz Bank 2',
    srna_equipment_dashboard_v1:'Quiz Bank 3',
    MBU_COMBINED_BANK_2026_V1:'Combined',
    SRNA_HAZARDS_BANK_1_2026_V2:'Hazards Set 1',
    SRNA_HAZARDS_BANK_2_2026_V1:'Hazards Set 2',
    hazards_practice3_progress_2026_V2:'Hazards Set 3',
    hazards_harder_progress_2026_V1:'Hazards Challenge',
    mbu_exam1_studio_v1:'Study Studio',
    mbu_study_intelligence_v1:'Study Intelligence',
    mbu_generated_questions_v1:'Generated Questions'
  };return map[key]||key
}
function relativeTime(ts){
  const t=Date.parse(ts)||Number(ts)||0;if(!t)return 'Unknown';
  const d=Math.max(0,Date.now()-t),min=Math.floor(d/60000),hr=Math.floor(d/3600000),day=Math.floor(d/86400000);
  return min<1?'Just now':min<60?min+'m ago':hr<24?hr+'h ago':day+'d ago'
}
async function renderCloudDevices(modal){
  const host=modal.querySelector('[data-cloud-devices]');if(!host)return;
  host.innerHTML='<div class="mbu-muted">Loading devices…</div>';
  try{
    const rows=await MBUSupabase.listDevices();
    host.innerHTML=rows.map(r=>'<div class="mbu-cloud-row"><div><strong>'+escapeHTML(r.current?'This device':(r.device_label||'Browser device'))+'</strong><span>'+escapeHTML(relativeTime(r.last_seen_at))+(r.app_build?' · '+escapeHTML(r.app_build):'')+'</span></div>'+(r.current?'<span class="mbu-pill">Current</span>':'<button type="button" class="secondary" data-remove-device="'+escapeHTML(r.device_id)+'" >Forget</button>')+'</div>').join('')||'<div class="mbu-muted">No synced devices found.</div>';
    host.querySelectorAll('[data-remove-device]').forEach(btn=>btn.onclick=async()=>{if(!confirm('Forget this device entry? It can reappear if that device syncs again.'))return;btn.disabled=true;try{await MBUSupabase.removeDevice(btn.dataset.removeDevice);await renderCloudDevices(modal)}catch(e){modal.querySelector('[data-account-message]').textContent=e.message;btn.disabled=false}})
  }catch(e){host.innerHTML='<div class="mbu-muted">Could not load devices: '+escapeHTML(e.message)+'</div>'}
}
async function renderCloudHistory(modal){
  const host=modal.querySelector('[data-cloud-history]');if(!host)return;
  host.innerHTML='<div class="mbu-muted">Loading restore points…</div>';
  try{
    const rows=await MBUSupabase.listHistory(30);
    host.innerHTML=rows.map(r=>'<div class="mbu-cloud-row"><div><strong>'+escapeHTML(storeLabel(r.store_key))+'</strong><span>'+escapeHTML(new Date(r.saved_at).toLocaleString())+' · revision '+Number(r.server_revision||0)+'</span></div><button type="button" class="secondary" data-restore-version="'+Number(r.id)+'">Restore</button></div>').join('')||'<div class="mbu-muted">No cloud restore points yet.</div>';
    host.querySelectorAll('[data-restore-version]').forEach(btn=>btn.onclick=async()=>{if(!confirm('Restore this saved version? Your current cloud state will be preserved in version history first.'))return;btn.disabled=true;const message=modal.querySelector('[data-account-message]');try{message.textContent='Restoring…';await MBUSupabase.restoreVersion(Number(btn.dataset.restoreVersion));message.textContent='Restore complete.'}catch(e){message.textContent=e.message;btn.disabled=false}})
  }catch(e){host.innerHTML='<div class="mbu-muted">Could not load history: '+escapeHTML(e.message)+'</div>'}
}
function escapeHTML(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function downloadAdminJSON(name,data){
  const blob=new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),0)
}
async function refreshAdminPanel(modal){
  const section=modal?.querySelector('[data-admin-details]');if(!section||!window.MBUSupabase)return;
  const info=MBUSupabase.status();if(!info.signedIn||info.legalAccepted!==true){section.hidden=true;return}
  try{
    const admin=await MBUSupabase.adminStatus();if(!admin?.is_admin){section.hidden=true;return}
    section.hidden=false;
    const [summary,accounts,requests]=await Promise.all([MBUSupabase.adminSystemSummary(),MBUSupabase.adminAccounts(),MBUSupabase.adminPrivacyRequests()]);
    const stats=section.querySelector('[data-admin-stats]');
    if(stats)stats.innerHTML=[
      ['Accounts',summary.accounts],['Active',summary.active_accounts],['Suspended',summary.suspended_accounts],
      ['Guests active ~15m',summary.guest_active_15m],['Guest sessions 24h',summary.guest_sessions_24h],
      ['CAT users',summary.cat_users],['Adaptive first attempts',summary.adaptive_first_attempts],
      ['Calibrated items ≥25',summary.calibrated_items_25],['Privacy requests',summary.privacy_requests],
      ['Legal records',summary.legal_acceptances]
    ].map(([label,value])=>'<div><span>'+escapeHTML(label)+'</span><strong>'+Number(value||0)+'</strong></div>').join('');
    const accountsHost=section.querySelector('[data-admin-accounts]');
    if(accountsHost){
      accountsHost.innerHTML=(accounts||[]).map(a=>{
        const adminBadge=a.is_admin?'<span class="mbu-pill">Admin</span>':'';
        const catBadge=a.cat_used?'<span class="mbu-pill">CAT used</span>':'';
        const legalBadge=a.current_legal_accepted?'<span class="mbu-pill">Current legal</span>':'<span class="mbu-muted">Legal update pending</span>';
        const access=String(a.access_status||'active');
        const accessButton=a.is_admin?'':('<button type="button" class="secondary" data-admin-access="'+escapeHTML(a.user_id)+'" data-next-status="'+(access==='active'?'suspended':'active')+'">'+(access==='active'?'Suspend':'Grant access')+'</button><button type="button" class="mbu-danger-action" data-admin-delete-account="'+escapeHTML(a.user_id)+'" data-admin-delete-email="'+escapeHTML(a.email||'this account')+'">Delete</button>');
        return '<div class="mbu-cloud-row"><div><strong>'+escapeHTML(a.email||a.user_id)+'</strong><span>'+escapeHTML(access)+' · created '+escapeHTML(new Date(a.created_at).toLocaleString())+(a.last_sign_in_at?' · last sign-in '+escapeHTML(new Date(a.last_sign_in_at).toLocaleString()):'')+'</span><small>'+adminBadge+' '+catBadge+' '+legalBadge+'</small></div><div class="mbu-app-tools__actions">'+accessButton+'</div></div>'
      }).join('')||'<div class="mbu-muted">No accounts found.</div>';
      accountsHost.querySelectorAll('[data-admin-access]').forEach(btn=>btn.onclick=async()=>{const msg=modal.querySelector('[data-account-message]');try{btn.disabled=true;await MBUSupabase.adminSetAccountAccess(btn.dataset.adminAccess,btn.dataset.nextStatus);msg.textContent=btn.dataset.nextStatus==='active'?'Account access granted.':'Account access suspended.';await refreshAdminPanel(modal)}catch(e){msg.textContent=e.message}finally{btn.disabled=false}});
      accountsHost.querySelectorAll('[data-admin-delete-account]').forEach(btn=>btn.onclick=async()=>{const msg=modal.querySelector('[data-account-message]'),label=btn.dataset.adminDeleteEmail||'this account';if(!confirm('Delete '+label+' and its active account-linked cloud data? This cannot be undone.'))return;if(!confirm('Final confirmation: permanently delete '+label+'?'))return;try{btn.disabled=true;await MBUSupabase.adminDeleteAccount(btn.dataset.adminDeleteAccount);msg.textContent='Account deleted.';await refreshAdminPanel(modal)}catch(e){msg.textContent=e.message}finally{btn.disabled=false}})
    }
    const privacyHost=section.querySelector('[data-admin-privacy]');
    if(privacyHost){
      privacyHost.innerHTML=(requests||[]).map(r=>'<div class="mbu-cloud-row"><div><strong>#'+Number(r.id)+' · '+escapeHTML(r.request_type)+'</strong><span>'+escapeHTML(r.status)+' · '+escapeHTML(new Date(r.created_at).toLocaleString())+'</span><small>'+escapeHTML(r.details||'No details')+'</small></div><select data-admin-request-status="'+Number(r.id)+'"><option value="received">received</option><option value="in_review">in_review</option><option value="completed">completed</option><option value="denied">denied</option></select><button type="button" class="secondary" data-admin-request-save="'+Number(r.id)+'">Save</button></div>').join('')||'<div class="mbu-muted">No privacy requests.</div>';
      for(const r of requests||[]){const sel=privacyHost.querySelector('[data-admin-request-status="'+Number(r.id)+'"]');if(sel)sel.value=r.status}
      privacyHost.querySelectorAll('[data-admin-request-save]').forEach(btn=>btn.onclick=async()=>{const id=Number(btn.dataset.adminRequestSave),sel=privacyHost.querySelector('[data-admin-request-status="'+id+'"]'),msg=modal.querySelector('[data-account-message]');try{btn.disabled=true;await MBUSupabase.adminUpdatePrivacyRequest(id,sel.value);msg.textContent='Privacy request #'+id+' updated.';await refreshAdminPanel(modal)}catch(e){msg.textContent=e.message}finally{btn.disabled=false}})
    }
  }catch(e){section.hidden=true}
}
function ensureAccountPanel(){
  if(document.getElementById('mbu-account-panel'))return;
  const wrap=document.createElement('div'),privacyURL=new URL('privacy.html',ROOT_URL).href,termsURL=new URL('terms.html',ROOT_URL).href;wrap.innerHTML='<div id="mbu-account-panel" class="mbu-account-panel" role="dialog" aria-modal="true" aria-labelledby="mbu-account-title" aria-hidden="true"><div class="mbu-account-panel__card"><div class="mbu-app-tools__head"><div><div class="mbu-section-kicker">Account</div><h2 id="mbu-account-title">SNAR Study Tool Sync</h2></div><button type="button" data-account-close aria-label="Close account">×</button></div><div data-cloud-signed-out><p class="mbu-app-tools__note">Sign in for cross-device sync and to use Adaptive Mode.</p><label>Email<input type="email" data-cloud-email autocomplete="email"></label><label>Password<input type="password" data-cloud-password autocomplete="current-password"></label><label class="mbu-consent"><input type="checkbox" data-cloud-consent> <span>I am at least 18 years old. I agree to the <a href="'+termsURL+'" target="_blank" rel="noopener">Terms of Use</a> and acknowledge the <a href="'+privacyURL+'" target="_blank" rel="noopener">Privacy Notice</a>.</span></label><div class="mbu-app-tools__actions"><button type="button" data-cloud-signin>Sign in</button><button type="button" class="secondary" data-cloud-signup>Create account</button><button type="button" class="secondary" data-cloud-forgot>Forgot password</button><button type="button" class="secondary" data-cloud-resend>Resend confirmation</button></div><p class="mbu-account-privacy">Signed-in first-attempt performance may be used to test and improve questions and Adaptive Mode. Population calibration is de-identified and aggregated. <a href="'+privacyURL+'" target="_blank" rel="noopener">Read the full Privacy Notice.</a></p></div><div data-cloud-signed-in hidden><div class="mbu-account-identity"><span class="mbu-status-dot"></span><div><span class="mbu-muted">Signed in as</span><strong data-cloud-user></strong></div></div><div data-cloud-legal-required hidden class="mbu-tools-section"><h3>Updated account agreement required</h3><p>Before cloud sync or Adaptive Mode can continue, confirm the current Terms of Use and Privacy Notice for this account.</p><label class="mbu-consent"><input type="checkbox" data-cloud-reaccept-consent> <span>I am at least 18 years old. I agree to the current <a href="'+termsURL+'" target="_blank" rel="noopener">Terms of Use</a> and acknowledge the current <a href="'+privacyURL+'" target="_blank" rel="noopener">Privacy Notice</a>.</span></label><div class="mbu-app-tools__actions"><button type="button" data-cloud-reaccept>Accept and continue</button></div></div><div data-cloud-suspended hidden class="mbu-tools-section"><h3>Account access suspended</h3><p>Cloud synchronization and Adaptive Mode are disabled for this account. Privacy requests, legal information, sign out, and self-service deletion remain available.</p></div><div class="mbu-account-status"><strong data-cloud-status></strong><span data-cloud-auto></span></div><div class="mbu-app-tools__actions"><button type="button" data-cloud-sync>Sync now</button><button type="button" class="secondary" data-cloud-signout>Sign out</button></div><details class="mbu-tools-details" data-cloud-devices-details><summary>Devices</summary><div class="mbu-tools-details__body"><p>Forget old device entries. This does not sign out another browser.</p><div data-cloud-devices></div></div></details><details class="mbu-tools-details" data-cloud-history-details><summary>Restore Progress</summary><div class="mbu-tools-details__body"><p>Restore an earlier cloud version.</p><div data-cloud-history></div></div></details><details class="mbu-tools-details"><summary>Privacy & Account</summary><div class="mbu-tools-details__body"><p><a href="'+privacyURL+'" target="_blank" rel="noopener">Privacy Notice</a> · <a href="'+termsURL+'" target="_blank" rel="noopener">Terms of Use</a></p><p>Submit a privacy request.</p><label>Request type<select data-privacy-type><option value="access">Access</option><option value="correction">Correction</option><option value="deletion">Deletion</option><option value="appeal">Appeal decision</option><option value="other">Other</option></select></label><label>Details<textarea data-privacy-details maxlength="4000" rows="3" placeholder="Optional details"></textarea></label><div class="mbu-app-tools__actions"><button type="button" data-privacy-submit>Submit privacy request</button></div><p>Back up first if needed. Account deletion removes cloud data and cannot be undone.</p><button type="button" class="mbu-danger-action" data-cloud-delete-account>Delete account & data</button></div></details><details class="mbu-tools-details" data-admin-details hidden><summary>Admin & Compliance</summary><div class="mbu-tools-details__body"><p>Operator-only, least-privilege controls. Raw learner study payloads, passwords, and raw CAT contribution rows are not exposed here.</p><div class="mbu-tools-grid compact" data-admin-stats></div><p class="mbu-muted">Guest counts are approximate browser sessions, not verified people. CAT users are accounts with at least one eligible first-attempt response in Adaptive Mode.</p><div class="mbu-app-tools__actions"><button type="button" class="secondary" data-admin-refresh>Refresh</button><button type="button" class="secondary" data-admin-export-legal>Export legal assent audit</button><button type="button" class="secondary" data-admin-retention>Run retention cleanup</button></div><h4>Accounts</h4><p class="mbu-muted">Suspend or re-grant cloud and Adaptive Mode access, or permanently delete a non-admin account. Your operator-admin account is protected from suspension and admin-panel deletion.</p><div data-admin-accounts></div><h4>Privacy requests</h4><div data-admin-privacy></div></div></details></div><div data-cloud-recovery hidden><p class="mbu-app-tools__note">Enter a new password for your SNAR Study Tool account.</p><label>New password<input type="password" data-cloud-new-password autocomplete="new-password" minlength="8"></label><div class="mbu-app-tools__actions"><button type="button" data-cloud-update-password>Update password</button></div></div><div class="mbu-app-tools__status" data-account-message role="status" aria-live="polite"></div></div></div>';document.body.append(wrap);
  const modal=document.getElementById('mbu-account-panel'),email=modal.querySelector('[data-cloud-email]'),password=modal.querySelector('[data-cloud-password]'),newPassword=modal.querySelector('[data-cloud-new-password]'),consent=modal.querySelector('[data-cloud-consent]'),message=modal.querySelector('[data-account-message]');
  const action=async fn=>{try{message.textContent='Working';await fn();password.value='';message.textContent='';refreshAccount();await refreshAdminPanel(modal);await refreshTools()}catch(e){record('cloud-sync',e);message.textContent=e.message;refreshAccount()}};
  modal.querySelector('[data-cloud-signin]').onclick=()=>action(()=>MBUSupabase.signIn(email.value,password.value));
  const reaccept=modal.querySelector('[data-cloud-reaccept]'),reacceptConsent=modal.querySelector('[data-cloud-reaccept-consent]');if(reaccept)reaccept.onclick=()=>{if(!reacceptConsent?.checked){message.textContent='Confirm that you are 18+ and agree to the current Terms and Privacy Notice.';return}action(()=>MBUSupabase.acceptCurrentLegal(true))};
  modal.querySelector('[data-cloud-signup]').onclick=()=>{if(!consent.checked){message.textContent='Confirm that you are 18+ and agree to the Terms and Privacy Notice before creating an account.';return}action(()=>MBUSupabase.signUp(email.value,password.value,true))};
  modal.querySelector('[data-cloud-forgot]').onclick=()=>action(()=>MBUSupabase.requestPasswordReset(email.value));
  modal.querySelector('[data-cloud-resend]').onclick=()=>action(()=>MBUSupabase.resendConfirmation(email.value));
  modal.querySelector('[data-cloud-update-password]').onclick=()=>action(()=>MBUSupabase.updatePassword(newPassword.value));
  modal.querySelector('[data-cloud-sync]').onclick=()=>action(()=>MBUSupabase.syncNow());
  modal.querySelector('[data-cloud-signout]').onclick=()=>action(()=>MBUSupabase.signOut());
  modal.querySelector('[data-cloud-delete-account]').onclick=async()=>{if(!confirm('Delete your SNAR Study Tool account and account-linked cloud data? This cannot be undone.'))return;if(!confirm('Final confirmation: permanently delete this account?'))return;try{message.textContent='Deleting account…';await MBUSupabase.deleteAccount();message.textContent='Deleted.';refreshAccount();await refreshTools()}catch(e){record('account-delete',e);message.textContent=e.message;refreshAccount()}};
   const privacySubmit=modal.querySelector('[data-privacy-submit]');if(privacySubmit)privacySubmit.onclick=async()=>{try{privacySubmit.disabled=true;message.textContent='Submitting…';const id=await MBUSupabase.submitPrivacyRequest(modal.querySelector('[data-privacy-type]').value,modal.querySelector('[data-privacy-details]').value);modal.querySelector('[data-privacy-details]').value='';message.textContent='Privacy request received'+(id?' (#'+id+')':'')+'.'}catch(e){record('privacy-request',e);message.textContent=e.message}finally{privacySubmit.disabled=false}};
  modal.querySelector('[data-cloud-devices-details]').ontoggle=e=>{if(e.currentTarget.open)renderCloudDevices(modal)};
  modal.querySelector('[data-cloud-history-details]').ontoggle=e=>{if(e.currentTarget.open)renderCloudHistory(modal)};
  const adminRefresh=modal.querySelector('[data-admin-refresh]');if(adminRefresh)adminRefresh.onclick=()=>refreshAdminPanel(modal);
  const adminExport=modal.querySelector('[data-admin-export-legal]');if(adminExport)adminExport.onclick=async()=>{try{adminExport.disabled=true;const rows=await MBUSupabase.adminLegalAcceptances();downloadAdminJSON('snar-legal-assent-audit-'+new Date().toISOString().slice(0,10)+'.json',{exported_at:new Date().toISOString(),records:rows});message.textContent='Legal assent audit exported.'}catch(e){message.textContent=e.message}finally{adminExport.disabled=false}};
  const adminRetention=modal.querySelector('[data-admin-retention]');if(adminRetention)adminRetention.onclick=async()=>{if(!confirm('Run the documented retention cleanup now?'))return;try{adminRetention.disabled=true;const out=await MBUSupabase.adminRetentionCleanup();message.textContent='Retention cleanup complete: '+Number(out.sync_history_deleted||0)+' sync versions, '+Number(out.privacy_requests_deleted||0)+' privacy requests, '+Number(out.legal_acceptances_deleted||0)+' expired legal records removed.';await refreshAdminPanel(modal)}catch(e){message.textContent=e.message}finally{adminRetention.disabled=false}};
  modal.querySelector('[data-account-close]').onclick=closeAccount;modal.onclick=e=>{if(e.target===modal)closeAccount()};modal.onkeydown=e=>trapModalKey(e,modal,closeAccount)
}
async function openAccount(source){
  ensureAccountPanel();toolsReturnFocus=source||document.activeElement;const modal=document.getElementById('mbu-account-panel');modal.classList.add('open');modal.setAttribute('aria-hidden','false');refreshAccount();
  await refreshAdminPanel(modal);const info=window.MBUSupabase?.status?.();(info?.recoveryMode?modal.querySelector('[data-cloud-new-password]'):info?.signedIn&&info.legalAccepted!==true?modal.querySelector('[data-cloud-reaccept-consent]'):info?.signedIn?modal.querySelector('[data-cloud-sync]'):modal.querySelector('[data-cloud-email]'))?.focus()
}
function ensureTools(){
  if(document.getElementById('mbu-app-tools'))return;
  const wrap=document.createElement('div');wrap.innerHTML='<div id="mbu-app-tools" class="mbu-app-tools" role="dialog" aria-modal="true" aria-labelledby="mbu-app-tools-title" aria-hidden="true"><div class="mbu-app-tools__card"><div class="mbu-app-tools__head"><div><div class="mbu-section-kicker">Study center</div><h2 id="mbu-app-tools-title">Tools</h2></div><button type="button" data-close aria-label="Close tools">×</button></div><section class="mbu-tools-section"><h3>Study & Sync</h3><div class="mbu-tools-grid"><div><span>Cloud</span><strong data-tools-cloud></strong></div><div><span>Auto sync</span><strong data-tools-auto></strong></div><div><span>Saved study areas</span><strong data-tools-saves></strong><small data-tools-saves-help></small></div><div><span>Last local save</span><strong data-tools-local></strong></div></div><div class="mbu-app-tools__actions"><button type="button" data-tools-sync>Sync now</button><button type="button" class="secondary" data-tools-account>Manage account</button></div><p class="mbu-app-tools__note">Progress saves locally immediately; cloud sync adds cross-device backup.</p></section><details class="mbu-tools-details"><summary>Backup & Recovery</summary><div class="mbu-tools-details__body"><p>Manual backups let you restore or move progress yourself.</p><div class="mbu-app-tools__actions"><button type="button" data-export>Download backup</button><button type="button" class="secondary" data-import>Import backup</button></div><input type="file" data-file accept="application/json,.json" hidden></div></details><details class="mbu-tools-details"><summary>Troubleshooting & App Info</summary><div class="mbu-tools-details__body"><div class="mbu-tools-grid compact"><div><span>Issues</span><strong data-errors></strong></div><div><span>Device</span><strong data-device></strong></div><div class="wide"><span>Build</span><strong data-build></strong></div></div><div class="mbu-app-tools__actions"><button type="button" class="secondary" data-copy>Copy diagnostics</button></div></div></details><div class="mbu-app-tools__status" role="status" aria-live="polite"></div></div></div>';document.body.append(wrap);
  const modal=document.getElementById('mbu-app-tools'),status=modal.querySelector('.mbu-app-tools__status'),file=modal.querySelector('[data-file]');
  modal.querySelector('[data-close]').onclick=closeTools;modal.onclick=e=>{if(e.target===modal)closeTools()};modal.onkeydown=e=>trapModalKey(e,modal,closeTools);
  modal.querySelector('[data-tools-account]').onclick=()=>{closeTools();openAccount(document.querySelector('.mbu-global-nav__cloud')||document.querySelector('.mbu-global-nav__tools'))};
  modal.querySelector('[data-tools-sync]').onclick=async()=>{try{status.textContent='Syncing…';await MBUSupabase.syncNow();status.textContent='Sync complete.';await refreshTools()}catch(e){record('cloud-sync',e);status.textContent='Sync failed: '+e.message}};
  modal.querySelector('[data-export]').onclick=async()=>{try{await downloadBackup();status.textContent='Backup downloaded.'}catch(e){record('backup-export',e);status.textContent='Backup failed: '+e.message}};
  modal.querySelector('[data-import]').onclick=()=>file.click();
  file.onchange=async()=>{try{const result=await importFile(file.files?.[0]);const parts=['Imported '+result.imported+' newer study area'+(result.imported===1?'':'s')];if(result.skipped)parts.push('kept '+result.skipped+' current/newer area'+(result.skipped===1?'':'s'));if(result.unknown)parts.push('ignored '+result.unknown+' unknown/legacy entr'+(result.unknown===1?'y':'ies'));status.textContent=parts.join(' · ')+'. Reload this page to use imported progress.';await refreshTools()}catch(e){record('backup-import',e);status.textContent='Import failed: '+e.message}finally{file.value=''}};
  modal.querySelector('[data-copy]').onclick=async()=>{try{await copyDiagnostics();status.textContent='Diagnostics copied.'}catch(e){status.textContent='Could not copy diagnostics.'}}
}
async function openTools(source){ensureTools();toolsReturnFocus=source||document.activeElement;const modal=document.getElementById('mbu-app-tools');modal.classList.add('open');modal.setAttribute('aria-hidden','false');await refreshTools();modal.querySelector('[data-close]').focus()}
function mountNav(nav){
  if(!nav||nav.querySelector('.mbu-global-nav__utilities'))return;
  const utilities=document.createElement('div');utilities.className='mbu-global-nav__utilities';
  const search=document.createElement('button');search.type='button';search.className='mbu-global-nav__search';search.textContent='Search';search.setAttribute('aria-label','Search all questions');search.onclick=()=>window.MBUQuestionSearch?.open?.(search);
  const cloud=document.createElement('button');cloud.type='button';cloud.className='mbu-global-nav__cloud';cloud.innerHTML='<span class="mbu-status-dot" aria-hidden="true"></span><span data-cloud-chip-label>Cloud: Signed out</span>';cloud.onclick=()=>openAccount(cloud);
  const tools=document.createElement('button');tools.type='button';tools.className='mbu-global-nav__tools';tools.textContent='Tools';tools.setAttribute('aria-label','Open tools and diagnostics');tools.onclick=()=>openTools(tools);
  utilities.append(search,cloud,tools);nav.append(utilities);updateCloudChip()
}
window.addEventListener('mbu:supabase-status',()=>{refreshAccount();refreshTools();updateCloudChip()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureA11y,{once:true});else ensureA11y();

window.MBUDiagnostics={record,snapshot:diagnostics,copy:copyDiagnostics};
window.MBUSync={APP,schema:SYNC_SCHEMA,deviceId,touchStore,trackedKeys,exportSnapshot,importSnapshot,downloadBackup,importFile,registerAdapter,syncWith};
window.MBUAppCore={ensureA11y,announce,focusQuestion,mountNav,openTools,openAccount,touchStore,diagnostics};
})();