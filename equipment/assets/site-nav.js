/* Compact page switcher shared by the study center and all exam pages. */
(() => {
  const script = document.currentScript;
  document.documentElement.classList.add('mbu-nav-loading');
  const page = script.dataset.page;
  document.documentElement.dataset.mbuPage = page || '';
  const quizPages = new Set(['bank1','bank2','bank3','hazards','haz1','haz2','haz3','hh']);
  if(quizPages.has(page) && !document.querySelector('link[data-mbu-quiz-ui]')){
    const ui=document.createElement('link');ui.rel='stylesheet';ui.href=new URL('quiz-ui.css?v=2',script.src);ui.dataset.mbuQuizUi='1';document.head.appendChild(ui);
  }
  // Bank 1 is the canonical quiz/dashboard UI. Apply that same shell to every
  // current bank/challenge page and any future page registered as a quiz page.
  if(quizPages.has(page) && !document.querySelector('link[href*="bank1-quiz-ui.css"]')){
    const canonical=document.createElement('link');
    canonical.rel='stylesheet';
    canonical.href=new URL('bank1-quiz-ui.css?v=8',script.src);
    canonical.dataset.mbuBank1Ui='1';
    document.head.appendChild(canonical);
    const applyCanonicalClass=()=>document.body?.classList.add('mbu-bank1-ui');
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',applyCanonicalClass,{once:true});
    else applyCanonicalClass();
  }
  const equipment = new URL('../', script.src);
  const home = new URL('../', equipment);
  const exam = new URL('exam-1/', equipment);
  const pages = [
    {id:'home',label:'Study Center',short:'MBU-NAP',url:home},
    {id:'equipment',label:'Equipment',url:equipment},
    {id:'studio',label:'Study Studio',short:'Studio',url:new URL('studio.html',exam)},
    ...[1,2,3].map(n=>({id:'bank'+n,label:'Quiz Bank '+n,short:'Bank '+n,creator:['ChatGPT','Gemini','Claude'][n-1],url:new URL('quiz-bank-'+n+'.html',exam)})),
    {id:'hazards',label:'Workstation Hazards',short:'Hazards',url:new URL('hazards.html',exam)},
    {id:'haz1',label:'Hazards Practice Set 1',short:'Hazards 1',url:new URL('hazards-100.html',exam)},
    {id:'haz2',label:'Hazards Practice Set 2',short:'Hazards 2',url:new URL('hazards-bank-2.html',exam)},
    {id:'haz3',label:'Hazards Practice Set 3',short:'Hazards 3',url:new URL('hazards-bank-3.html',exam)},
    {id:'hh',label:'Hazards Challenge Set',short:'Challenge',url:new URL('hazards-harder.html',exam)}
  ];
  // Keep bank totals visible and repair Bank 3 practice-set mapping without
  // changing the quiz engines themselves.
  const syncBankDashboard = () => {
    try {
      if(page==='bank1' && typeof statsFor==='function' && typeof SETS!=='undefined'){
        let done=0,total=0;
        for(let s=1;s<=5;s++){ done+=(statsFor(s).done||0); total+=(SETS[s]?.length||0); }
        const dash=document.querySelector('#dashboard');
        if(dash && total){
          let out=dash.querySelector('.mbu-bank-total');
          if(!out){ out=document.createElement('div'); out.className='mini mbu-bank-total'; const hero=dash.querySelector('.hero'); (hero||dash).appendChild(out); }
          out.textContent=done+' / '+total+' completed';
        }
      }
      if(page==='bank3' && typeof BANK!=='undefined' && typeof EXM!=='undefined'){
        const current=[1,2,3,4,5].reduce((n,s)=>n+(EXM[s]?.ids?.length||0),0);
        if(current===0 && Array.isArray(BANK) && BANK.length){
          const usable=BANK.filter(q=>Number(q.setn)!==7);
          const groups=new Map();
          usable.forEach(q=>{const k=Number(q.setn);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(q.id);});
          const nonempty=[...groups.entries()].filter(([,ids])=>ids.length).sort((a,b)=>a[0]-b[0]);
          if(nonempty.length>=5){
            for(let s=1;s<=5;s++) EXM[s]={n:s,ids:[...nonempty[s-1][1]]};
          }else if(usable.length){
            const size=Math.ceil(usable.length/5);
            for(let s=1;s<=5;s++) EXM[s]={n:s,ids:usable.slice((s-1)*size,s*size).map(q=>q.id)};
          }
          if(typeof dash==='function') dash();
        }
      }
    } catch(e) { console.warn('MBU bank dashboard sync skipped:',e); }
  };
  const scheduleBankSync = () => {
    if(!['bank1','bank3'].includes(page)) return;
    const run=()=>syncBankDashboard();
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
    let queued=false;
    const obs=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;syncBankDashboard();});});
    const start=()=>{const target=document.querySelector('#dashboard,#main');if(target)obs.observe(target,{childList:true,subtree:true});};
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
  };
  scheduleBankSync();

  const render = () => {
    if(document.querySelector('.mbu-global-nav')) return;
    const nav = document.createElement('nav');
    nav.className = 'mbu-global-nav';
    nav.dataset.page = page;
    nav.setAttribute('aria-label','Site navigation');
    const link = (item,short=false) => {
      const a = document.createElement('a');
      a.href = item.url.href;
      if(short && item.creator){const main=document.createElement('span');main.className='mbu-global-nav__link-main';main.textContent=item.short||item.label;const sub=document.createElement('span');sub.className='mbu-global-nav__link-sub';sub.textContent='('+item.creator+')';a.append(main,sub)}else a.textContent = short ? item.short || item.label : item.label;
      if (short && item.short) a.setAttribute('aria-label',item.label);
      if (page === item.id) a.setAttribute('aria-current','page');
      return a;
    };
    const brand = link(pages[0],true);
    brand.className = 'mbu-global-nav__brand';
    const crumb = document.createElement('div');
    crumb.className = 'mbu-global-nav__crumb';
    if(page==='equipment') crumb.append(link(pages[1]));
    else if(page!=='home') crumb.append(link(pages[1]));
    const quick = document.createElement('div');
    quick.className = 'mbu-global-nav__quick';
    if(page!=='home'&&page!=='equipment') pages.slice(2,7).forEach(item => quick.appendChild(link(item,true)));
    const pickerLabel = document.createElement('label');
    pickerLabel.className = 'mbu-global-nav__picker-label';
    pickerLabel.textContent = 'Go to';
    const picker = document.createElement('select');
    picker.className = 'mbu-global-nav__picker';
    picker.setAttribute('aria-label','Go to page');
    const pickerPages=(page==='home')?[pages[0]]:(page==='equipment'?[pages[0],pages[1]]:pages);
    if(!pickerPages.some(item=>item.id===page)){
      const placeholder=document.createElement('option');
      placeholder.value='';placeholder.textContent='Go to…';placeholder.selected=true;placeholder.disabled=true;
      picker.appendChild(placeholder);
    }
    pickerPages.forEach(item => {
      const option = document.createElement('option');
      option.value = item.url.href;
      option.textContent = item.label;
      option.selected = page === item.id;
      picker.appendChild(option);
    });
    picker.addEventListener('change',() => { if(picker.value) location.assign(picker.value); });
    nav.append(brand,crumb,quick,pickerLabel,picker);
    document.body.prepend(nav);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',()=>{render();document.documentElement.classList.remove('mbu-nav-loading')},{once:true});
  else { render(); document.documentElement.classList.remove('mbu-nav-loading'); }
})();
