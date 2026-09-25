(function () {
  const buildPattern=/(?:<!--|\/\*)\s*MBU_BUILD:([A-Za-z0-9._-]+)/;
  const build=html=>html.match(buildPattern)?.[1];
  const current=build(document.documentElement.innerHTML);
  if(!current)return;

  let checking=false,lastCheck=0;
  async function check(force=false){
    const now=Date.now();
    if(checking||document.hidden||(!force&&now-lastCheck<30000))return;
    checking=true;lastCheck=now;
    try{
      const url=new URL(location.href);
      url.searchParams.delete('_mbu_reload');
      url.searchParams.delete('_mbu_update_check');
      const response=await fetch(url.href,{cache:'no-cache'});
      if(!response.ok||!response.headers.get('content-type')?.includes('text/html'))return;
      const latest=build(await response.text());
      if(latest&&latest!==current){
        const reload=new URL(location.href);
        reload.searchParams.delete('_mbu_update_check');
        reload.searchParams.set('_mbu_reload',String(Date.now()));
        location.replace(reload.href);
      }
    }catch(error){
      // Offline tabs retry later.
    }finally{
      checking=false;
    }
  }

  window.addEventListener('pageshow',event=>{if(event.persisted)check(true)});
  window.addEventListener('focus',()=>check());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
})();