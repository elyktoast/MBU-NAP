/* Lazy operator-admin dashboard for SNAR Study Tool. */
(()=>{'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function downloadJSON(name,data){
  const blob=new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),0)
}
function ensure(host){
  if(host.querySelector('[data-admin-details]'))return host.querySelector('[data-admin-details]');
  host.innerHTML='<details class="mbu-tools-details" data-admin-details><summary>Admin & Compliance</summary><div class="mbu-tools-details__body"><p>Operator-only, least-privilege controls. Raw learner study payloads, passwords, and raw CAT contribution rows are not exposed here.</p><div class="mbu-tools-grid compact" data-admin-stats></div><p class="mbu-muted">Guest counts are approximate browser sessions, not verified people. CAT users are accounts with at least one eligible first-attempt response in Adaptive Mode.</p><div class="mbu-app-tools__actions"><button type="button" class="secondary" data-admin-refresh>Refresh</button><button type="button" class="secondary" data-admin-export-legal>Export legal assent audit</button><button type="button" class="secondary" data-admin-retention>Run retention cleanup</button></div><h4>Accounts</h4><p class="mbu-muted">Suspend or re-grant cloud and Adaptive Mode access, or permanently delete a non-admin account. Your operator-admin account is protected from suspension and admin-panel deletion.</p><div data-admin-accounts></div><h4>Privacy requests</h4><div data-admin-privacy></div></div></details>';
  return host.querySelector('[data-admin-details]')
}
async function refresh(host,modal){
  const section=ensure(host),msg=modal.querySelector('[data-account-message]');
  const [summary,accounts,requests]=await Promise.all([MBUSupabase.adminSystemSummary(),MBUSupabase.adminAccounts(),MBUSupabase.adminPrivacyRequests()]);
  const stats=section.querySelector('[data-admin-stats]');
  stats.innerHTML=[
    ['Accounts',summary.accounts],['Active',summary.active_accounts],['Suspended',summary.suspended_accounts],
    ['Guests active ~15m',summary.guest_active_15m],['Guest sessions 24h',summary.guest_sessions_24h],
    ['CAT users',summary.cat_users],['Adaptive first attempts',summary.adaptive_first_attempts],
    ['Calibrated items ≥25',summary.calibrated_items_25],['Privacy requests',summary.privacy_requests],
    ['Legal records',summary.legal_acceptances]
  ].map(([label,value])=>'<div><span>'+esc(label)+'</span><strong>'+Number(value||0)+'</strong></div>').join('');

  const accountsHost=section.querySelector('[data-admin-accounts]');
  accountsHost.innerHTML=(accounts||[]).map(a=>{
    const badges=(a.is_admin?'<span class="mbu-pill">Admin</span> ':'')+(a.cat_used?'<span class="mbu-pill">CAT used</span> ':'')+(a.current_legal_accepted?'<span class="mbu-pill">Current legal</span>':'<span class="mbu-muted">Legal update pending</span>');
    const access=String(a.access_status||'active');
    const actions=a.is_admin?'':('<button type="button" class="secondary" data-admin-access="'+esc(a.user_id)+'" data-next-status="'+(access==='active'?'suspended':'active')+'">'+(access==='active'?'Suspend':'Grant access')+'</button><button type="button" class="mbu-danger-action" data-admin-delete-account="'+esc(a.user_id)+'" data-admin-delete-email="'+esc(a.email||'this account')+'">Delete</button>');
    return '<div class="mbu-cloud-row"><div><strong>'+esc(a.email||a.user_id)+'</strong><span>'+esc(access)+' · created '+esc(new Date(a.created_at).toLocaleString())+(a.last_sign_in_at?' · last sign-in '+esc(new Date(a.last_sign_in_at).toLocaleString()):'')+'</span><small>'+badges+'</small></div><div class="mbu-app-tools__actions">'+actions+'</div></div>'
  }).join('')||'<div class="mbu-muted">No accounts found.</div>';
  accountsHost.querySelectorAll('[data-admin-access]').forEach(btn=>btn.onclick=async()=>{try{btn.disabled=true;await MBUSupabase.adminSetAccountAccess(btn.dataset.adminAccess,btn.dataset.nextStatus);msg.textContent=btn.dataset.nextStatus==='active'?'Account access granted.':'Account access suspended.';await refresh(host,modal)}catch(e){msg.textContent=e.message}finally{btn.disabled=false}});
  accountsHost.querySelectorAll('[data-admin-delete-account]').forEach(btn=>btn.onclick=async()=>{const label=btn.dataset.adminDeleteEmail||'this account';if(!confirm('Delete '+label+' and its active account-linked cloud data? This cannot be undone.'))return;if(!confirm('Final confirmation: permanently delete '+label+'?'))return;try{btn.disabled=true;await MBUSupabase.adminDeleteAccount(btn.dataset.adminDeleteAccount);msg.textContent='Account deleted.';await refresh(host,modal)}catch(e){msg.textContent=e.message}finally{btn.disabled=false}});

  const privacyHost=section.querySelector('[data-admin-privacy]');
  privacyHost.innerHTML=(requests||[]).map(r=>'<div class="mbu-cloud-row"><div><strong>#'+Number(r.id)+' · '+esc(r.request_type)+'</strong><span>'+esc(r.status)+' · '+esc(new Date(r.created_at).toLocaleString())+'</span><small>'+esc(r.details||'No details')+'</small></div><select data-admin-request-status="'+Number(r.id)+'"><option value="received">received</option><option value="in_review">in_review</option><option value="completed">completed</option><option value="denied">denied</option></select><button type="button" class="secondary" data-admin-request-save="'+Number(r.id)+'">Save</button></div>').join('')||'<div class="mbu-muted">No privacy requests.</div>';
  for(const r of requests||[]){const sel=privacyHost.querySelector('[data-admin-request-status="'+Number(r.id)+'"]');if(sel)sel.value=r.status}
  privacyHost.querySelectorAll('[data-admin-request-save]').forEach(btn=>btn.onclick=async()=>{const id=Number(btn.dataset.adminRequestSave),sel=privacyHost.querySelector('[data-admin-request-status="'+id+'"]');try{btn.disabled=true;await MBUSupabase.adminUpdatePrivacyRequest(id,sel.value);msg.textContent='Privacy request #'+id+' updated.';await refresh(host,modal)}catch(e){msg.textContent=e.message}finally{btn.disabled=false}});

  section.querySelector('[data-admin-refresh]').onclick=()=>refresh(host,modal);
  section.querySelector('[data-admin-export-legal]').onclick=async e=>{const btn=e.currentTarget;try{btn.disabled=true;const rows=await MBUSupabase.adminLegalAcceptances();downloadJSON('snar-legal-assent-audit-'+new Date().toISOString().slice(0,10)+'.json',{exported_at:new Date().toISOString(),records:rows});msg.textContent='Legal assent audit exported.'}catch(err){msg.textContent=err.message}finally{btn.disabled=false}};
  section.querySelector('[data-admin-retention]').onclick=async e=>{const btn=e.currentTarget;if(!confirm('Run the documented retention cleanup now?'))return;try{btn.disabled=true;const out=await MBUSupabase.adminRetentionCleanup();msg.textContent='Retention cleanup complete: '+Number(out.sync_history_deleted||0)+' sync versions, '+Number(out.privacy_requests_deleted||0)+' privacy requests, '+Number(out.legal_acceptances_deleted||0)+' expired legal records, '+Number(out.guest_sessions_deleted||0)+' guest sessions removed.';await refresh(host,modal)}catch(err){msg.textContent=err.message}finally{btn.disabled=false}};
}
async function mount(host,modal){ensure(host);await refresh(host,modal)}
window.SNARAdminPanel={mount,refresh};
})();