(()=>{'use strict';
const VERSION='2026-09-27',KEY='snar_legal_ack_'+VERSION.replaceAll('-','_');
function accepted(){return localStorage.getItem(KEY)==='1'}
function mount(){
  if(accepted()||document.getElementById('snar-legal-gate'))return Promise.resolve(true);
  const script=document.currentScript,root=new URL('../../',script?.src||location.href);
  const privacy=new URL('privacy.html',root).href,terms=new URL('terms.html',root).href;
  const style=document.createElement('style');style.id='snar-legal-gate-style';style.textContent='.snar-legal-gate{position:fixed;inset:0;z-index:13000;display:flex;align-items:center;justify-content:center;padding:16px;background:#edf2f7f2;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#1a202c}.snar-legal-card{width:min(520px,100%);padding:24px;border:1px solid #cbd5e0;border-radius:16px;background:#fff;box-shadow:0 18px 48px #0002}.snar-legal-card h1{margin:0 0 8px;color:#1a365d;font-size:25px}.snar-legal-card p{line-height:1.5;color:#4a5568}.snar-legal-check{display:flex;gap:9px;align-items:flex-start;padding:12px;border:1px solid #e2e8f0;border-radius:9px;background:#f8fafc}.snar-legal-check input{margin-top:4px}.snar-legal-card a{color:#2b6cb0}.snar-legal-card button{width:100%;min-height:44px;margin-top:14px;border:0;border-radius:9px;background:#1a365d;color:white;font-weight:800;cursor:pointer}.snar-legal-card button:disabled{opacity:.5;cursor:not-allowed}.snar-legal-note{font-size:12px;color:#718096!important;margin-bottom:0}@media(max-width:600px){.snar-legal-gate{align-items:flex-start;padding:10px}.snar-legal-card{padding:18px}}';
  document.head.append(style);
  const gate=document.createElement('div');gate.id='snar-legal-gate';gate.className='snar-legal-gate';gate.setAttribute('role','dialog');gate.setAttribute('aria-modal','true');gate.setAttribute('aria-labelledby','snar-legal-title');
  gate.innerHTML='<div class="snar-legal-card"><h1 id="snar-legal-title">Before you continue</h1><p>SNAR Study Tool is an independent educational study resource. Please review the Terms of Use and Privacy Notice.</p><label class="snar-legal-check"><input type="checkbox" data-legal-check><span>I agree to the <a href="'+terms+'" target="_blank" rel="noopener">Terms of Use</a> and acknowledge the <a href="'+privacy+'" target="_blank" rel="noopener">Privacy Notice</a>.</span></label><button type="button" data-legal-continue disabled>Continue to SNAR Study Tool</button><p class="snar-legal-note">Normal study features remain available without an account. An account is required only for Adaptive Mode and optional cloud synchronization.</p></div>';
  document.body.append(gate);
  const check=gate.querySelector('[data-legal-check]'),button=gate.querySelector('[data-legal-continue]');
  check.onchange=()=>button.disabled=!check.checked;
  return new Promise(resolve=>{button.onclick=()=>{if(!check.checked)return;localStorage.setItem(KEY,'1');gate.remove();style.remove();resolve(true)};setTimeout(()=>check.focus(),0)})
}
window.SNARLegal={VERSION,KEY,accepted};
window.SNARLegalReady=document.readyState==='loading'?new Promise(resolve=>document.addEventListener('DOMContentLoaded',()=>mount().then(resolve),{once:true})):mount();
})();