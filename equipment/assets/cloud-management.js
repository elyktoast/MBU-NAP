/* Lazy cloud device/history management for SNAR Study Tool. */
(()=>{'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
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
async function renderDevices(modal){
  const host=modal.querySelector('[data-cloud-devices]');if(!host)return;
  host.innerHTML='<div class="mbu-muted">Loading devices…</div>';
  try{
    const rows=await MBUSupabase.listDevices();
    host.innerHTML=rows.map(r=>'<div class="mbu-cloud-row"><div><strong>'+esc(r.current?'This device':(r.device_label||'Browser device'))+'</strong><span>'+esc(relativeTime(r.last_seen_at))+(r.app_build?' · '+esc(r.app_build):'')+'</span></div>'+(r.current?'<span class="mbu-pill">Current</span>':'<button type="button" class="secondary" data-remove-device="'+esc(r.device_id)+'">Forget</button>')+'</div>').join('')||'<div class="mbu-muted">No synced devices found.</div>';
    host.querySelectorAll('[data-remove-device]').forEach(btn=>btn.onclick=async()=>{if(!confirm('Forget this device entry? It can reappear if that device syncs again.'))return;btn.disabled=true;try{await MBUSupabase.removeDevice(btn.dataset.removeDevice);await renderDevices(modal)}catch(e){modal.querySelector('[data-account-message]').textContent=e.message;btn.disabled=false}})
  }catch(e){host.innerHTML='<div class="mbu-muted">Could not load devices: '+esc(e.message)+'</div>'}
}
async function renderHistory(modal){
  const host=modal.querySelector('[data-cloud-history]');if(!host)return;
  host.innerHTML='<div class="mbu-muted">Loading restore points…</div>';
  try{
    const rows=await MBUSupabase.listHistory(30);
    host.innerHTML=rows.map(r=>'<div class="mbu-cloud-row"><div><strong>'+esc(storeLabel(r.store_key))+'</strong><span>'+esc(new Date(r.saved_at).toLocaleString())+' · revision '+Number(r.server_revision||0)+'</span></div><button type="button" class="secondary" data-restore-version="'+Number(r.id)+'">Restore</button></div>').join('')||'<div class="mbu-muted">No cloud restore points yet.</div>';
    host.querySelectorAll('[data-restore-version]').forEach(btn=>btn.onclick=async()=>{if(!confirm('Restore this saved version? Your current cloud state will be preserved in version history first.'))return;btn.disabled=true;const message=modal.querySelector('[data-account-message]');try{message.textContent='Restoring…';await MBUSupabase.restoreVersion(Number(btn.dataset.restoreVersion));message.textContent='Restore complete.'}catch(e){message.textContent=e.message;btn.disabled=false}})
  }catch(e){host.innerHTML='<div class="mbu-muted">Could not load history: '+esc(e.message)+'</div>'}
}
window.SNARCloudManagement={renderDevices,renderHistory};
})();