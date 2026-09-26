(function(){if(document.getElementById('mbu-calc-open'))return;
const css=document.createElement('style');css.id='mbu-calc-style';css.textContent=`#mbu-calc-open{position:fixed;right:18px;bottom:18px;z-index:9998;border:0;border-radius:999px;background:#1a365d;color:#fff;padding:12px 17px;font-weight:800;font-size:15px;box-shadow:0 5px 18px #0003;cursor:pointer}#mbu-calc-modal{display:none;position:fixed;inset:0;z-index:9999;background:transparent;pointer-events:none}#mbu-calc-modal.open{display:block}.mbu-calc{pointer-events:auto;box-sizing:border-box;width:min(430px,calc(100vw - 28px));max-height:92vh;overflow:auto;background:#f7fafc;border-radius:14px;padding:16px;box-shadow:0 12px 35px #0006;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);touch-action:auto}.mbu-calc *{box-sizing:border-box}.mbu-calc-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;cursor:move;user-select:none;touch-action:none;border-radius:8px;padding:2px 0}.mbu-calc-head:focus{outline:2px solid #2b6cb0;outline-offset:3px}.mbu-calc-head-actions{display:flex;align-items:center;gap:4px}.mbu-calc-resetpos{border:1px solid #cbd5e0;background:#fff;color:#4a5568;border-radius:7px;padding:5px 8px;font-size:12px;font-weight:700;cursor:pointer}.mbu-calc-head strong{font-size:18px;color:#1a365d}.mbu-calc-close{border:0;background:transparent;font-size:28px;cursor:pointer;color:#4a5568}#mbu-calc-display{width:100%;height:64px;border:1px solid #a0aec0;border-radius:9px;background:#fff;padding:8px 12px;text-align:right;font-size:22px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;margin-bottom:10px}.mbu-calc-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px}.mbu-calc-grid button{min-width:0;min-height:46px;border:1px solid #cbd5e0;border-radius:8px;background:#fff;color:#1a202c;font-size:15px;font-weight:700;cursor:pointer}.mbu-calc-grid .op{background:#edf2f7;color:#1a365d}.mbu-calc-grid .eq{background:#1a365d;color:#fff}.mbu-calc-grid .danger{color:#9b2c2c}#mbu-calc-open.mbu-calc-inline{position:static;box-shadow:none;border-radius:8px;min-height:38px;padding:8px 12px;font-size:14px}.mbu-calc-note{font-size:11px;color:#718096;margin-top:9px;text-align:center}@media(max-width:600px){#mbu-calc-open{right:12px;bottom:12px;padding:11px 14px}.mbu-calc{padding:12px}.mbu-calc-grid{gap:5px}.mbu-calc-grid button{min-height:43px;font-size:14px}}`;document.head.appendChild(css);
const w=document.createElement('div');w.innerHTML='<button id="mbu-calc-open" type="button" aria-label="Open scientific calculator">Calculator</button><div id="mbu-calc-modal" role="dialog" aria-modal="true" aria-label="Advanced calculator"><div class="mbu-calc"><div class="mbu-calc-head" tabindex="0" role="group" aria-label="Calculator window. Drag to move, or use arrow keys."><strong>Advanced Calculator</strong><div class="mbu-calc-head-actions"><button class="mbu-calc-resetpos" type="button" title="Center calculator">Center</button><button class="mbu-calc-close" type="button" aria-label="Close calculator">&times;</button></div></div><input id="mbu-calc-display" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="Example: (25*4)+(10/2)"><div class="mbu-calc-grid"></div><div class="mbu-calc-note">Use parentheses and combine operations/functions in one expression. Trig uses degrees. EE enters scientific notation.</div></div></div>';document.body.appendChild(w);
const grid=document.querySelector('.mbu-calc-grid'), keys=[['AC','danger'],['⌫',''],['(', 'op'],[')','op'],['÷','op'],['sin(','op'],['cos(','op'],['tan(','op'],['^','op'],['×','op'],['asin(','op'],['acos(','op'],['atan(','op'],['sqrt(','op'],['−','op'],['ln(','op'],['log(','op'],['π','op'],['e','op'],['+','op'],['7',''],['8',''],['9',''],['^2','op'],['%','op'],['4',''],['5',''],['6',''],['1/(','op'],['±','op'],['1',''],['2',''],['3',''],['0',''],['.',''],['EE','op'],['e^(','op'],['10^(','op'],['Ans','op'],['=','eq']];
keys.forEach(([t,c])=>{const b=document.createElement('button');b.type='button';b.textContent=t;b.className=c;b.addEventListener('click',()=>press(t));grid.appendChild(b)});
let ans=0;const d=document.getElementById('mbu-calc-display'),m=document.getElementById('mbu-calc-modal'),open=document.getElementById('mbu-calc-open');
open.hidden=true;
window.MBUCalculator={
  besideFlag(){const flag=document.getElementById('mbuFlagBtn')||document.getElementById('flagBtn');if(!flag)return;flag.after(open);open.classList.add('mbu-calc-inline');open.hidden=false},
  hide(){m.classList.remove('open');open.hidden=true;open.classList.remove('mbu-calc-inline');document.body.appendChild(open)}
};

const panel=document.querySelector('.mbu-calc'),head=document.querySelector('.mbu-calc-head');
function clampPanel(left,top){
  const r=panel.getBoundingClientRect(),pad=8,maxL=Math.max(pad,window.innerWidth-r.width-pad),maxT=Math.max(pad,window.innerHeight-r.height-pad);
  return {left:Math.min(Math.max(pad,left),maxL),top:Math.min(Math.max(pad,top),maxT)};
}
function setPanelPosition(left,top){
  const p=clampPanel(left,top);
  panel.style.left=p.left+'px';panel.style.top=p.top+'px';panel.style.transform='none';
}
function centerPanel(){panel.style.transform='none';const width=document.documentElement.clientWidth||window.innerWidth,height=document.documentElement.clientHeight||window.innerHeight;setPanelPosition((width-panel.offsetWidth)/2,(height-panel.offsetHeight)/2)}
let drag=null;
head.addEventListener('pointerdown',e=>{
  if(e.target.closest('button'))return;
  const r=panel.getBoundingClientRect();
  drag={id:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top};
  head.setPointerCapture?.(e.pointerId);
  e.preventDefault();
});
head.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId)return;
  setPanelPosition(e.clientX-drag.dx,e.clientY-drag.dy);
});
function endDrag(e){if(drag&&drag.id===e.pointerId)drag=null}
head.addEventListener('pointerup',endDrag);head.addEventListener('pointercancel',endDrag);
head.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;
  e.preventDefault();
  if(e.key==='Home'){centerPanel();return}
  const r=panel.getBoundingClientRect(),step=e.shiftKey?30:10;
  setPanelPosition(r.left+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),r.top+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0));
});
document.querySelector('.mbu-calc-resetpos').onclick=e=>{e.stopPropagation();centerPanel()};
window.addEventListener('resize',()=>{if(!m.classList.contains('open')||panel.style.transform)return;const r=panel.getBoundingClientRect();setPanelPosition(r.left,r.top)});
document.getElementById('mbu-calc-open').onclick=()=>{m.classList.add('open');requestAnimationFrame(centerPanel);d.focus()};document.querySelector('.mbu-calc-close').onclick=()=>m.classList.remove('open');m.onclick=e=>{if(e.target===m)m.classList.remove('open')};
function add(v){if(d.value==='Error')d.value='';d.value+=v;d.focus()}
function press(t){if(t==='AC')d.value='';else if(t==='⌫')d.value=d.value.slice(0,-1);else if(t==='=')evaluate();else if(t==='Ans')add(String(ans));else if(t==='±')d.value=d.value?'-('+d.value+')':'-';else add(({ '÷':'/','×':'*','−':'-','π':'pi','EE':'E'}[t]||t))}
function ev(s){if(!s.trim())return 0;if(!/^[0-9+\-*/^().,%\sA-Za-z]+$/.test(s))throw Error();let x=s.replace(/\bpi\b/gi,'PI').replace(/\be\b/g,'EULER').replace(/\^/g,'**').replace(/(\d+(?:\.\d+)?|\([^()]*\))%/g,'($1/100)');const F={sin:v=>Math.sin(v*Math.PI/180),cos:v=>Math.cos(v*Math.PI/180),tan:v=>Math.tan(v*Math.PI/180),asin:v=>Math.asin(v)*180/Math.PI,acos:v=>Math.acos(v)*180/Math.PI,atan:v=>Math.atan(v)*180/Math.PI,sqrt:Math.sqrt,ln:Math.log,log:Math.log10};for(const n of Object.keys(F))x=x.replace(new RegExp('\\b'+n+'\\b','g'),'F.'+n);x=x.replace(/\bPI\b/g,'Math.PI').replace(/\bEULER\b/g,'Math.E');const r=Function('F','Math','"use strict";return ('+x+');')(F,Math);if(typeof r!=='number'||!Number.isFinite(r))throw Error();return r}
function evaluate(){try{const r=ev(d.value);ans=r;d.value=Number.isInteger(r)?String(r):String(Number(r.toPrecision(12)))}catch(e){d.value='Error'}}
d.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();evaluate()}if(e.key==='Escape')m.classList.remove('open')});
})();