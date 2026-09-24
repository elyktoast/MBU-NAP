(function(){
  const current=document.documentElement.innerHTML.match(/MBU_BUILD:([^ *<]+)/);
  if(!current)return;
  const CURRENT=current[1];
  let checking=false;
  async function check(){
    if(checking)return; checking=true;
    try{
      const u=new URL(location.href);
      u.searchParams.set('_mbu_update_check',Date.now());
      const r=await fetch(u.toString(),{cache:'no-store'});
      if(!r.ok)return;
      const t=await r.text();
      const m=t.match(/MBU_BUILD:([^ *<]+)/);
      if(m&&m[1]!==CURRENT) location.reload();
    }catch(e){} finally{checking=false}
  }
  setTimeout(check,30000);
  setInterval(check,300000);
})();