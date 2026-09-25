(function(){
  const STORE='mbu_exam1_studio_v1';
  let cache=null;

  function empty(){return {ans:{},flags:{},crosses:{},reports:[]}}

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
    try{lastSerialized=JSON.stringify(d)}catch(e){}
    if(changed) save(d);
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
  window.addEventListener('storage',e=>{if(e.key===STORE)cache=null});
  function key(bank,q){return normalizeBank(bank)+'-'+q.id}
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
  function toggleFlag(bank,q){const d=db(),k=key(bank,q);d.flags[k]=!d.flags[k];save(d);return !!d.flags[k]}
  function answer(bank,q,ok){const d=db(),b=normalizeBank(bank),k=key(b,q);d.ans[k]={ok:!!ok,at:Date.now(),topic:topicOf(q),bank:b};save(d)}
  function report(bank,q){const reason=prompt('Report reason: wrong answer, ambiguous, typo, explanation issue, source issue, or other');if(!reason)return false;const d=db(),b=normalizeBank(bank);d.reports.push({uid:key(b,q),bank:b,stem:q.stem||q.q||'',reason,date:new Date().toISOString()});save(d);alert('Report saved to Study Studio on this device.');return true}
  window.MBUStudio={STORE,db,save,key,flagged,toggleFlag,answer,report,normalizeBank,topicOf};
})();