/* Shared site navigation. Bank/page metadata comes from the central Exam 1 manifest. */
(()=>{const s=document.currentScript,p=s?.dataset.page||'',navPage=['haz1','haz2','haz3','hh'].includes(p)?'hazards':p,runtime=window.MBUBuild,ctx=window.MBU_CONTEXT||{},assetsRoot=new URL('../',s.src),home=new URL('../',assetsRoot),courseId=String(ctx.courseId||'equipment'),courseLabel=String(ctx.courseLabel||'Equipment'),courseUrl=ctx.courseUrl?new URL(ctx.courseUrl,location.href):new URL('equipment/',home),exam=ctx.examUrl?new URL(ctx.examUrl,location.href):new URL('equipment/exam-1/',home);
const coursePublished=courseId==='basic-principles';const core=[{id:'home',label:'SRNA Study Tool',url:home},...(coursePublished?[{id:courseId,label:courseLabel,url:courseUrl},{id:'studio',label:'Study Studio',short:'Studio',url:new URL('studio.html',exam)}]:[])];
const fallback=[...core,{id:'bank1',label:'Quiz Bank 1',short:'Bank 1',url:new URL('quiz-bank-1.html',exam)},{id:'bank2',label:'Quiz Bank 2',short:'Bank 2',url:new URL('quiz-bank-2.html',exam)},{id:'bank3',label:'Quiz Bank 3',short:'Bank 3',url:new URL('quiz-bank-3.html',exam)},{id:'combined',label:'Combined',short:'Combined',url:new URL('combined.html',exam)},{id:'hazards',label:'Workstation Hazards',short:'Hazards',url:new URL('hazards.html',exam)}];
async function manifestPages(){try{const m=await runtime.fetchJSON(new URL('banks.json',exam),{cache:'no-store'}),banks=(m.banks||[]).map(b=>({id:b.id,label:b.label,short:b.short||b.label,url:new URL(b.page||((m.bankPage||'bank.html')+'?bank='+encodeURIComponent(b.id)),exam)}));return [...core,...banks]}catch(e){console.error('Navigation manifest failed',e);return fallback}}
function link(x,cls=''){const a=document.createElement('a');a.href=x.url.href;a.textContent=x.label;if(cls)a.className=cls;if(navPage===x.id)a.setAttribute('aria-current','page');return a}
function makeBankPicker(byId){
 const wrap=document.createElement('div');wrap.className='mbu-global-nav__bank-wrap';
 const label=document.createElement('label');label.className='mbu-visually-hidden';label.htmlFor='mbu-bank-picker';label.textContent='Quiz banks';
 const pick=document.createElement('select');pick.id='mbu-bank-picker';pick.className='mbu-global-nav__picker';pick.setAttribute('aria-label','Quiz banks');
 const banks=['bank1','bank2','bank3','combined','hazards'].map(id=>byId.get(id)).filter(Boolean);
 const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=banks.some(x=>x.id===navPage)?(byId.get(navPage)?.short||byId.get(navPage)?.label||'Quiz Banks'):'Quiz Banks';placeholder.selected=true;pick.append(placeholder);
 banks.forEach(x=>{const o=document.createElement('option');o.value=x.url.href;o.textContent=x.label;pick.append(o)});
 pick.onchange=()=>{if(pick.value)location.assign(pick.value)};
 wrap.append(label,pick);return wrap
}
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