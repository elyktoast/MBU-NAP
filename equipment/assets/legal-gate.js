/* One-time local click-through for SRNA Study Tool guest use. */
(()=>{'use strict';
const VERSION='2026-09-27-v5',KEY='snar_legal_acceptance_v5',script=document.currentScript,root=new URL('../../',script?.src||location.href);
let volatileAccepted=false;
function accepted(){
  if(volatileAccepted)return true;
  try{return JSON.parse(localStorage.getItem(KEY)||'null')?.version===VERSION}catch{return false}
}
function remember(){
  volatileAccepted=true;
  try{localStorage.setItem(KEY,JSON.stringify({version:VERSION,acceptedAt:new Date().toISOString()}))}catch{}
}
function requireAcceptance(){
  if(accepted())return Promise.resolve(true);
  return new Promise(resolve=>{
    const wrap=document.createElement('div');wrap.id='srna-legal-gate';wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-labelledby','srna-legal-title');
    wrap.innerHTML='<div class="srna-legal-card"><div class="mbu-section-kicker">Independent study tool</div><h1 id="srna-legal-title">Before you continue</h1><p>SRNA Study Tool is an independent educational resource and is not affiliated with a university, school, certification body, or examination provider.</p><p>By selecting <strong>I agree and continue</strong>, you confirm: I agree to the <a href="'+new URL('terms.html',root).href+'" target="_blank" rel="noopener">Terms of Use</a> and acknowledge the <a href="'+new URL('privacy.html',root).href+'" target="_blank" rel="noopener">Privacy Notice</a>.</p><p class="srna-legal-small">Normal study features do not require an account. Adaptive Mode and cloud synchronization require an account.</p><button type="button" id="srna-legal-accept" data-legal-continue>I agree and continue</button></div>';
    const style=document.createElement('style');style.id='srna-legal-gate-style';style.textContent='#srna-legal-gate{position:fixed;inset:0;z-index:15000;display:flex;align-items:center;justify-content:center;padding:16px;background:#edf2f7;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#2d3748;pointer-events:auto}.srna-legal-card{width:min(520px,100%);padding:24px;border:1px solid #cbd5e0;border-radius:16px;background:#fff;box-shadow:0 18px 48px #0002}.srna-legal-card h1{margin:4px 0 12px;color:#1a365d}.srna-legal-card p{line-height:1.5}.srna-legal-card a{color:#2b6cb0;font-weight:700}.srna-legal-card button{min-height:44px;padding:10px 16px;border:0;border-radius:9px;background:#1a365d;color:#fff;font-weight:800;cursor:pointer;touch-action:manipulation}.srna-legal-small{font-size:13px;color:#718096}';
    document.head.append(style);document.body.append(wrap);
    const btn=wrap.querySelector('#srna-legal-accept');
    const finish=()=>{remember();wrap.remove();style.remove();resolve(true)};
    btn.addEventListener('click',finish,{once:true});
    btn.focus();
  })
}
window.SRNALegal={VERSION,KEY,accepted,requireAcceptance};window.SRNALegalReady=requireAcceptance();
})();