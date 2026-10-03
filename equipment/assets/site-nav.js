/* Shared site navigation. Bank/page metadata comes from the central Exam 1 manifest. */
(()=>{const s=document.currentScript,p=s?.dataset.page||'',navPage=['haz1','haz2','haz3','hh'].includes(p)?'hazards':p,runtime=window.MBUBuild,ctx=window.MBU_CONTEXT||{},assetsRoot=new URL('../',s.src),home=new URL('../../',assetsRoot);if(home.pathname==='/'&&location.hostname.endsWith('.github.io')){const repoBase=location.pathname.split('/').filter(Boolean)[0];if(repoBase)home=new URL('/'+repoBase+'/',location.origin)}const courseId=String(ctx.courseId||'equipment'),courseLabel=String(ctx.courseLabel||'Equipment'),courseUrl=ctx.courseUrl?new URL(ctx.courseUrl,location.href):new URL('equipment/',home),exam=ctx.examUrl?new URL(ctx.examUrl,location.href):new URL('equipment/exam-1/',home);
const coursePublished=courseId==='basic-principles';const core=[{id:'home',label:'SRNA Study Tool',url:home},...(coursePublished?[{id:courseId,label:courseLabel,url:courseUrl},{id:'studio',label:'Study Studio',short:'Studio',url:new URL('studio.html',exam)}]:[])];
async function manifestPages(){if(!coursePublished)return core;try{await runtime.fetchJSON(new URL('banks.json',exam),{cache:'no-store'});return core}catch(e){console.error('Navigation manifest failed',e);return core}}
function link(x,cls=''){const a=document.createElement('a');a.href=x.url.href;a.textContent=x.label;if(cls)a.className=cls;if(navPage===x.id)a.setAttribute('aria-current','page');return a}
async function render(){
 if(document.querySelector('.mbu-global-nav'))return;
 const pages=await manifestPages(),byId=new Map(pages.map(x=>[x.id,x])),n=document.createElement('nav');
 n.className='mbu-global-nav';n.dataset.page=p;n.setAttribute('aria-label','Site navigation');
 const brand=link(byId.get('home')||pages[0],'mbu-global-nav__brand');brand.textContent='SRNA Study Tool';brand.title='SRNA Study Tool Home';
 const primary=document.createElement('div');primary.className='mbu-global-nav__primary';
 for(const id of [courseId,'studio']){const x=byId.get(id);if(x)primary.append(link(x,'mbu-global-nav__primary-link'))}
 if(coursePublished){const adaptive=document.createElement('a');adaptive.href=new URL('studio.html?mode=adaptive',exam).href;adaptive.textContent='Adaptive';adaptive.className='mbu-global-nav__primary-link mbu-global-nav__adaptive';adaptive.setAttribute('aria-label','Try Adaptive Testing beta');primary.append(adaptive)}
 n.append(brand,primary);document.body.prepend(n);window.MBUAppCore?.mountNav?.(n)
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render()})();