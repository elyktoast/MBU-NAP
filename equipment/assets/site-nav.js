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
    const n=Number(page.replace('bank',''));
    const heading=[...document.querySelectorAll('h1,.title')].find(x=>/quiz bank|dashboard/i.test(x.textContent||''));
    const dash=document.querySelector('#dashboard,#dash,[data-dashboard]') || heading?.closest('section,.panel,main,div');
    if(!dash) return false;

    let hero=dash.querySelector('.hero');
    if(!hero && heading){
      hero=document.createElement('div');hero.className='hero';
      const left=document.createElement('div');
      heading.parentNode.insertBefore(hero,heading);left.appendChild(heading);
      const sub=[...dash.querySelectorAll('p,.sub')].find(x=>x!==heading);
      if(sub)left.appendChild(sub);hero.appendChild(left);
    }
    if(hero){
      const h=hero.querySelector('h1,.title');if(h){h.classList.remove('title');h.textContent='Quiz Bank '+n+' Dashboard';}
      let p=hero.querySelector('p,.sub');if(!p){p=document.createElement('p');hero.firstElementChild?.appendChild(p);}
      if(p){p.classList.remove('sub');p.textContent='Board-style questions across practice sets, with saved missed-question review.';}
    }

    const grid=dash.querySelector('#cards,#setGrid,.grid') || [...dash.querySelectorAll('div')].find(x=>x.querySelectorAll(':scope > .card,:scope > .setcard').length>=2);
    if(!grid) return false;
    grid.classList.add('grid');

    const cards=[...grid.children].filter(el=>el.matches('.card,.setcard,[class*="card"]'));
    const practice=cards.filter(el=>/practice set/i.test(el.textContent||'')).slice(0,5);
    practice.forEach((card,i)=>{
      card.classList.add('setcard');
      const h=card.querySelector('h3,h2');if(h)h.textContent='Practice Set '+(i+1);
      const buttons=[...card.querySelectorAll('button')];
      const primary=buttons.find(x=>/start|continue|review answers/i.test(x.textContent||''));
      if(primary){primary.classList.add('btn','primary');const t=primary.textContent.toLowerCase();primary.textContent=t.includes('start')?'Start Practice Set '+(i+1):'Continue Practice Set '+(i+1);}
      const missed=buttons.find(x=>/missed/i.test(x.textContent||''));
      if(missed){missed.classList.add('btn');missed.classList.remove('danger');missed.textContent='Review Missed';}
      buttons.filter(x=>/reset/i.test(x.textContent||'')).forEach(x=>x.classList.add('danger'));
    });

    // Derive the overall count from each bank's own live practice-set cards.
    let done=0,total=0;
    practice.forEach(card=>{
      const txt=card.textContent||'';
      const m=txt.match(/(\d+)\s*\/\s*(\d+)\s*(?:completed|answered)/i);
      if(m){done+=Number(m[1]);total+=Number(m[2]);return;}
      const q=txt.match(/(\d+)\s*questions/i);if(q)total+=Number(q[1]);
    });
    // Bank 1 exposes authoritative stats separately.
    if(page==='bank1' && typeof statsFor==='function'){
      done=0;total=0;for(let i=1;i<=5;i++){const s=statsFor(i);done+=s.done||0;total+=(typeof SETS!=='undefined'&&SETS[i]?.length)||100;}
    }
    // Bank 2 exposes authoritative stats separately.
    if(page==='bank2' && typeof stats==='function' && typeof SETS!=='undefined'){
      done=0;total=0;for(let i=0;i<SETS.length;i++){done+=stats(i).done||0;total+=SETS[i]?.length||0;}
    }
    if(total && hero){
      // Use one and only one overall counter.
      [...hero.querySelectorAll('#overall,#bank2Overall,#bank3Overall,.mbu-bank-total')].forEach((x,i)=>{if(i)x.remove();});
      let overall=hero.querySelector('#overall,#bank2Overall,#bank3Overall,.mbu-bank-total');
      if(!overall){overall=document.createElement('div');hero.appendChild(overall);}
      overall.id='bank'+n+'Overall';overall.className='mini mbu-bank-total';
      overall.textContent=done+' / '+total+' completed';
    }

    // Bank 2 needs the aggregate missed card generated by its own state.
    if(page==='bank2' && typeof stats==='function' && typeof SETS!=='undefined'){
      let totalMissed=0;for(let i=0;i<SETS.length;i++)totalMissed+=stats(i).miss||0;
      let all=grid.querySelector('.mbu-all-missed-card');
      if(!all){all=document.createElement('div');all.className='setcard mbu-all-missed-card';grid.appendChild(all);}
      all.innerHTML='<h3>Missed Questions Review</h3><div class="mini">Automatically built from every question missed in Practice Sets 1–5.</div><div class="bar"><span style="width:0%"></span></div><div class="mini">'+totalMissed+' question'+(totalMissed===1?'':'s')+' currently in the missed bank</div><div class="actions"><button class="btn bad" '+(totalMissed?'':'disabled')+'>Review Missed Questions</button></div>';
      const x=all.querySelector('button');if(x)x.onclick=()=>{if(typeof startAllMissed==='function')startAllMissed();};
    }
    return true;
  };

  const scheduleBankUnify = () => {
    if(!['bank1','bank2','bank3'].includes(page)) return;
    let tries=0;
    const run=()=>{try{unifyBankDashboard()}catch(e){} if(++tries<20)setTimeout(run,250);};
    run();
    const obs=new MutationObserver(()=>{try{unifyBankDashboard()}catch(e){}});
    obs.observe(document.body,{childList:true,subtree:true});
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
