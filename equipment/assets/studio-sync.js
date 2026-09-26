(function(){
  const STORE='mbu_exam1_studio_v1';
  const REPORT_ENDPOINT=window.MBU_REPORT_ENDPOINT||'https://script.google.com/macros/s/AKfycbyvwmbjqiQRAT8K7psT7iyWCrdhNe8YBhCgD3vF3T3onYBk8vVcrw_lQf1G-LUEWAzG/exec';
  let cache=null,reportContext=null;

  function normalizeBank(bank){
    const s=String(bank ?? '').trim();
    if(/^\d+$/.test(s)) return 'b'+s;
    const haz=s.match(/^haz(\d+)$/i);
    if(haz) return 'h'+haz[1];
    if(/^b\d+$/i.test(s)||/^h\d+$/i.test(s)||s==='hh') return s.toLowerCase();
    return s;
  }

  function normalizeKey(k){
    return String(k||'')
      .replace(/^bhaz(\d+)-/i,'h$1-')
      .replace(/^bb(\d+)-/i,'b$1-')
      .replace(/^bh(\d+)-/i,'h$1-')
      .replace(/^bhh-/i,'hh-');
  }

  function db(){
    if(cache) return cache;
    let d;
    try{d=JSON.parse(localStorage.getItem(STORE)||'{}')}catch(e){d={}}
    d&&typeof d==='object'||(d={});
    d.ans=d.ans||{};d.flags=d.flags||{};d.crosses=d.crosses||{};d.reports=Array.isArray(d.reports)?d.reports:[];

    let changed=false;
    for(const field of ['ans','flags','crosses']){
      const src=d[field],next={};
      for(const [k,v] of Object.entries(src)){
        const nk=normalizeKey(k);
        if(nk!==k) changed=true;
        if((field==='flags'||field==='crosses')&&!v){changed=true;continue}
        if(!(nk in next)) next[nk]=v;
      }
      d[field]=next;
    }
    d.reports=d.reports.map(x=>{
      if(!x||typeof x!=='object') return x;
      const uid=normalizeKey(x.uid);
      const bank=normalizeBank(x.bank);
      if(uid!==x.uid||bank!==x.bank) changed=true;
      return {...x,uid,bank};
    });
    cache=d;
    if(changed) save(d);
    else try{lastSerialized=JSON.stringify(d)}catch(e){}
    return cache;
  }

  let lastSerialized='';
  function save(d){
    cache=d;
    try{
      const serialized=JSON.stringify(d);
      if(serialized===lastSerialized)return;
      localStorage.setItem(STORE,serialized);
      lastSerialized=serialized;
    }catch(e){}
  }
  window.addEventListener('storage',e=>{if(e.key===STORE){cache=null;lastSerialized=''}});
  function key(bank,q){
    if(q&&q.uid)return normalizeKey(q.uid);
    return normalizeBank(bank)+'-'+q.id
  }
  function topicOf(q){
    const direct=String(q.topic||q.lec||'').trim();
    if(direct)return direct;
    const refs=Array.isArray(q.ref)?q.ref.join('; '):'';
    const src=String(q.citation||q.src||refs||'').trim().toLowerCase().replace(/₂/g,'2');
    if(src.includes('workstation hazards')||src.includes('hazards & safety'))return 'Workstation Hazards';
    if(src.includes('medical gas'))return 'Medical Gases';
    if(src.includes('airway equipment'))return 'Airway';
    if(src.includes('co2')&&src.includes('scaveng'))return 'CO₂ & Scavenging';
    if(src.includes('monitoring')||src.includes('intraoperative assessment'))return 'Monitoring';
    return String(q.concept||'Other');
  }
  function flagged(bank,q){return !!db().flags[key(bank,q)]}
  function toggleFlag(bank,q){const d=db(),k=key(bank,q),next=!d.flags[k];if(next)d.flags[k]=true;else delete d.flags[k];save(d);return next}
  function answer(bank,q,ok){const d=db(),b=normalizeBank(bank),k=key(b,q);d.ans[k]={ok:!!ok,at:Date.now(),topic:topicOf(q),bank:b};save(d)}

  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
  function arr(v){return Array.isArray(v)?v:(v===undefined||v===null?[]:[v])}
  function questionMeta(bank,q,extra){
    const b=normalizeBank(bank),options=arr(q.options??q.c),answer=arr(q.answer??q.correct??q.a).map(Number).filter(Number.isInteger);
    const selected=arr(extra&&extra.selected).map(Number).filter(Number.isInteger);
    const sourceRaw=q.citation??q.src??q.ref??'';
    return {
      uid:key(b,q),
      bank:b,
      bankLabel:String((extra&&extra.bankLabel)||q.bankLabel||b),
      set:String((extra&&extra.set)??q.set??q.setn??''),
      questionNumber:String((extra&&extra.questionNumber)??q.id??q.seq??''),
      topic:topicOf(q),
      stem:String(q.stem||q.q||''),
      options:options.map(String),
      answerIndexes:answer,
      answerText:answer.map(i=>options[i]).filter(v=>v!==undefined).map(String),
      selectedIndexes:selected,
      selectedText:selected.map(i=>options[i]).filter(v=>v!==undefined).map(String),
      explanation:String(q.explanation||q.why||q.exp||''),
      source:Array.isArray(sourceRaw)?sourceRaw.join('; '):String(sourceRaw||''),
      page:String(q.page||''),
      pageUrl:location.href,
      build:(document.body.innerHTML.match(/MBU_BUILD:([^<*]+)/)||[])[1]?.trim()||'',
      userAgent:navigator.userAgent
    };
  }

  function ensureReportUI(){
    if(document.getElementById('mbu-report-modal'))return;
    const style=document.createElement('style');style.id='mbu-report-style';style.textContent=
      '#mbu-report-modal{display:none;position:fixed;inset:0;z-index:10020;background:#0008;align-items:center;justify-content:center;padding:14px}'+
      '#mbu-report-modal.open{display:flex}.mbu-report-card{width:min(600px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:14px;padding:20px;box-shadow:0 14px 42px #0006;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#1a202c}'+
      '.mbu-report-head{display:flex;justify-content:space-between;gap:12px;align-items:center}.mbu-report-head h2{margin:0;font-size:20px;color:#1a365d}.mbu-report-close{border:0;background:transparent;font-size:28px;cursor:pointer;color:#4a5568}.mbu-report-summary{margin:12px 0;padding:11px;background:#f7fafc;border:1px solid #e2e8f0;border-radius:9px;font-size:14px}.mbu-report-field{display:grid;gap:6px;margin-top:12px}.mbu-report-field label{font-weight:750;font-size:14px}.mbu-report-field select,.mbu-report-field input,.mbu-report-field textarea{width:100%;font:inherit;font-size:16px;padding:10px;border:1px solid #a0aec0;border-radius:8px;background:#fff}.mbu-report-field textarea{min-height:110px;resize:vertical}.mbu-report-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px;flex-wrap:wrap}.mbu-report-btn{border:0;border-radius:8px;padding:10px 14px;font-weight:800;cursor:pointer;background:#1a365d;color:#fff}.mbu-report-btn.out{background:#fff;color:#1a365d;border:1px solid #1a365d}.mbu-report-status{min-height:20px;margin-top:10px;font-size:13px;color:#4a5568}.mbu-report-btn:disabled{opacity:.55;cursor:not-allowed}';
    document.head.appendChild(style);
    const wrap=document.createElement('div');
    wrap.innerHTML='<div id="mbu-report-modal" role="dialog" aria-modal="true" aria-labelledby="mbu-report-title"><form class="mbu-report-card" id="mbu-report-form"><div class="mbu-report-head"><h2 id="mbu-report-title">Report Question Issue</h2><button class="mbu-report-close" type="button" aria-label="Close report form">&times;</button></div><div class="mbu-report-summary" id="mbu-report-summary"></div><div class="mbu-report-field"><label for="mbu-report-reason">What is wrong?</label><select id="mbu-report-reason" required><option value="">Choose an issue</option><option>Wrong answer</option><option>Ambiguous question</option><option>Typo / wording</option><option>Explanation issue</option><option>Source / citation issue</option><option>Image / figure issue</option><option>Other</option></select></div><div class="mbu-report-field"><label for="mbu-report-comment">Tell me what you noticed</label><textarea id="mbu-report-comment" maxlength="2000" required placeholder="Example: I think choices B and C could both be correct because..."></textarea></div><div class="mbu-report-field"><label for="mbu-report-name">Your name (optional)</label><input id="mbu-report-name" maxlength="80" autocomplete="name" placeholder="Optional"></div><div class="mbu-report-actions"><button class="mbu-report-btn out" type="button" id="mbu-report-cancel">Cancel</button><button class="mbu-report-btn" type="submit" id="mbu-report-submit">Send Report</button></div><div class="mbu-report-status" id="mbu-report-status" role="status" aria-live="polite"></div></form></div>';
    document.body.appendChild(wrap);
    const modal=document.getElementById('mbu-report-modal');
    const close=()=>{modal.classList.remove('open');reportContext=null};
    document.querySelector('.mbu-report-close').onclick=close;
    document.getElementById('mbu-report-cancel').onclick=close;
    modal.addEventListener('click',e=>{if(e.target===modal)close()});
    document.getElementById('mbu-report-form').addEventListener('submit',submitReport);
  }

  async function submitReport(e){
    e.preventDefault();
    if(!reportContext)return;
    const reason=document.getElementById('mbu-report-reason').value.trim();
    const comment=document.getElementById('mbu-report-comment').value.trim();
    const reporter=document.getElementById('mbu-report-name').value.trim();
    if(!reason||!comment)return;
    const submit=document.getElementById('mbu-report-submit'),status=document.getElementById('mbu-report-status');
    submit.disabled=true;status.textContent='Sending report…';
    const payload={...reportContext,reason,comment,reporter,date:new Date().toISOString()};
    const d=db(),local={...payload,sent:false};
    d.reports.push(local);save(d);
    try{
      if(!REPORT_ENDPOINT)throw new Error('Reporting endpoint is not configured yet.');
      await fetch(REPORT_ENDPOINT,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),cache:'no-store'});
      local.sent=true;local.sentAt=new Date().toISOString();save(d);
      status.textContent='Report sent. Thank you.';
      setTimeout(()=>{document.getElementById('mbu-report-modal')?.classList.remove('open');reportContext=null},700);
    }catch(err){
      status.textContent='Could not send online. A backup was saved on this device. '+err.message;
    }finally{submit.disabled=false}
  }


  function pendingReports(){
    return db().reports.filter(r=>r&&typeof r==='object'&&!r.sent);
  }

  function legacyPayload(r){
    return {
      uid:normalizeKey(r.uid||((r.bank||'unknown')+'-saved')),
      bank:normalizeBank(r.bank||''),
      bankLabel:String(r.bankLabel||r.bank||'Unknown bank'),
      set:String(r.set||''),
      questionNumber:String(r.questionNumber||''),
      topic:String(r.topic||''),
      stem:String(r.stem||'Saved question report'),
      options:arr(r.options).map(String),
      answerIndexes:arr(r.answerIndexes),
      answerText:arr(r.answerText).map(String),
      selectedIndexes:arr(r.selectedIndexes),
      selectedText:arr(r.selectedText).map(String),
      explanation:String(r.explanation||''),
      source:String(r.source||''),
      page:String(r.page||''),
      pageUrl:String(r.pageUrl||location.href),
      build:String(r.build||'legacy-local-report'),
      userAgent:String(r.userAgent||navigator.userAgent),
      reason:String(r.reason||'Other').slice(0,120),
      comment:String(r.comment||r.reason||'Saved before online reporting was enabled.').slice(0,2000),
      reporter:String(r.reporter||''),
      date:String(r.date||new Date().toISOString())
    };
  }

  async function sendSavedReports(onProgress){
    if(!REPORT_ENDPOINT)throw new Error('Reporting endpoint is not configured yet.');
    const d=db(),pending=d.reports.filter(r=>r&&typeof r==='object'&&!r.sent);
    let sent=0,failed=0;
    for(let i=0;i<pending.length;i++){
      const r=pending[i],payload=legacyPayload(r);
      try{
        await fetch(REPORT_ENDPOINT,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),cache:'no-store'});
        r.sent=true;r.sentAt=new Date().toISOString();r.migrated=!(r.comment||r.answerIndexes||r.options);
        sent++;
      }catch(err){
        r.lastSendError=String(err&&err.message?err.message:err);
        failed++;
      }
      save(d);
      if(typeof onProgress==='function')onProgress({done:i+1,total:pending.length,sent,failed});
    }
    return {total:pending.length,sent,failed};
  }

  function report(bank,q,extra){
    ensureReportUI();
    reportContext=questionMeta(bank,q,extra||{});
    const modal=document.getElementById('mbu-report-modal');
    document.getElementById('mbu-report-summary').innerHTML='<b>'+esc(reportContext.bankLabel)+(reportContext.set?' · Set '+esc(reportContext.set):'')+(reportContext.questionNumber?' · Q'+esc(reportContext.questionNumber):'')+'</b><div style="margin-top:5px">'+esc(reportContext.stem)+'</div><div style="margin-top:5px;color:#718096">ID: '+esc(reportContext.uid)+'</div>';
    document.getElementById('mbu-report-reason').value='';
    document.getElementById('mbu-report-comment').value='';
    document.getElementById('mbu-report-name').value='';
    document.getElementById('mbu-report-status').textContent='';
    modal.classList.add('open');
    setTimeout(()=>document.getElementById('mbu-report-reason')?.focus(),0);
    return true;
  }

  window.MBUStudio={STORE,db,save,key,flagged,toggleFlag,answer,report,normalizeBank,topicOf,questionMeta,pendingReports,sendSavedReports};
})();