(function(){
  const current=document.documentElement.innerHTML.match(/MBU_BUILD:([^ *<]+)/);
  if(!current)return;
  const CURRENT=current[1];
  let checking=false;
  async function check(){
    if(checking)return; checking=true;
    try{
      const u=new URL(location.href);
      u.searchParams.delete('_mbu_reload');
      u.searchParams.set('_mbu_update_check',Date.now());
      const r=await fetch(u.toString(),{cache:'no-store'});
      if(!r.ok)return;
      const t=await r.text();
      const m=t.match(/MBU_BUILD:([^ *<]+)/);
      if(m&&m[1]!==CURRENT){
        const next=new URL(location.href);
        next.searchParams.delete('_mbu_update_check');
        next.searchParams.set('_mbu_reload',Date.now());
        location.replace(next.toString());
      }
    }catch(e){} finally{checking=false}
  }
  setTimeout(check,8000);
  setInterval(check,300000);
  window.addEventListener('pageshow',e=>{if(e.persisted)check()});
  window.addEventListener('focus',check);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
})();
