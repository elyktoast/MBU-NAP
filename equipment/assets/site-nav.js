/* Shared navigation for the study center, course, dashboard, Studio, and quiz banks. */
(() => {
  const script = document.currentScript;
  const page = script.dataset.page;
  const equipment = new URL('../', script.src);
  const home = new URL('../', equipment);
  const exam = new URL('exam-1/', equipment);
  const links = [
    [{id:'home',label:'Study Center',url:home}, {id:'equipment',label:'Equipment',url:equipment}, {id:'exam',label:'Exam 1 Dashboard',url:exam}],
    [{id:'studio',label:'Study Studio',url:new URL('studio.html',exam)},
      ...[1,2,3].map(n=>({id:'bank'+n,label:'Quiz Bank '+n,url:new URL('quiz-bank-'+n+'.html',exam)}))]
  ];
  const render = () => {
    const nav = document.createElement('nav');
    nav.className = 'mbu-global-nav';
    nav.setAttribute('aria-label', 'Site navigation');
    ['Browse','Practice'].forEach((title,i) => {
      const row = document.createElement('div');
      row.className = 'mbu-global-nav__row';
      const label = document.createElement('span');
      label.className = 'mbu-global-nav__label';
      label.textContent = title;
      const group = document.createElement('div');
      group.className = 'mbu-global-nav__links';
      links[i].forEach(item => {
        const a = document.createElement('a');
        a.href = item.url.href;
        a.textContent = item.label;
        if (page === item.id) a.setAttribute('aria-current','page');
        group.appendChild(a);
      });
      row.append(label,group);
      nav.appendChild(row);
    });
    document.body.prepend(nav);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',render,{once:true});
  else render();
})();
