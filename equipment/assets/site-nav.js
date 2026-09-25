/* Compact page switcher shared by the study center and all exam pages. */
(() => {
  const script = document.currentScript;
  document.documentElement.classList.add('mbu-nav-loading');
  const page = script.dataset.page;
  document.documentElement.dataset.mbuPage = page || '';
  const quizPages = new Set(['bank1','bank2','bank3','hazards','haz1','haz2','haz3','hh']);
  // Bank 1 is the canonical quiz/dashboard UI. Apply that same shell to every
  // current bank/challenge page and any future page registered as a quiz page.
  if(quizPages.has(page) && !document.querySelector('link[href*="bank1-quiz-ui.css"]')){
    const canonical=document.createElement('link');
    canonical.rel='stylesheet';
    canonical.href=new URL('bank1-quiz-ui.css?v=9',script.src);
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
  // Bank 3 historically stored practice-set membership separately from BANK.
  // Repair it once at startup if the embedded EXM map is empty.
  const repairBank3Sets = () => {
    if(page!=='bank3' || typeof BANK==='undefined' || typeof EXM==='undefined') return;
    try {
      const current=[1,2,3,4,5].reduce((n,set)=>n+(EXM[set]?.ids?.length||0),0);
      if(current || !Array.isArray(BANK) || !BANK.length) return;
      const usable=BANK.filter(q=>Number(q.setn)!==7);
      const groups=new Map();
      usable.forEach(q=>{
        const set=Number(q.setn);
        if(!groups.has(set)) groups.set(set,[]);
        groups.get(set).push(q.id);
      });
      const nonempty=[...groups.entries()].filter(([,ids])=>ids.length).sort((a,b)=>a[0]-b[0]);
      if(nonempty.length>=5){
        for(let set=1;set<=5;set++) EXM[set]={n:set,ids:[...nonempty[set-1][1]]};
      } else if(usable.length) {
        const size=Math.ceil(usable.length/5);
        for(let set=1;set<=5;set++) EXM[set]={n:set,ids:usable.slice((set-1)*size,set*size).map(q=>q.id)};
      }
      if(typeof dash==='function') dash();
    } catch(error) {
      console.warn('Bank 3 practice-set repair skipped:',error);
    }
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',repairBank3Sets,{once:true});
  else repairBank3Sets();

  // Keep every Exam 1 dashboard header identical to Bank 1: title, then x/total completed.
  // This is intentionally a one-time DOM normalization, not a MutationObserver.
  const normalizeDashboardHeader = () => {
    if(!['bank1','bank2','bank3','hazards'].includes(page)) return;
    const root =
      (page==='bank1' && document.getElementById('dashboard')) ||
      (page==='bank2' && document.getElementById('dash')) ||
      (page==='bank3' && (document.getElementById('dash') || document.getElementById('dashboard'))) ||
      document.querySelector('section.panel');
    if(!root) return;

    const title=root.querySelector('h1') || root.querySelector('.title');
    if(!title) return;

    root.querySelectorAll('p,.sub').forEach(el=>{
      if(/board-style questions|practice sets.*missed-question review/i.test(el.textContent||'')) el.remove();
    });

    let overall =
      (page==='bank1' && document.getElementById('overall')) ||
      (page==='bank2' && document.getElementById('bank2Overall')) ||
      (page==='hazards' && document.getElementById('hazOverall'));
    if(!overall){
      overall=[...root.querySelectorAll('.mini,.stats,.sub,div,span')]
        .find(el=>/^\s*\d+\s*\/\s*\d+\s+completed\s*$/i.test(el.textContent||''));
    }

    const header=title.closest('.hero,.top') || title.parentElement;
    if(!header) return;
    header.classList.add('mbu-dashboard-header');
    const titleBox=title.parentElement===header ? document.createElement('div') : title.parentElement;
    if(title.parentElement===header){
      title.before(titleBox);
      titleBox.appendChild(title);
    }
    titleBox.classList.add('mbu-dashboard-title');
    if(overall && overall.parentElement!==titleBox) titleBox.appendChild(overall);
    if(overall) overall.classList.add('mbu-dashboard-overall');
  };

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
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',()=>{
    render(); normalizeDashboardHeader();
    requestAnimationFrame(normalizeDashboardHeader);
    document.documentElement.classList.remove('mbu-nav-loading');
  },{once:true});
  else {
    render(); normalizeDashboardHeader();
    requestAnimationFrame(normalizeDashboardHeader);
    document.documentElement.classList.remove('mbu-nav-loading');
  }
})();
