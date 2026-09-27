/* SNAR Study Tool Supabase auth + cloud sync adapter. Uses only the public browser key and authenticated RLS. */
(()=>{'use strict';
const cfg=window.MBU_SUPABASE_CONFIG||{},sync=window.MBUSync,SESSION_KEY='mbu_supabase_session_v1',STATUS_EVENT='mbu:supabase-status',script=document.currentScript,APP_ROOT=new URL('../../',script?.src||location.href).href;
if(!cfg.url||!cfg.publishableKey||!sync){console.warn('Supabase sync is not configured');return}
const base=cfg.url.replace(/\/$/,''),AUTO_SYNC_INTERVAL=5*60*1000,LEGAL_TERMS_VERSION='2026-09-27-v3',LEGAL_PRIVACY_VERSION='2026-09-27-v3';
let syncing=false,lastSyncAt=0,lastState='signed-out',remoteByKey=new Map(),calibrationByKey=new Map(),calibrationFetchedAt=0,timer=null,autoSyncTimer=null,recoveryMode=false,legalAccepted=null;

const safeJSON=(raw,fallback=null)=>{try{return JSON.parse(raw)}catch{return fallback}};
const session=()=>safeJSON(localStorage.getItem(SESSION_KEY));
const emit=(state,detail={})=>{lastState=state;window.dispatchEvent(new CustomEvent(STATUS_EVENT,{detail:{state,lastSyncAt,...detail}}))};
function normalizeAuth(data){
  const source=data?.session||data;
  if(!source?.access_token||!source?.refresh_token)return null;
  const expiresAt=Number(source.expires_at)||Math.floor(Date.now()/1000)+(Number(source.expires_in)||3600);
  return{access_token:source.access_token,refresh_token:source.refresh_token,expires_at:expiresAt,user:data?.user||source.user||null}
}
function saveSession(s){if(s)localStorage.setItem(SESSION_KEY,JSON.stringify(s));else localStorage.removeItem(SESSION_KEY)}
async function hydrateUser(s){
  if(!s?.access_token)return s;
  try{const user=await raw('/auth/v1/user',{token:s.access_token});return{...s,user:user||s.user||null}}catch{return s}
}
async function consumeAuthRedirect(){
  if(!location.hash||location.hash.length<2)return null;
  const p=new URLSearchParams(location.hash.slice(1)),error=p.get('error_description')||p.get('error');
  if(error){
    history.replaceState(null,'',location.pathname+location.search);
    emit('error',{error});
    return null
  }
  if(!p.get('access_token')||!p.get('refresh_token'))return null;
  let s=normalizeAuth({
    access_token:p.get('access_token'),
    refresh_token:p.get('refresh_token'),
    expires_in:Number(p.get('expires_in')||3600),
    expires_at:Number(p.get('expires_at')||0)
  });
  if(!s)return null;
  s=await hydrateUser(s);saveSession(s);recoveryMode=p.get('type')==='recovery';
  history.replaceState(null,'',location.pathname+location.search);
  emit(recoveryMode?'password-recovery':'signed-in',{email:s.user?.email||''});
  return s
}

async function raw(path,{method='GET',body,token,headers={}}={}){
  const response=await fetch(base+path,{method,headers:{apikey:cfg.publishableKey,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
  const text=await response.text();const data=text?safeJSON(text,text):null;
  if(!response.ok){const msg=(data&&typeof data==='object'&&(data.msg||data.message||data.error_description||data.error))||('HTTP '+response.status);const e=Error(String(msg));e.status=response.status;throw e}
  return data
}
async function refresh(){
  const s=session();if(!s?.refresh_token)return null;
  try{const data=await raw('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:s.refresh_token}}),next=normalizeAuth(data);saveSession(next);return next}
  catch(e){saveSession(null);emit('signed-out',{error:e.message});return null}
}
async function validSession(){
  let s=session();if(!s)return null;
  if(Number(s.expires_at||0)*1000-Date.now()<60000)s=await refresh();
  return s
}
async function api(path,opts={}){
  const s=await validSession();if(!s?.access_token)throw Error('Sign in to use cloud sync.');
  return raw(path,{...opts,token:s.access_token})
}
async function refreshLegalAcceptance(){
  const s=await validSession();if(!s?.access_token){legalAccepted=null;return false}
  try{
    const ok=await raw('/rest/v1/rpc/snar_has_current_legal_acceptance',{method:'POST',token:s.access_token,body:{p_terms_version:LEGAL_TERMS_VERSION,p_privacy_version:LEGAL_PRIVACY_VERSION}});
    legalAccepted=ok===true;return legalAccepted
  }catch(e){
    legalAccepted=null;emit('error',{email:s.user?.email||'',error:'Could not verify account agreement: '+e.message});return false
  }
}
async function acceptCurrentLegal(adultAck=false){
  if(adultAck!==true)throw Error('Confirm that you are 18+ and agree to the current Terms and Privacy Notice.');
  const s=await validSession();if(!s?.access_token)throw Error('Sign in first.');
  const ok=await raw('/rest/v1/rpc/snar_accept_current_legal',{method:'POST',token:s.access_token,body:{p_terms_version:LEGAL_TERMS_VERSION,p_privacy_version:LEGAL_PRIVACY_VERSION,p_adult_ack:true}});
  legalAccepted=ok===true;if(!legalAccepted)throw Error('Could not record legal acceptance.');
  emit('signed-in',{email:s.user?.email||''});
  startAutoSync();
  setTimeout(()=>fullSync({reloadOnImport:true}).catch(()=>{}),50);
  setTimeout(()=>refreshCalibration(true).catch(()=>{}),100);
  return true
}
async function signIn(email,password){
  emit('signing-in');const data=await raw('/auth/v1/token?grant_type=password',{method:'POST',body:{email:String(email||'').trim(),password:String(password||'')}});
  const s=normalizeAuth(data);if(!s)throw Error('Supabase did not return a session.');saveSession(s);if(!await refreshLegalAcceptance()){emit('legal-required',{email:s.user?.email||email});return s}emit('signed-in',{email:s.user?.email||email});await fullSync({reloadOnImport:true});startAutoSync();return s
}
async function signUp(email,password,accepted=false){
  if(accepted!==true)throw Error('You must confirm that you are 18+ and agree to the Terms and Privacy Notice before creating an account.');
  const acceptedAt=new Date().toISOString();emit('signing-up');const data=await raw('/auth/v1/signup?redirect_to='+encodeURIComponent(APP_ROOT),{method:'POST',body:{email:String(email||'').trim(),password:String(password||''),data:{snar_terms_version:'2026-09-27-v3',snar_privacy_version:'2026-09-27-v3',snar_adult_ack:true,snar_accepted_at:acceptedAt}}}),s=normalizeAuth(data);
  if(s){saveSession(s);if(!await refreshLegalAcceptance())await acceptCurrentLegal(true);else{emit('signed-in',{email:s.user?.email||email});await fullSync({reloadOnImport:true});startAutoSync()}return{session:s,confirmationRequired:false}}
  emit('confirmation-required',{email:String(email||'').trim()});return{session:null,confirmationRequired:true}
}
async function signOut(){
  const s=session();try{if(s?.access_token)await raw('/auth/v1/logout',{method:'POST',token:s.access_token})}catch{}
  stopAutoSync();saveSession(null);legalAccepted=null;remoteByKey.clear();calibrationByKey.clear();calibrationFetchedAt=0;emit('signed-out')
}
async function resendConfirmation(email){
  const value=String(email||'').trim();if(!value)throw Error('Enter your email address first.');
  await raw('/auth/v1/resend?redirect_to='+encodeURIComponent(APP_ROOT),{method:'POST',body:{type:'signup',email:value}});
  emit('confirmation-required',{email:value});return true
}
async function requestPasswordReset(email){
  const value=String(email||'').trim();if(!value)throw Error('Enter your email address first.');
  await raw('/auth/v1/recover?redirect_to='+encodeURIComponent(APP_ROOT),{method:'POST',body:{email:value}});
  emit('recovery-sent',{email:value});return true
}
async function updatePassword(password){
  const value=String(password||'');if(value.length<8)throw Error('Password must be at least 8 characters.');
  const s=await validSession();if(!s?.access_token)throw Error('Open the password reset link from your email first.');
  await raw('/auth/v1/user',{method:'PUT',token:s.access_token,body:{password:value}});
  recoveryMode=false;emit('signed-in',{email:s.user?.email||''});return true
}
function currentUser(){return session()?.user||null}
async function deleteAccount(){
  const s=await validSession();if(!s?.access_token)throw Error('Sign in to delete your account.');
  await raw('/functions/v1/snar-delete-account',{method:'POST',body:{},token:s.access_token});
  stopAutoSync();saveSession(null);legalAccepted=null;remoteByKey.clear();calibrationByKey.clear();calibrationFetchedAt=0;emit('signed-out');return true
}
async function submitPrivacyRequest(requestType,details=''){
  const s=await validSession();if(!s?.user?.id)throw Error('Sign in to submit a privacy request.');
  const type=String(requestType||'').toLowerCase();
  if(!['access','correction','deletion','appeal','other'].includes(type))throw Error('Choose a valid privacy request type.');
  const rows=await api('/rest/v1/snar_privacy_requests',{method:'POST',body:{user_id:s.user.id,request_type:type,details:String(details||'').slice(0,4000)},headers:{Prefer:'return=representation'}});
  return Number(rows?.[0]?.id)||0
}
function requireLegal(){if(legalAccepted!==true)throw Error('Accept the current Terms and Privacy Notice first.')}
async function submitItemContribution(questionId,correct,responseMs=null,sessionMode='unknown'){
  requireLegal();
  const id=String(questionId||'').trim();if(!id)return false;
  const ms=responseMs==null?null:Math.max(0,Math.min(3600000,Math.round(Number(responseMs)||0)));
  const result=await api('/rest/v1/rpc/mbu_submit_item_contribution',{method:'POST',body:{p_question_id:id,p_correct:!!correct,p_response_ms:ms,p_session_mode:String(sessionMode||'unknown')}});
  return result===true
}
async function refreshCalibration(force=false){
  requireLegal();
  if(!force&&calibrationFetchedAt&&Date.now()-calibrationFetchedAt<300000)return calibrationByKey;
  const rows=await api('/rest/v1/mbu_item_calibration?select=question_id,unique_learners,correct_first_attempts,incorrect_first_attempts,adaptive_first_attempts,response_samples,avg_response_ms,p_value,difficulty_logit,standard_error,confidence,updated_at');
  calibrationByKey=new Map((rows||[]).map(row=>[String(row.question_id),row]));calibrationFetchedAt=Date.now();return calibrationByKey
}
function calibration(questionId){return calibrationByKey.get(String(questionId||''))||null}
async function listDevices(){
  requireLegal();
  const s=await validSession();if(!s?.user?.id)return[];
  const rows=await api('/rest/v1/mbu_sync_devices?select=device_id,device_label,app_build,first_seen_at,last_seen_at&user_id=eq.'+encodeURIComponent(s.user.id)+'&order=last_seen_at.desc');
  return(rows||[]).map(row=>({...row,current:row.device_id===sync.deviceId()}))
}
async function removeDevice(deviceId){
  requireLegal();
  const s=await validSession();if(!s?.user?.id)throw Error('Sign in to manage devices.');
  const id=String(deviceId||'');if(!id)throw Error('Device id is required.');if(id===sync.deviceId())throw Error('You cannot remove the device you are currently using.');
  await api('/rest/v1/mbu_sync_devices?user_id=eq.'+encodeURIComponent(s.user.id)+'&device_id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:{Prefer:'return=minimal'}});return true
}
async function listHistory(limit=30){
  requireLegal();
  const s=await validSession();if(!s?.user?.id)return[];
  const n=Math.max(1,Math.min(Number(limit)||30,100));
  return await api('/rest/v1/mbu_sync_versions?select=id,store_key,device_id,server_revision,saved_at,client_revision,client_updated_at&user_id=eq.'+encodeURIComponent(s.user.id)+'&order=saved_at.desc&limit='+n)
}
async function restoreVersion(versionId){
  requireLegal();
  const s=await validSession();if(!s?.user?.id)throw Error('Sign in to restore cloud history.');
  const id=Number(versionId);if(!Number.isInteger(id)||id<1)throw Error('Invalid history version.');
  const versions=await api('/rest/v1/mbu_sync_versions?select=id,store_key,payload,server_revision,saved_at&user_id=eq.'+encodeURIComponent(s.user.id)+'&id=eq.'+id+'&limit=1'),version=versions?.[0];
  if(!version)throw Error('That history version is no longer available.');
  const rows=await api('/rest/v1/mbu_sync_state?select=store_key,server_revision,client_revision&user_id=eq.'+encodeURIComponent(s.user.id)+'&store_key=eq.'+encodeURIComponent(version.store_key)+'&limit=1'),current=rows?.[0];
  if(!current)throw Error('Current cloud state for this study area was not found.');
  const result=await api('/rest/v1/rpc/mbu_sync_write_state',{method:'POST',body:{
    p_store_key:version.store_key,p_payload:version.payload,p_device_id:sync.deviceId(),
    p_client_revision:(Number(current.client_revision)||0)+1,p_client_updated_at:new Date().toISOString(),
    p_expected_server_revision:Number(current.server_revision)||0
  }});
  if(result?.applied===false)throw Error('Cloud progress changed while restoring. Refresh history and try again.');
  remoteByKey.delete(version.store_key);await fullSync({reloadOnImport:true});return{storeKey:version.store_key,savedAt:version.saved_at}
}
function cloudSnapshot(rows,user){
  const stores={},meta={};for(const row of rows||[]){stores[row.store_key]=JSON.stringify(row.payload);meta[row.store_key]={revision:Number(row.client_revision)||0,updatedAt:Date.parse(row.client_updated_at)||0,deviceId:String(row.device_id||'cloud'),serverRevision:Number(row.server_revision)||0}}
  return{app:sync.APP,schema:sync.schema,createdAt:Date.now(),deviceId:'cloud:'+user.id,stores,meta}
}
async function pull(){
  const s=await validSession();if(!s?.user?.id)return null;
  const rows=await api('/rest/v1/mbu_sync_state?select=store_key,payload,device_id,client_revision,client_updated_at,server_revision,server_updated_at&user_id=eq.'+encodeURIComponent(s.user.id));
  remoteByKey=new Map((rows||[]).map(r=>[r.store_key,r]));return cloudSnapshot(rows,s.user)
}
function equivalent(remote,payload,meta){
  return !!remote&&Number(remote.client_revision)===Number(meta?.revision||0)&&String(remote.device_id||'')===String(meta?.deviceId||'')&&Date.parse(remote.client_updated_at)===Number(meta?.updatedAt||0)&&JSON.stringify(remote.payload)===JSON.stringify(payload)
}
async function push(snapshot){
  const s=await validSession();if(!s?.user?.id)return false;let conflictImports=0;
  for(const [key,rawValue] of Object.entries(snapshot.stores||{})){
    let payload;try{payload=JSON.parse(rawValue)}catch{continue}
    const meta=snapshot.meta?.[key]||{revision:0,updatedAt:snapshot.createdAt,deviceId:snapshot.deviceId,serverRevision:0},remote=remoteByKey.get(key);
    if(equivalent(remote,payload,meta))continue;
    const result=await api('/rest/v1/rpc/mbu_sync_write_state',{method:'POST',body:{
      p_store_key:key,
      p_payload:payload,
      p_device_id:String(meta.deviceId||snapshot.deviceId),
      p_client_revision:Number(meta.revision)||0,
      p_client_updated_at:new Date(Number(meta.updatedAt)||snapshot.createdAt||Date.now()).toISOString(),
      p_expected_server_revision:Number(remote?.server_revision??meta.serverRevision??0)||0
    }});
    const row=result?.row||null;
    if(row)remoteByKey.set(key,row);
    if(result?.applied===false&&row){
      const merged=await sync.importSnapshot(cloudSnapshot([row],s.user));
      conflictImports+=Number(merged?.imported)||0;
    }else if(result?.applied===false){
      remoteByKey.delete(key);
    }
  }
  await api('/rest/v1/mbu_sync_devices?on_conflict=user_id,device_id',{method:'POST',body:{user_id:s.user.id,device_id:sync.deviceId(),device_label:navigator.platform||'Browser',app_build:window.MBU_BUILD_ID||'',last_seen_at:new Date().toISOString()},headers:{Prefer:'resolution=merge-duplicates,return=minimal'}});
  return{conflictImports}
}
sync.registerAdapter('supabase',{pull,push});

async function fullSync({reloadOnImport=false}={}){
  requireLegal();
  if(syncing)return null;const s=await validSession();if(!s?.user?.id){emit('signed-out');return null}
  syncing=true;emit('syncing',{email:s.user?.email||''});
  try{
    const result=await sync.syncWith('supabase');lastSyncAt=Date.now();emit('synced',{email:s.user?.email||'',result});
    if(reloadOnImport&&(result?.imported>0||result?.pushResult?.conflictImports>0)){sessionStorage.setItem('mbu_cloud_reload','1');location.reload()}
    return result
  }catch(e){emit('error',{email:s.user?.email||'',error:e.message});throw e}
  finally{syncing=false}
}
async function pushLocal(){
  if(legalAccepted!==true)return null;
  if(syncing)return null;const s=await validSession();if(!s?.user?.id)return null;
  if(!remoteByKey.size)return fullSync();
  syncing=true;emit('syncing',{email:s.user?.email||''});
  try{const snapshot=await sync.exportSnapshot();await push(snapshot);lastSyncAt=Date.now();emit('synced',{email:s.user?.email||''});return true}
  catch(e){emit('error',{email:s.user?.email||'',error:e.message});throw e}
  finally{syncing=false}
}
function scheduleSync(delay=1500){if(!session()||legalAccepted!==true)return;clearTimeout(timer);timer=setTimeout(()=>{timer=null;pushLocal().catch(()=>{})},delay)}
function stopAutoSync(){if(autoSyncTimer){clearInterval(autoSyncTimer);autoSyncTimer=null}}
function startAutoSync(){
  stopAutoSync();if(!session()||legalAccepted!==true)return;
  autoSyncTimer=setInterval(()=>{if(session()&&legalAccepted===true&&navigator.onLine)fullSync({reloadOnImport:true}).catch(()=>{})},AUTO_SYNC_INTERVAL)
}
function status(){const s=session();return{signedIn:!!s?.access_token,email:s?.user?.email||'',state:lastState,lastSyncAt,user:s?.user||null,recoveryMode,legalAccepted,termsVersion:LEGAL_TERMS_VERSION,privacyVersion:LEGAL_PRIVACY_VERSION,autoSyncIntervalMs:AUTO_SYNC_INTERVAL,nextAutoSyncAt:s?.access_token&&legalAccepted===true?(lastSyncAt||Date.now())+AUTO_SYNC_INTERVAL:0}}
window.addEventListener('focus',()=>{if(session()&&legalAccepted===true&&Date.now()-lastSyncAt>120000)fullSync().catch(()=>{})});
window.addEventListener('online',()=>{if(session()&&legalAccepted===true)fullSync().catch(()=>{})});
async function handleAuthRedirect(){
  const redirected=await consumeAuthRedirect();if(!redirected)return false;
  if(!recoveryMode&&!await refreshLegalAcceptance()){emit('legal-required',{email:redirected.user?.email||''});return true}
  startAutoSync();setTimeout(()=>fullSync({reloadOnImport:true}).catch(()=>{}),100);return true
}
window.addEventListener('hashchange',()=>handleAuthRedirect().catch(e=>{emit('error',{error:e.message});console.error('Supabase auth redirect failed',e)}));
window.MBUSupabase={signIn,signUp,signOut,deleteAccount,resendConfirmation,requestPasswordReset,updatePassword,status,currentUser,refreshLegalAcceptance,acceptCurrentLegal,submitPrivacyRequest,submitItemContribution,refreshCalibration,calibration,listDevices,removeDevice,listHistory,restoreVersion,syncNow:()=>fullSync({reloadOnImport:true}),scheduleSync,refresh,appRoot:APP_ROOT,autoSyncIntervalMs:AUTO_SYNC_INTERVAL};
const authReady=(async()=>{
  if(await handleAuthRedirect())return true;
  if(session()){
    if(sessionStorage.getItem('mbu_cloud_reload')==='1')sessionStorage.removeItem('mbu_cloud_reload');
    const valid=await validSession();
    if(valid?.user?.id){if(!recoveryMode&&!await refreshLegalAcceptance()){emit('legal-required',{email:valid.user?.email||''});return true}startAutoSync();setTimeout(()=>fullSync({reloadOnImport:true}).catch(()=>{}),400);setTimeout(()=>refreshCalibration().catch(()=>{}),250);emit(recoveryMode?'password-recovery':'signed-in',{email:valid.user?.email||''});return true}
  }
  emit('signed-out');return false
})().catch(e=>{emit('error',{error:e.message});console.error('Supabase auth bootstrap failed',e);return false});
window.MBUAuthReady=authReady;
})();
