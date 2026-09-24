(function(){
  const build=html=>html.match(/(?:<!--|\/\*)\s*MBU_BUILD:([^ *<]+)/)?.[1];
  const current=build(document.documentElement.innerHTML);
  if(!current)return;
  let checking=false;
  async function check(){
    if(checking)return; checking=true;
    try{
      const u=new URL(location.href);
      u.searchParams.delete('_mbu_reload');
      u.searchParams.set('_mbu_update_check',Date.now());
      const r=await fetch(u.toString(),{cache:'no-store'});
      if(!r.ok)return;
      const latestPage=build(await r.text());
      let changed=!!(latestPage&&latestPage!==current);
      if(!changed){
        for(const watch of window.MBUUpdateWatch||[]){
          try{
            const w=new URL(watch.url,location.href);
            w.searchParams.set('_mbu_update_check',Date.now());
            const wr=await fetch(w.toString(),{cache:'no-store'});
            if(wr.ok){const latest=build(await wr.text());if(latest&&latest!==watch.build){changed=true;break}}
          }catch(e){}
        }
      }
      if(changed){
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
