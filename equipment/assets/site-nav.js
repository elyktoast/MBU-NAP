/* Shared site navigation. Links render directly from page/build context without manifest I/O. */
(()=>{const s=document.currentScript,p=s?.dataset.page||'',navPage=['haz1','haz2','haz3','hh'].includes(p)?'hazards':p,runtime=window.MBUBuild,ctx=window.MBU_CONTEXT||{},assetsRoot=new URL('../',s.src),home=new URL('../../',runtime?.assetsBase||assetsRoot);const courseId=String(ctx.courseId||''),courseLabel=String(ctx.courseLabel||''),courseUrl=ctx.courseUrl?new URL(ctx.courseUrl,location.href):null,exam=ctx.examUrl?new URL(ctx.examUrl,location.href):null;
const coursePublished=['equipment','basic-principles'].includes(courseId)&&courseUrl&&exam;const core=[{id:'home',label:'SRNA Study Tool',url:home},...(coursePublished?[{id:courseId,label:courseLabel,url:courseUrl}]:[])];
function link(x,cls=''){const a=document.createElement('a');a.href=x.url.href;a.textContent=x.label;if(cls)a.className=cls;if(navPage===x.id)a.setAttribute('aria-current','page');return a}
function render(){
 if(document.querySelector('.mbu-global-nav'))return;
 const pages=core,byId=new Map(pages.map(x=>[x.id,x])),n=document.createElement('nav');
 n.className='mbu-global-nav';n.dataset.page=p;n.setAttribute('aria-label','Site navigation');
 const brand=link(byId.get('home')||pages[0],'mbu-global-nav__brand');brand.textContent='SRNA Study Tool';brand.title='SRNA Study Tool Home';
 const primary=document.createElement('div');primary.className='mbu-global-nav__primary';
 for(const id of [courseId]){const x=byId.get(id);if(x)primary.append(link(x,'mbu-global-nav__primary-link'))}

 n.append(brand,primary);document.body.prepend(n);window.MBUAppCore?.mountNav?.(n)
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render()})();