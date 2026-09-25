/* Compact page switcher shared by the study center and all exam pages. */
(() => {
  const script = document.currentScript;
  const page = script.dataset.page;
  document.documentElement.dataset.mbuPage = page || '';
  const quizPages = new Set(['bank1','bank2','bank3','haz1','haz2','haz3','hh']);
  if(quizPages.has(page) && !document.querySelector('link[data-mbu-quiz-ui]')){
    const ui=document.createElement('link');ui.rel='stylesheet';ui.href=new URL('quiz-ui.css?v=2',script.src);ui.dataset.mbuQuizUi='1';document.head.appendChild(ui);
  }
  // Bank 1 is the canonical quiz/dashboard UI. Apply that same shell to every
  // current bank/challenge page and any future page registered as a quiz page.
  if(quizPages.has(page) && !document.querySelector('link[data-mbu-bank1-ui]')){
    const canonical=document.createElement('link');
    canonical.rel='stylesheet';
    canonical.href=new URL('bank1-quiz-ui.css?v=5',script.src);
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
  const unifyBankDashboard = () => {
    if(!['bank1','bank2','bank3'].includes(page)) return;
    const dash=document.querySelector('#dashboard,#dash,[data-dashboard]');
    if(!dash) return;

    // Preserve each bank's own question engine; normalize only the dashboard shell/actions.
    let hero=dash.querySelector('.hero');
    if(!hero){
      const heading=dash.querySelector('h1,.title');
      const sub=dash.querySelector('.sub,p');
      if(heading){
        hero=document.createElement('div');hero.className='hero';
        const left=document.createElement('div');
        heading.parentNode?.insertBefore(hero,heading);
        left.appendChild(heading);
        if(sub && sub!==heading && !hero.contains(sub)) left.appendChild(sub);
        hero.appendChild(left);
      }
    }
    if(hero){
      const h=hero.querySelector('h1,.title');
      if(h){h.classList.remove('title');h.textContent='Quiz Bank '+page.replace('bank','')+' Dashboard';}
      let p=hero.querySelector('p,.sub');
      if(!p){p=document.createElement('p');hero.firstElementChild?.appendChild(p);}
      if(p){p.classList.remove('sub');p.textContent='500 board-style questions across 5 practice sets, with saved missed-question review.';}
    }

    const grid=dash.querySelector('#cards,#setGrid,.grid');
    if(!grid) return;

    // Show answered / total on every bank dashboard (e.g. 13 / 350 completed).
    try{
      let done=0,total=0;
      if(typeof SETS!=='undefined' && Array.isArray(SETS)){
        total=SETS.reduce((n,s)=>n+(Array.isArray(s)?s.length:0),0);
        if(typeof stats==='function') for(let i=0;i<SETS.length;i++) done+=(stats(i).done||0);
      }
      if(total){
        let overall=hero?.querySelector('.mbu-bank-total');
        if(!overall){
          overall=document.createElement('div');overall.className='mini mbu-bank-total';
          hero?.appendChild(overall);
        }
        if(overall) overall.textContent=done+' / '+total+' completed';
      }
    }catch(e){}
    grid.classList.add('grid');

    const cards=[...grid.children].filter(el=>el.matches('.card,.setcard,[class*="card"]'));
    cards.slice(0,5).forEach((card,i)=>{
      card.classList.add('setcard');
      const h=card.querySelector('h3,h2');
      if(h)h.textContent='Practice Set '+(i+1);
      const buttons=[...card.querySelectorAll('button')];
      const primary=buttons.find(b=>/start|continue|review answers/i.test(b.textContent));
      if(primary){
        primary.classList.add('btn','primary');
        const txt=primary.textContent.toLowerCase();
        primary.textContent=txt.includes('continue')?'Continue Practice Set '+(i+1):txt.includes('review answers')?'Continue Practice Set '+(i+1):'Start Practice Set '+(i+1);
      }
      const missed=buttons.find(b=>/missed|review missed/i.test(b.textContent));
      if(missed){missed.classList.add('btn');missed.classList.remove('danger');missed.textContent='Review Missed';}
      buttons.filter(b=>/reset/i.test(b.textContent)).forEach(b=>b.classList.add('danger'));
    });

    if(page==='bank2'){
      // Bank 2 already tracks missed questions across all five sets; expose it exactly like Bank 1.
      let totalMissed=0,totalDone=0,totalCorrect=0;
      try{
        for(let i=0;i<5;i++){const x=stats(i);totalMissed+=x.miss||0;totalDone+=x.done||0;totalCorrect+=x.cor||0;}
      }catch(e){}
      if(hero && !hero.querySelector('#bank2Overall')){
        const overall=document.createElement('div');overall.id='bank2Overall';overall.className='mini';hero.appendChild(overall);
      }
      const overall=hero?.querySelector('#bank2Overall');
      if(overall)overall.textContent=totalDone+' / '+SETS.reduce((n,s)=>n+s.length,0)+' completed';
      let all=grid.querySelector('.mbu-all-missed-card');
      if(!all){
        all=document.createElement('div');all.className='setcard mbu-all-missed-card';
        grid.appendChild(all);
      }
      all.innerHTML='<h3>Missed Questions Review</h3><div class="mini">Automatically built from every question missed in Practice Sets 1–5.</div><div class="bar"><span style="width:0%"></span></div><div class="mini">'+totalMissed+' question'+(totalMissed===1?'':'s')+' currently in the missed bank</div><div class="actions"><button class="btn bad" '+(totalMissed?'':'disabled')+'>Review Missed Questions</button></div>';
      const b=all.querySelector('button');if(b)b.onclick=()=>{if(typeof startAllMissed==='function')startAllMissed();};
    }
  };

  const scheduleBankUnify = () => {
    if(!['bank1','bank2','bank3'].includes(page)) return;
    const run=()=>{try{unifyBankDashboard()}catch(e){}};
    run();
    // Re-apply after a bank redraws its dashboard without changing its quiz logic.
    let queued=false;
    const obs=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;run();});});
    const target=document.querySelector('#dashboard,#dash,[data-dashboard]');
    if(target)obs.observe(target,{childList:true,subtree:true});
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
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',()=>{render();scheduleBankUnify();},{once:true});
  else {render();scheduleBankUnify();}
})();
