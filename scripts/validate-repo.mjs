import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd(), failures=[], notes=[];
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
const fail=m=>failures.push(m);

function balanced(src,marker,open='[',close=']'){
  let p=src.indexOf(marker); if(p<0) return null;
  p=src.indexOf(open,p); if(p<0) return null;
  let depth=0, quote=null, escaped=false;
  for(let i=p;i<src.length;i++){
    const c=src[i];
    if(quote){ if(escaped) escaped=false; else if(c==='\\') escaped=true; else if(c===quote) quote=null; continue; }
    if(c==='"'||c==="'"||c==='\`'){quote=c;continue;}
    if(c===open) depth++;
    else if(c===close && --depth===0) return src.slice(p,i+1);
  }
  return null;
}
function parseArray(src,marker){
  const raw=balanced(src,marker); if(!raw) throw new Error(marker+' not found');
  return vm.runInNewContext('('+raw+')',Object.create(null),{timeout:3000});
}
function validateQuestions(label,qs,expected){
  if(!Array.isArray(qs)) return fail(label+': question collection is not an array');
  if(qs.length!==expected) fail(label+': expected '+expected+' questions, found '+qs.length);
  const ids=new Set();
  qs.forEach((q,i)=>{
    const id=q?.id ?? i+1, opts=q?.options ?? q?.c, ans=q?.answer ?? q?.correct ?? q?.a;
    if(ids.has(String(id))) fail(label+': duplicate question id '+id); ids.add(String(id));
    if(!String(q?.stem ?? q?.q ?? '').trim()) fail(label+': question '+id+' has no stem');
    if(!Array.isArray(opts)||opts.length<2) fail(label+': question '+id+' has fewer than 2 options');
    const aa=Array.isArray(ans)?ans:[ans];
    if(!aa.length||aa.some(x=>!Number.isInteger(Number(x))||Number(x)<0||Number(x)>=opts.length)) fail(label+': question '+id+' has invalid answer index');
  });
}
function checkBank1(){
  const src=read('equipment/exam-1/quiz-bank-1.html'), all=[];
  for(let n=1;n<=5;n++){const set=parseArray(src,'const SET'+n); if(set.length!==100) fail('Bank 1 Practice Set '+n+': expected 100, found '+set.length); all.push(...set.map(q=>({...q,id:n+'-'+q.id}))); }
  validateQuestions('Quiz Bank 1',all,500);
}
function checkBank2(){
  const sets=parseArray(read('equipment/exam-1/quiz-bank-2.html'),'const SETS');
  if(!Array.isArray(sets)||sets.length!==5) fail('Quiz Bank 2: expected 5 practice sets');
  const all=[]; sets.forEach((set,n)=>{if(set.length!==100)fail('Bank 2 Practice Set '+(n+1)+': expected 100, found '+set.length);all.push(...set.map(q=>({...q,id:(n+1)+'-'+q.id})))});
  validateQuestions('Quiz Bank 2',all,500);
}
function checkBank3(){validateQuestions('Quiz Bank 3',parseArray(read('equipment/exam-1/quiz-bank-3.html'),'const BANK'),500)}
function checkCopies(){
  for(const p of ['equipment/exam-1/index.html','equipment/exam-1/quiz-bank-3.html']){
    const src=read(p); if(/600\s+questions/i.test(src)) fail(p+': stale 600-question Bank 3 copy remains');
  }
}
function checkAssets(){
  const pages=['index.html','equipment/index.html',...fs.readdirSync(path.join(root,'equipment/exam-1')).filter(x=>x.endsWith('.html')).map(x=>'equipment/exam-1/'+x)];
  for(const p of pages){
    const src=read(p), dir=path.dirname(p);
    for(const m of src.matchAll(/(?:src|href)=["']([^"'?#]+)(?:[?#][^"']*)?["']/g)){
      const u=m[1]; if(/^(?:https?:|data:|#|javascript:)/.test(u))continue;
      const target=path.normalize(path.join(dir,u)); if(!exists(target))fail(p+': missing local asset '+u);
    }
  }
}
function checkStudio(){
  const src=read('equipment/exam-1/studio.html');
  for(const name of ['quiz-bank-1.html','quiz-bank-2.html','quiz-bank-3.html','hazards-100.html','hazards-bank-2.html','hazards-bank-3.html','hazards-harder.html']) if(!src.includes(name))fail('Studio: missing source '+name);
  if(!src.includes("['quiz-bank-1.html','b1'")) fail('Studio: Bank 1 is not the first canonical bank source');
  if(src.includes("const im=t.match(/const IMGS=")&&src.includes("key==='b3'")) fail('Studio: Bank 3 image payload is still eagerly parsed');
}
function checkRuntimeSafety(){
  const bank3=read('equipment/exam-1/quiz-bank-3.html');
  if(!bank3.includes('const BANK=')||!bank3.includes('const TOTAL='))fail('Bank 3: runtime bank structures missing');
  if(/document\.getElementById\(["'][^"']+["']\)\.style/.test(read('equipment/assets/auto-update.js')))fail('Updater: unsafe required DOM access');
}
try{checkBank1()}catch(e){fail('Bank 1 validation crashed: '+e.message)}
try{checkBank2()}catch(e){fail('Bank 2 validation crashed: '+e.message)}
try{checkBank3()}catch(e){fail('Bank 3 validation crashed: '+e.message)}
checkCopies();checkAssets();checkStudio();checkRuntimeSafety();
const manifest=JSON.parse(read('equipment/build.json')); if(!manifest.build)fail('Build manifest has no build id');
if(failures.length){console.error('\nVALIDATION FAILED\n- '+failures.join('\n- '));process.exit(1)}
console.log('Repository validation passed: Banks 1-3 are 500 questions each; local assets, Studio sources, answer indexes, and build manifest are valid.');
