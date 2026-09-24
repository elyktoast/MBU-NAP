(function(){
  const STORE='mbu_exam1_studio_v1';
  function db(){try{const d=JSON.parse(localStorage.getItem(STORE)||'{}');d.ans=d.ans||{};d.flags=d.flags||{};d.reports=d.reports||[];return d}catch(e){return {ans:{},flags:{},reports:[]}}}
  function save(d){localStorage.setItem(STORE,JSON.stringify(d))}
  function key(bank,q){return 'b'+bank+'-'+q.id}
  function flagged(bank,q){return !!db().flags[key(bank,q)]}
  function toggleFlag(bank,q){const d=db(),k=key(bank,q);d.flags[k]=!d.flags[k];save(d);return !!d.flags[k]}
  function answer(bank,q,ok){const d=db(),k=key(bank,q);d.ans[k]={ok:!!ok,at:Date.now(),topic:q.topic||q.lec||q.concept||'Other',bank};save(d)}
  function report(bank,q){const reason=prompt('Report reason: wrong answer, ambiguous, typo, explanation issue, source issue, or other');if(!reason)return false;const d=db();d.reports.push({uid:key(bank,q),bank,stem:q.stem||q.q||'',reason,date:new Date().toISOString()});save(d);alert('Report saved to Study Studio on this device.');return true}
  window.MBUStudio={STORE,db,save,key,flagged,toggleFlag,answer,report};
})();