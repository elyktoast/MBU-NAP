/* Compact page switcher shared by the study center and all exam pages. */
(() => {
  const script = document.currentScript;
  const page = script.dataset.page;
  const equipment = new URL('../', script.src);
  const home = new URL('../', equipment);
  const exam = new URL('exam-1/', equipment);
  const pages = [
    {id:'home',label:'Study Center',short:'MBU-NAP',url:home},
    {id:'equipment',label:'Equipment',url:equipment},
    {id:'studio',label:'Study Studio',short:'Studio',url:new URL('studio.html',exam)},
    ...[1,2,3].map(n=>({id:'bank'+n,label:'Quiz Bank '+n,short:'Bank '+n,creator:['ChatGPT','Gemini','Claude'][n-1],url:new URL('quiz-bank-'+n+'.html',exam)})),
    {id:'hazards',label:'Workstation Hazards',short:'Hazards',url:new URL('hazards.html',exam)}
  ];
  const render = () => {
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
    if(page!=='home'&&page!=='equipment') pages.slice(2).forEach(item => quick.appendChild(link(item,true)));
    const pickerLabel = document.createElement('label');
    pickerLabel.className = 'mbu-global-nav__picker-label';
    pickerLabel.textContent = 'Go to';
    const picker = document.createElement('select');
    picker.className = 'mbu-global-nav__picker';
    picker.setAttribute('aria-label','Go to page');
    const pickerPages=(page==='home')?[pages[0]]:(page==='equipment'?[pages[0],pages[1]]:pages);
    pickerPages.forEach(item => {
      const option = document.createElement('option');
      option.value = item.url.href;
      option.textContent = item.label;
      option.selected = page === item.id;
      picker.appendChild(option);
    });
    picker.addEventListener('change',() => { location.assign(picker.value); });
    nav.append(brand,crumb,quick,pickerLabel,picker);
    document.body.prepend(nav);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',render,{once:true});
  else render();
})();
