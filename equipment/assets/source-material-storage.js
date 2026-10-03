(()=>{'use strict';
const cfg=window.MBU_SUPABASE_CONFIG||{},SESSION='mbu_supabase_session_v1',BUCKET='source-materials';
function session(){try{return JSON.parse(localStorage.getItem(SESSION)||'null')||{}}catch{return{}}}
function userId(jwt){try{const p=jwt.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(atob(p.padEnd(Math.ceil(p.length/4)*4,'='))).sub||''}catch{return''}}
function safeName(name){return String(name||'material').replace(/[^a-zA-Z0-9._-]+/g,'_').replace(/^_+|_+$/g,'').slice(-180)||'material'}
async function save(file){
 if(!file)throw Error('Choose a file first.');
 const s=session(),jwt=s.access_token||'',uid=userId(jwt);if(!jwt||!uid)throw Error('Sign in before saving source material.');
 if(!cfg.url||!cfg.publishableKey)throw Error('Source material storage is not configured.');
 const path=uid+'/'+Date.now()+'-'+safeName(file.name);
 const res=await fetch(cfg.url+'/storage/v1/object/'+BUCKET+'/'+path,{method:'POST',headers:{Authorization:'Bearer '+jwt,apikey:cfg.publishableKey,'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:file});
 const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.message||data.error||'Could not save source material.');
 return {path,name:file.name,size:file.size,type:file.type||'',savedAt:new Date().toISOString()}
}
window.MBUSourceMaterialStorage=Object.freeze({save});
})();