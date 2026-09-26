import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const root=process.cwd(), failures=[], notes=[];
const quizFiles=['equipment/exam-1/quiz-bank-1.html','equipment/exam-1/quiz-bank-2.html','equipment/exam-1/quiz-bank-3.html','equipment/exam-1/combined.html','equipment/exam-1/hazards-100.html','equipment/exam-1/hazards-bank-2.html','equipment/exam-1/hazards-bank-3.html','equipment/exam-1/hazards-harder.html','equipment/exam-1/studio.html'];
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
    const identity=String(q?.set??q?.setn??'')+'::'+String(id); if(ids.has(identity)) fail(label+': duplicate question id '+id+' within set '+String(q?.set??q?.setn??'')); ids.add(identity);
    if(!String(q?.stem ?? q?.q ?? '').trim()) fail(label+': question '+id+' has no stem');
    if(!Array.isArray(opts)||opts.length<2) fail(label+': question '+id+' has fewer than 2 options');
    const aa=Array.isArray(ans)?ans:[ans];
    if(!aa.length||aa.some(x=>!Number.isInteger(Number(x))||Number(x)<0||Number(x)>=opts.length)) fail(label+': question '+id+' has invalid answer index');
  });
}
function canonicalPayload(p,label,expected,setCounts){
  let payload;try{payload=JSON.parse(read(p))}catch(e){fail(label+': invalid canonical JSON: '+e.message);return []}
  const qs=Array.isArray(payload)?payload:(payload.questions||[]);
  validateQuestions(label,qs,expected);
  if(payload&&payload.count!=null&&Number(payload.count)!==expected)fail(label+': metadata count is not '+expected);
  if(setCounts){
    for(const [set,count] of Object.entries(setCounts)){
      const actual=qs.filter(q=>Number(q.set)===Number(set)).length;
      if(actual!==count)fail(label+' Practice Set '+set+': expected '+count+', found '+actual);
    }
  }
  return qs;
}
function checkBank1(){
  const qs=canonicalPayload('equipment/exam-1/data/bank1.json','Quiz Bank 1',500,{1:100,2:100,3:100,4:100,5:100});
  const page=read('equipment/exam-1/quiz-bank-1.html');
  const engine=read('equipment/assets/quiz-engine.js');
  if(!page.includes("dataUrl:'data/bank1.json'")||!page.includes('../assets/quiz-engine.js'))fail('Bank 1: canonical data/shared engine wiring is missing');
  if(!engine.includes('MBUNavigator.button')||!engine.includes('MBUCalculator?.besideFlag()'))fail('Bank 1 shared engine: canonical navigation/calculator contract is missing');
  return qs;
}
function checkBank2(){
  canonicalPayload('equipment/exam-1/data/bank2.json','Quiz Bank 2 canonical data',500,{1:100,2:100,3:100,4:100,5:100});
  const page=read('equipment/exam-1/quiz-bank-2.html');
  if(!page.includes('data/bank2.json')||!page.includes('legacyFormat:"bank2"')||!page.includes('../assets/quiz-engine.js'))fail('Bank 2: canonical data/shared engine wiring is missing');
}
function checkBank3(){
  const qs=canonicalPayload('equipment/exam-1/data/bank3.json','Quiz Bank 3 canonical data',500,{1:100,2:100,3:100,4:100,5:100});
  const page=read('equipment/exam-1/quiz-bank-3.html');
  if(!page.includes('data/bank3.json')||!page.includes('legacyFormat:"bank3"')||!page.includes('data/bank3-images.js')||!page.includes('../assets/quiz-engine.js'))fail('Bank 3: canonical data/shared engine wiring is missing');
  const images=read('equipment/exam-1/data/bank3-images.js');for(const q of qs)if(q.imageId&&!images.includes('"'+q.imageId+'"'))fail('Bank 3: missing image asset '+q.imageId);
}
function checkCombined(){
  const qs=canonicalPayload('equipment/exam-1/data/combined.json','Combined',150,{1:50,2:50,3:50});
  const images=read('equipment/exam-1/combined-images.js');for(const q of qs)if(q.imageId&&!images.includes('"'+q.imageId+'"'))fail('Combined: missing image asset '+q.imageId);
  const page=read('equipment/exam-1/combined.html');
  if(!page.includes('data/combined.json')||!page.includes('legacyFormat:"combined"')||!page.includes('combined-images.js')||!page.includes('../assets/quiz-engine.js'))fail('Combined: canonical data/shared engine wiring is missing');
}
function checkHazardsCanonical(){
  const qs=canonicalPayload('equipment/exam-1/data/hazards.json','Workstation Hazards',350,{1:100,2:100,3:100,4:50});
  const images=JSON.parse(read('equipment/exam-1/data/hazards-images.json'));
  for(const q of qs)if(q.image&&!q.imageSvg&&!images[q.image])fail('Workstation Hazards: missing image asset '+q.image);
  const standard=read('equipment/assets/hazards-standard-engine.js'),advanced=read('equipment/assets/hazards-quiz-engine.js');
  if(!standard.includes('startFromData')||!advanced.includes('startFromData'))fail('Workstation Hazards: shared engines do not load canonical data');
  for(const [p,set] of [['equipment/exam-1/hazards-100.html',1],['equipment/exam-1/hazards-bank-2.html',2],['equipment/exam-1/hazards-bank-3.html',3],['equipment/exam-1/hazards-harder.html',4]]){
    const page=read(p);
    if(!page.includes('data/hazards.json')||!page.includes('setFilter:'+set))fail(p+': canonical Hazards data wiring is missing');
    if(page.includes('const QUESTIONS')||page.includes('const BANK=')||page.includes('const IMGS='))fail(p+': embedded Hazards question/image payload remains');
  }
  for(const p of ['equipment/exam-1/hazards-bank-3.html','equipment/exam-1/hazards-harder.html'])if(!read(p).includes('data/hazards-images.json'))fail(p+': shared Hazards image bundle is not configured');
}
function checkCanonicalNewQuizBanks(){
  const manifest=JSON.parse(read('equipment/exam-1/banks.json')),engine=read('equipment/assets/quiz-engine.js');
  const canonical=manifest.banks.filter(b=>b.engine==='canonical');
  for(const bank of canonical){
    const p='equipment/exam-1/'+bank.page;if(!exists(p)){fail('Canonical bank page missing '+p);continue}
    const page=read(p);
    for(const bit of ['id="dashboard"','id="cards"','id="overall"','id="quiz"','id="set-badge"','id="mbuFlagBtn"','>Report</button>','>Navigator</button>','mbu-return','id="completed"','id="total"','id="score"','id="missed"','mbu-crossout-hint','id="multi-submit-row"','id="submit-multi"','id="explain"','id="citation"','id="prev"','id="next"','../assets/bank1-quiz-ui.css','../assets/studio-sync.js','../assets/navigator.js','../assets/calculator.js','../assets/quiz-engine.js','../assets/auto-update.js'])if(!page.includes(bit))fail(bank.page+': canonical Bank 1 shell is missing '+bit);
    if(!page.includes(bank.data))fail(bank.page+': config dataUrl does not match banks.json');
  }
  for(const bit of ['MBUNavigator.button','MBUCalculator?.besideFlag()','goDashboard()','Submit Selections (','lastSaved'])if(!engine.includes(bit))fail('Canonical quiz engine: missing shared behavior '+bit);
}
function checkCopies(){
  for(const p of ['equipment/exam-1/index.html','equipment/exam-1/quiz-bank-3.html']){
    const src=read(p); if(/600\s+questions/i.test(src)) fail(p+': stale 600-question Bank 3 copy remains');
  }
}
function checkAssetVersions(){
  const dir=path.join(root,'equipment/exam-1');
  for(const name of fs.readdirSync(dir).filter(x=>x.endsWith('.html'))){
    const p='equipment/exam-1/'+name,src=read(p),refs=[];
    for(const m of src.matchAll(/(?:src|href)=["'](\.\.\/assets\/[^"']+)["']/g)) refs.push(m[1]);
    const versioned=refs.filter(ref=>ref.includes('?v='));
    const versions=versioned.map(ref=>new URL(ref,'https://mbu.local/equipment/exam-1/').searchParams.get('v')).filter(Boolean);
    if(versions.length&&new Set(versions).size!==1)fail(p+': mixed shared asset cache revisions: '+[...new Set(versions)].join(', '));
    if(versions.some(v=>v!=='64'))fail(p+': stale shared asset cache revision; expected v64');
  }
}
checkAssetVersions();
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
  let manifest;try{manifest=JSON.parse(read('equipment/exam-1/banks.json'))}catch(e){fail('Studio: bank manifest is invalid JSON: '+e.message);return}
  if(manifest.canonicalBank!=='bank1')fail('Studio: Bank 1 is not declared canonical in banks.json');
  for(const id of ['bank1','bank2','bank3','combined','hazards'])if(!manifest.banks.some(b=>b.id===id))fail('Studio: central bank manifest is missing '+id);
  if(!Array.isArray(manifest.studioSources)||manifest.studioSources.length<8)fail('Studio: complete manifest source catalog is missing');
  for(const srcDef of manifest.studioSources){if(srcDef.format!=='canonical')fail('Studio: noncanonical source format remains for '+srcDef.key);if(!exists('equipment/exam-1/'+srcDef.data))fail('Studio: manifest data source missing '+srcDef.data)}
  for(const bit of ["studioFetch('banks.json')","BANK_MANIFEST.studioSources.map","meta.format==='canonical'","const sources=BANK_MANIFEST.studioSources.map"])if(!src.includes(bit))fail('Studio: manifest-driven hydration contract missing '+bit);
  if(/const\s+im\s*=|const\s+IMGS\s*=|JSON\.parse\(im/.test(src))fail('Studio: embedded image payload is still eagerly parsed');
}
function checkRuntimeSafety(){
  const engine=read('equipment/assets/quiz-engine.js');
  for(const bit of ['function migrateLegacyState','function loadDB()','function renderDashboard()','function loadQuestion()','function submitAnswer()','function grade()','function persistPosition()','function nav(d)','function resetCurrent()','initializeQuizBank()'])if(!engine.includes(bit))fail('Canonical quiz engine: runtime contract missing '+bit);
  if(!engine.includes("kind==='bank2'")||!engine.includes("kind==='bank3'")||!engine.includes("kind==='combined'"))fail('Canonical quiz engine: legacy progress migration adapters are incomplete');
  if(/document\.getElementById\(["'][^"']+["']\)\.style/.test(read('equipment/assets/auto-update.js')))fail('Updater: unsafe required DOM access');
  const updater=read('equipment/assets/auto-update.js');
  if(!updater.includes("reload.searchParams.get('_mbu_reload') === latest"))fail('Updater: no duplicate-build reload guard');
}
function checkStudioData(){
  checkBank1();checkBank2();checkBank3();checkHazardsCanonical();
  canonicalPayload('equipment/exam-1/data/combined.json','Combined Studio data',150,{1:50,2:50,3:50});
}
checkStudioData();
checkCombined();checkHazardsCanonical();checkCanonicalNewQuizBanks();checkCopies();checkAssets();checkStudio();checkRuntimeSafety();
let manifest;
try{
  const raw=read('equipment/build.json');
  if(raw.includes('\\n'))fail('Build manifest contains escaped newline text instead of real newlines');
  manifest=JSON.parse(raw);
  if(!manifest.build)fail('Build manifest has no build id');
  const latestSourceChange=execFileSync('git',['log','-1','--format=%ct','--','equipment'],{encoding:'utf8'}).trim();
  const latestManifestChange=execFileSync('git',['log','-1','--format=%ct','--','equipment/build.json'],{encoding:'utf8'}).trim();
  if(latestSourceChange&&latestManifestChange&&Number(latestManifestChange)<Number(latestSourceChange))fail('Build manifest is stale: equipment changed without publishing a new build id');
}catch(e){fail('Build manifest is invalid JSON: '+e.message)}
function checkHazardNavigators(){
  const standard=read('equipment/assets/hazards-standard-engine.js');
  const challenge=read('equipment/assets/hazards-quiz-engine.js');
  for(const p of ['equipment/exam-1/hazards-100.html','equipment/exam-1/hazards-bank-2.html','equipment/exam-1/hazards-bank-3.html','equipment/exam-1/hazards-harder.html']){
    const src=read(p);
    if(!src.includes('../assets/navigator.js'))fail(p+': shared Bank 1 navigator is not loaded');
  }
  if(!standard.includes('MBUNavigator.button'))fail('Shared standard Hazards engine does not use the canonical navigator renderer');
  if(!challenge.includes('MBUNavigator.button'))fail('Shared challenge Hazards engine does not use the canonical navigator renderer');
}
checkHazardNavigators();
// Hazards dashboard standard sets must count graded submissions, while answer-record sets may count saved result objects.
{
 const src=read('equipment/exam-1/hazards.html');
 const standard=src.slice(src.indexOf("if(type==='array')"),src.indexOf("}else{const ans=d.ans||{}",src.indexOf("if(type==='array')")));
 if(standard.includes('done=Object.keys(ans).length'))fail('Hazards dashboard: standard sets still count saved selections as completed questions');
 if(!standard.includes("done=Object.keys(graded).filter(k=>graded[k]===true).length"))fail('Hazards dashboard: standard sets do not count graded submissions');
}

// Hazards cumulative missed review must route directly through Studio; obsolete redirect pages should not return.
{
 const dashboard=read('equipment/exam-1/hazards.html');
 if(!dashboard.includes("studio.html?mode=hazards-missed&return=hazards"))fail('Hazards dashboard: cumulative missed review is not routed through Studio');
 if(exists('equipment/exam-1/hazards-review.html'))fail('Hazards review: obsolete compatibility redirect still exists');
}

{
 const nav=read('equipment/assets/site-nav.js');
 if(!nav.includes("sessionStorage.removeItem('mbu_build_manifest_v1')")||!nav.includes("u.searchParams.set('_mbu_refresh',Date.now().toString())")||!nav.includes('location.replace(u.href)'))fail('Site nav: MBU-NAP brand does not perform a cache-busting refresh');
}
function checkCanonicalSubmission(){
  const engine=read('equipment/assets/quiz-engine.js');
  const studio=read('equipment/exam-1/studio.html');
  const standard=read('equipment/assets/hazards-standard-engine.js');
  const challenge=read('equipment/assets/hazards-quiz-engine.js');
  for(const bit of [
    "row.style.display='flex'",
    "btn.textContent='Submit Answer'",
    "Submit Selections (",
    "MBUNavigator.button({label:i+1",
    "window.MBUCalculator?.besideFlag()",
    "if(q.answer.includes(i))b.classList.add('correct');else if(selected.includes(i))b.classList.add('incorrect')",
    "else if(d>0)goDashboard()",
    "function persistPosition()"
  ]) if(!engine.includes(bit))fail('Canonical quiz engine: submission/session parity missing '+bit);
  if(engine.includes("selected=new Set([i]);submitAnswer();return"))fail('Canonical quiz engine: single-answer questions bypass Submit Answer');
  if(studio.includes('sel=new Set([i]);grade();return'))fail('Studio: single-answer questions bypass canonical Submit Answer step');
  if(!studio.includes("submitRow.style.display='flex'"))fail('Studio: canonical Submit Answer row is not shown for all ungraded questions');
  if(standard.includes('st.answers[k]=[i];if(!reviewMode)saveDB();submitAnswer();return'))fail('Standard Hazards: single-answer questions bypass canonical Submit Answer step');
  if(!standard.includes('row.style.display="flex"'))fail('Standard Hazards: canonical Submit Answer row is not shown for all ungraded questions');
  if(challenge.includes('cur.sel=[i];submit(q);return'))fail('Advanced Hazards: single-answer questions bypass canonical Submit Answer step');
  if(!challenge.includes('$("#submitRow").style.display="flex"'))fail('Advanced Hazards: canonical Submit Answer row is not shown for all ungraded questions');
}
checkCanonicalSubmission();
{
  const src=read('equipment/exam-1/hazards.html');
  if(!src.includes("(done?'Continue ':'Start ')+ids[5]"))fail('Hazards dashboard: missing Continue behavior for started sets');
}
function checkStudioIndexes(){
  const src=read('equipment/exam-1/studio.html');
  for(const token of ['ALL_BY_UID=new Map','BANK_QUESTIONS=new Map','ALL_BY_UID.get(uid)','BANK_QUESTIONS.get(bank)']) if(!src.includes(token))fail('Studio: missing indexed lookup '+token);
  if(src.includes("ALL.find(x=>x.uid===uid)"))fail('Studio: linear UID lookup remains in quiz path');
  if(!src.includes('if(!ALL_BY_UID.size)return;'))fail('Studio: active session can be cleared before source hydration completes');
  if(!src.includes('id="studio-submit-row"')||!src.includes('class="explain"')||!src.includes('id="fbCitation" class="cite"'))fail('Studio: quiz session is not using canonical Bank 1 structure');
  if(src.includes('Studio quiz view: keep the normal question workflow within a desktop viewport.'))fail('Studio: obsolete quiz-specific compact layout remains');
  if(!src.includes("meta.imageKind==='bank3'")||!src.includes('async function hydrateStudioImage(q,host)')||!src.includes('STUDIO_IMAGE_CACHE'))fail('Studio: canonical image questions are not lazily hydrated');
  if(!src.includes("document.body.classList.toggle('mbu-quiz-active',id==='quiz')")||!src.includes('body.mbu-quiz-active>.wrap>.top{display:none}'))fail('Studio: canonical quiz is still wrapped by the extra Studio shell');
}
checkStudioIndexes();
{
  const engine=read('equipment/assets/quiz-engine.js');
  for(const bit of [
    "autoTimer=setTimeout(()=>{autoTimer=null;currentIndex++;persistPosition();loadQuestion()},350)",
    "function nav(d){clearTimeout(autoTimer);autoTimer=null;",
    "function persistPosition()",
    "function renderDashboard()",
    "function loadQuestion()",
    "function resetCurrent()",
    "function migrateLegacyState"
  ]) if(!engine.includes(bit))fail('Canonical quiz engine: runtime contract missing '+bit);
  if(!engine.includes("if(next===lastSaved)return"))fail('Canonical quiz engine: duplicate localStorage writes are not suppressed');
}
for(const p of ['equipment/assets/hazards-standard-engine.js','equipment/assets/hazards-quiz-engine.js']){
  const src=read(p);
  if(!src.includes('lastSaved')||!src.includes('if(next===lastSaved)return'))fail(p+': duplicate localStorage writes are not suppressed');
}
function checkCanonicalNavigators(){
  const engine=read('equipment/assets/quiz-engine.js');
  for(const p of ['equipment/exam-1/quiz-bank-1.html','equipment/exam-1/quiz-bank-2.html','equipment/exam-1/quiz-bank-3.html','equipment/exam-1/combined.html']){
    const src=read(p);
    if(!src.includes('../assets/navigator.js'))fail(p+': shared navigator is not loaded');
    if(!src.includes('../assets/quiz-engine.js'))fail(p+': canonical shared quiz engine is not loaded');
    if(src.includes('mbuNavButton('))fail(p+': obsolete navigator alias remains');
  }
  if(!engine.includes('MBUNavigator.button'))fail('Canonical quiz engine: shared navigator renderer is missing');
}
checkCanonicalNavigators();
{
 const src=read('equipment/assets/hazards-standard-engine.js');
 const start=src.indexOf('function loadQuestion()'),end=src.indexOf('function choose(',start);
 if(start>=0&&end>start&&src.slice(start,end).includes('saveDB();'))fail('Shared standard Hazards engine: render path still writes progress');
 if(!src.includes('db.current=currentIndex;saveDB()'))fail('Shared standard Hazards engine: navigation does not persist position explicitly');
}
for(const p of ['equipment/exam-1/hazards-bank-3.html','equipment/exam-1/hazards-harder.html']){
  const src=read(p);
  if(!src.includes('.opt.ok,.opt.miss{border-color:var(--o2)!important'))fail(p+': keyed missed answers are not visibly green');
}
{
  const src=read('equipment/assets/hazards-quiz-engine.js');
  if(!src.includes("timer=setTimeout(()=>{timer=null;next()},350)"))fail('Shared Hazards engine: timer is not self-clearing');
  if(!src.includes('function next(){clearTimeout(timer);timer=null;'))fail('Shared Hazards engine: manual Next does not clear pending auto-advance');
}
for(const p of ['equipment/exam-1/quiz-bank-1.html','equipment/exam-1/quiz-bank-2.html','equipment/exam-1/studio.html']){
 const src=read(p); if(!src.includes('Right-click an answer to cross it out.')||!src.includes('mbu-crossout-hint'))fail(p+': missing canonical cross-out interaction hint');
}
for(const p of ['equipment/exam-1/hazards-100.html','equipment/exam-1/hazards-bank-2.html']){
 const src=read(p),engine=read('equipment/assets/hazards-standard-engine.js');
 if(!src.includes('../assets/hazards-standard-engine.js')||!engine.includes('mbu-crossout-hint')||!engine.includes('Right-click an answer to cross it out.'))fail(p+': shared standard Hazards runtime is missing canonical cross-out hint');
}
for(const p of ['equipment/exam-1/hazards-bank-3.html','equipment/exam-1/hazards-harder.html']){
 const src=read(p),engine=read('equipment/assets/hazards-quiz-engine.js');
 if(!src.includes('../assets/hazards-quiz-engine.js')||!engine.includes('mbu-crossout-hint')||!engine.includes('Right-click an answer to cross it out.'))fail(p+': shared Hazards runtime is missing canonical cross-out hint');
}
{
 const src=read('equipment/exam-1/quiz-bank-3.html');
 if(!src.includes('Right-click an answer to cross it out.')||!src.includes('mbu-crossout-hint'))fail('equipment/exam-1/quiz-bank-3.html: missing canonical cross-out interaction hint');
}

// Hazards dashboard must use the exact Challenge persistence key.
{
 const dashboard=read('equipment/exam-1/hazards.html'),challenge=read('equipment/exam-1/hazards-harder.html');
 const m=challenge.match(/key:\s*["']([^"']+)["']/);
 if(!m)fail('Hazards dashboard: Challenge persistence key missing from Challenge runtime');
 else if(!dashboard.includes("'"+m[1]+"'"))fail('Hazards dashboard: Challenge aggregation key does not match Challenge persistence key');
 if(dashboard.includes("srna_hazards_safety_harder_v1"))fail('Hazards dashboard: obsolete Challenge aggregation key remains');
}

// Studio aggregate readers must use the exact persistence keys written by each source bank.
{
 const studio=read('equipment/exam-1/studio.html'),challenge=read('equipment/exam-1/hazards-harder.html');
 const m=challenge.match(/key:\s*["']([^"']+)["']/); if(!m)fail('Challenge: persistence key missing from engine config');
 else if(!studio.includes("['hh','"+m[1]+"','ans']"))fail('Studio: Challenge aggregation key does not match Challenge persistence key');
 if(studio.includes("['hh','srna_hazards_safety_harder_v1','ans']"))fail('Studio: obsolete Challenge aggregation key remains');
}

// Study Studio answer state must use canonical UIDs and restore graded selections on revisit.
{
 const studio=read('equipment/exam-1/studio.html'),sync=read('equipment/assets/studio-sync.js');
 if(!sync.includes('if(q&&q.uid)return normalizeKey(q.uid)'))fail('Studio sync: answer keys do not prefer canonical question UIDs');
 if(!studio.includes('setSessionAnswer(q.uid,{ok,selected,at:Date.now()})'))fail('Studio: graded selections are not persisted in session state');
 if(!studio.includes('function sessionAnswer(uid)'))fail('Studio: session-local answer state is missing');
 if(!studio.includes("answers:{}"))fail('Studio: new sessions do not initialize isolated answer state');
 if(studio.includes("session.map(q=>DB.ans[q.uid]).filter(Boolean)"))fail('Studio: session stats still read cumulative answer history');
 if(!studio.includes('saved=sessionAnswer(q.uid)'))fail('Studio: question renderer still reads cumulative history instead of session state');
 if(!studio.includes('saved&&Array.isArray(saved.selected)'))fail('Studio: saved selections are not restored on navigation');
 if(!studio.includes('graded=!!(saved&&savedSel)'))fail('Studio: revisited answered questions are not restored as graded');
 if(!studio.includes("if(q.ans.includes(i))b.classList.add('correct');else if(sel.has(i))b.classList.add('incorrect')"))fail('Studio: revisited answers do not restore correct/incorrect styling');
}

// Study Studio uses the same self-clearing auto-advance lifecycle as the canonical quiz runtimes.
{
 const src=read('equipment/exam-1/studio.html');
 if(!src.includes('function showQ(){clearTimeout(autoTimer);autoTimer=null;'))fail('Studio: render does not clear/null auto-advance timer');
 if(!src.includes('function nextQ(){clearTimeout(autoTimer);autoTimer=null;'))fail('Studio: manual/automatic Next leaves a stale timer handle');
 if(!src.includes('if(prior&&prior.pos===pos)return;'))fail('Studio: unchanged question renders still rewrite active session state');
}

// Standard Hazards Sets 1/2 statistics should share one single-pass implementation.
{
 const src=read('equipment/assets/hazards-standard-engine.js');
 if(!src.includes('const stateStats=(base,st,missed)=>{let done=0,good=0;for(const q of base)'))fail('Standard Hazards: canonical stateStats helper is missing');
 if(src.includes('QUESTIONS.filter(q=>db.graded[q.id]).length'))fail('Standard Hazards: dashboard still performs duplicate filter scans');
 if(src.includes('base.filter(q=>st.graded[q.id]).length'))fail('Standard Hazards: live stats still perform duplicate filter scans');
}

// Shared Hazards 3/Challenge statistics should use one canonical scan.
{
 const src=read('equipment/assets/hazards-quiz-engine.js');
 if(!src.includes('function mainStats(){let done=0,correct=0,miss=0;for(const q of BANK)'))fail('Shared Hazards: canonical mainStats helper is missing');
 if(src.includes('BANK.map(x=>S.ans[x.id]).filter(Boolean)'))fail('Shared Hazards: render still rebuilds answered arrays');
 if(src.includes('answered.length'))fail('Shared Hazards: stale answered-array reference remains');
}

// Shared navigator should expose only the canonical API; the legacy global alias is obsolete.
{
 const src=read('equipment/assets/navigator.js');
 if(src.includes('window.mbuNavButton'))fail('Navigator: obsolete mbuNavButton compatibility alias remains');
 if(!src.includes('window.MBUNavigator={button}'))fail('Navigator: canonical MBUNavigator API is missing');
}

// Shared Studio storage normalization must persist and compact dead boolean entries.
{
 const src=read('equipment/assets/studio-sync.js');
 if(!src.includes('if(changed) save(d);'))fail('Studio sync: normalized storage is not persisted');
 if(src.includes('try{lastSerialized=JSON.stringify(d)}catch(e){}\n    if(changed) save(d);'))fail('Studio sync: normalization fingerprint is set before persistence');
 if(!src.includes("(field==='flags'||field==='crosses')&&!v"))fail('Studio sync: stale false flag/cross entries are not compacted');
 if(!src.includes("if(next)d.flags[k]=true;else delete d.flags[k]"))fail('Studio sync: unflagging still leaves dead false entries');
}

// Shared Studio storage should not retain obsolete helper code.
{
 const src=read('equipment/assets/studio-sync.js');
 if(src.includes('function empty()'))fail('Studio sync: unused empty storage helper remains');
}

// Studio home stats should avoid temporary mapped/filtered arrays.
{
 const src=read('equipment/exam-1/studio.html');
 if(src.includes('Object.entries(DB.ans).filter(')||src.includes('Object.entries(DB.flags).filter('))fail('Studio: home stats still allocate filtered entry arrays');
 if(!src.includes('for(const q of ALL){'))fail('Studio: home stats are not consolidated into the hydrated question pass');
}

// Studio custom source/topic matching should use Set membership.
{
 const src=read('equipment/exam-1/studio.html');
 if(!src.includes("const bs=new Set(checkedValues('sourceChecks'))")||!src.includes("const ts=new Set(checkedValues('topicChecks'))"))fail('Studio: custom builder is not using Set membership');
}

// Studio session statistics should be computed in one pass without temporary mapped/filtered arrays.
{
 const src=read('equipment/exam-1/studio.html');
 if(src.includes('session.map(q=>sessionAnswer(q.uid)).filter(Boolean)'))fail('Studio: session statistics still allocate intermediate arrays');
 if(!src.includes('for(const q of session){const r=sessionAnswer(q.uid);if(!r)continue;done++;if(r.ok)correct++}'))fail('Studio: session statistics are not consolidated into one pass');
}

// Studio home renders should reuse one incrementally maintained UID index instead of rebuilding a Set from every question.
{
 const src=read('equipment/exam-1/studio.html');
 if(!src.includes('ALL_UIDS=new Set()'))fail('Studio: UID identity index is not initialized');
 if(!src.includes('ALL_BY_UID.set(q.uid,q);ALL_UIDS.add(q.uid);'))fail('Studio: UID identity index is not maintained incrementally');
 if(src.includes('ALL_UIDS=new Set(ALL_BY_UID.keys())'))fail('Studio: UID identity index is still rebuilt after hydration');
 if(src.includes('const valid=new Set(ALL.map(q=>q.uid))'))fail('Studio: home render still rebuilds the question UID Set');
}

// Studio hydration should fetch independent bank sources concurrently to reduce startup latency.
{
 const src=read('equipment/exam-1/studio.html');
 if(!src.includes('await Promise.all(sources.map(async source=>'))fail('Studio: bank sources are not hydrated concurrently');
 if(!src.includes('if(qs.length){addLoaded(qs);try{buildTopics()}'))fail('Studio: loaded banks are not published progressively to the selector');
 if(!src.includes('ALL_BY_UID.set(q.uid,q);ALL_UIDS.add(q.uid);'))fail('Studio: progressive hydration does not maintain UID indexes incrementally');
 if(src.includes('ALL_BY_UID=new Map(ALL.map(q=>[q.uid,q]))'))fail('Studio: progressive hydration still rebuilds the full UID index');
}

// Studio must not parse large embedded Hazards image maps during bank hydration.
{
 const src=read('equipment/exam-1/studio.html');
 if(src.includes("t.match(/const IMGS=(\\{[\\s\\S]*?\\});/)"))fail('Studio: Hazards image payload is still eagerly parsed');
 if(!src.includes("meta.imageKind==='hazards'")||!src.includes("url:meta.imageSource"))fail('Studio: Hazards images are not represented lazily');
}

// Studio search should use its normalized one-time search index instead of rebuilding text per query.
{
 const src=read('equipment/exam-1/studio.html');
 if(!src.includes("searchText:(stem+' '+topic+' '+exp+' '+src).toLowerCase()"))fail('Studio: normalized questions do not preindex search text');
 if(!src.includes("for(const q of ALL){if(q.searchText.includes(x)){r.push(q);if(r.length===100)break}}"))fail('Studio: search does not stop after the visible result cap');
}

// Shared Hazards Set 3 / Challenge navigation must cancel pending auto-advance before moving.
{
 const src=read('equipment/assets/hazards-quiz-engine.js');
 if(!src.includes('function nav(i){clearTimeout(timer);timer=null;'))fail('Hazards shared quiz engine: navigator does not cancel auto-advance');
 if(!src.includes('function prev(){clearTimeout(timer);timer=null;'))fail('Hazards shared quiz engine: Previous does not cancel auto-advance');
}

// Hazards Set 3 and Challenge must share one quiz engine; no page-local renderer/state engine.
for(const p of ['equipment/exam-1/hazards-bank-3.html','equipment/exam-1/hazards-harder.html']){
 const src=read(p);
 if(!src.includes('../assets/hazards-quiz-engine.js'))fail(p+': shared Hazards quiz engine is not loaded');
 if(!src.includes('MBUHazardsQuizEngine.startFromData('))fail(p+': shared Hazards quiz engine is not initialized');
 for(const legacy of ['function render(){','function showResult(','function quizNavHTML(','function fresh(){']) if(src.includes(legacy))fail(p+': page-local legacy quiz engine remains: '+legacy);
}
const hazardEngine=read('equipment/assets/hazards-quiz-engine.js');
for(const token of ['mbu-crossout-hint','MBUNavigator.button','classList.add(rec.sel.includes(i)?"ok":"miss")','timer=setTimeout(()=>{timer=null;next()},350)']) if(!hazardEngine.includes(token))fail('Shared Hazards engine missing canonical behavior: '+token);

// Canonical timer lifecycle: every legacy Bank-1-style renderer must clear and null its timer on render/reset/navigation.
{
 const p='equipment/assets/quiz-engine.js',src=read(p);
 if(!src.includes('function loadQuestion(){clearTimeout(autoTimer);autoTimer=null;'))fail(p+': render does not clear/null auto-advance timer');
 if(!src.includes('clearTimeout(autoTimer);autoTimer=null;'))fail(p+': auto-advance timer lifecycle is incomplete');
 if(src.includes('autoTimer=setTimeout(()=>{currentIndex++;'))fail(p+': auto-advance callback leaves a stale timer handle');
 const renderStart=src.indexOf('function loadQuestion()'),renderEnd=src.indexOf('function choose(',renderStart);if(renderStart>=0&&renderEnd>renderStart&&src.slice(renderStart,renderEnd).includes('saveDB();'))fail(p+': render path still writes progress');
 if(!src.includes('function persistPosition()'))fail(p+': navigation position is not persisted explicitly outside render');
 if(!src.includes("currentIndex=0;saveDB();loadQuestion()}"))fail(p+': reset does not persist and rerender through a shared exit path');
}
{
 const src=read('equipment/assets/hazards-standard-engine.js');
 if(!src.includes('function loadQuestion(){clearTimeout(autoTimer);autoTimer=null;'))fail('Shared standard Hazards engine: render does not clear/null auto-advance timer');
 if(!src.includes('clearTimeout(autoTimer);autoTimer=null;'))fail('Shared standard Hazards engine: auto-advance timer lifecycle is incomplete');
 if(src.includes('autoTimer=setTimeout(()=>{currentIndex++;'))fail('Shared standard Hazards engine: auto-advance callback leaves a stale timer handle');
}
if(!read('equipment/assets/hazards-quiz-engine.js').includes('function resetQuestion(){clearTimeout(timer);timer=null;'))fail('Shared Hazards engine reset does not cancel auto-advance');

// Hazards Sets 1-2 share one standard runtime; page files contain data/config only.
for(const p of ['equipment/exam-1/hazards-100.html','equipment/exam-1/hazards-bank-2.html']){const src=read(p);if(!src.includes('../assets/hazards-standard-engine.js'))fail(p+': shared standard Hazards engine missing');if(!src.includes('MBUHazardsStandardEngine.startFromData('))fail(p+': shared standard Hazards engine not initialized');for(const legacy of ['function loadQuestion(){','function submitAnswer(){','function renderDashboard(){'])if(src.includes(legacy))fail(p+': duplicate page-local quiz runtime remains: '+legacy)}

const sharedHazardsEngine=read('equipment/assets/hazards-quiz-engine.js');
if(/images\s*:\s*[A-Za-z_$][\w$]*\s*\|\|/.test(sharedHazardsEngine))fail('Shared Hazards engine has invalid default expression inside object destructuring');

// Final end-to-end regression invariants for dashboards, Studio resume/reset, and bank totals.
{
 const b1=read('equipment/exam-1/quiz-bank-1.html'),b2=read('equipment/exam-1/quiz-bank-2.html'),b3=read('equipment/exam-1/quiz-bank-3.html'),studio=read('equipment/exam-1/studio.html');
 if(!/id=["']overall["'][^>]*>0\s*\/\s*500 completed</.test(b1))fail('Bank 1: dashboard does not expose the 500-question total');
 const b2Payload=JSON.parse(read('equipment/exam-1/data/bank2.json'));if((b2Payload.questions||[]).length!==500)fail('Bank 2: canonical question total is not 500');
 const b3Payload=JSON.parse(read('equipment/exam-1/data/bank3.json'));if((b3Payload.questions||[]).length!==500)fail('Bank 3: canonical question total is not 500');
 for(const token of [
  'function resumeActive(){if(!DB.active||!DB.active.uids)return;',
  'pos=Math.min(DB.active.pos||0,session.length-1);showQ()',
  'function studioNav(delta){clearTimeout(autoTimer);autoTimer=null;',
  'pos=n;saveActive();showQ()',
  'function resetStudioCurrent(){clearTimeout(autoTimer);autoTimer=null;',
  'clearSessionAnswer(q.uid);',
  'function nextQ(){clearTimeout(autoTimer);autoTimer=null;',
  'else clearActive();session=[]'
 ]) if(!studio.includes(token))fail('Studio: final session lifecycle invariant missing: '+token);
 if(!studio.includes('saved=sessionAnswer(q.uid)')||!studio.includes('graded=!!(saved&&savedSel)'))fail('Studio: revisiting a session question does not restore graded state');
 if(!studio.includes('setSessionAnswer(q.uid,{ok,selected,at:Date.now()})'))fail('Studio: grading does not persist selected answers for resume');
}

// Bank 3 graded-state parity is inherited from the canonical Bank 1 engine and stylesheet.
{
 const engine=read('equipment/assets/quiz-engine.js'),css=read('equipment/assets/bank1-quiz-ui.css');
 if(!engine.includes("b.classList.add('correct')")||!engine.includes("b.classList.add('incorrect')"))fail('Bank 3: canonical graded-answer feedback is missing from shared engine');
 if(!css.includes('.opt.correct')||!css.includes('.opt.incorrect')||!css.includes('.explain'))fail('Bank 3: canonical answer/feedback styling is missing from shared stylesheet');
}



// Canonical shared UI must own final graded state across every linked quiz, including Hazards.
{
 const css=read('equipment/assets/bank1-quiz-ui.css');
 if(!css.includes('.mbu-bank1-ui .opt.correct,.mbu-bank1-ui .opt.ok,.mbu-bank1-ui .opt.miss'))fail('Canonical UI: graded keyed-answer contract is missing');
 if(!css.includes('text-decoration:none!important;opacity:1!important'))fail('Canonical UI: graded answers do not override cross-out state');
 if(!css.includes('.mbu-bank1-ui .explain,.mbu-bank1-ui #fb.explain'))fail('Canonical UI: explanation panel contract is missing');
 for(const p of ['equipment/exam-1/hazards-100.html','equipment/exam-1/hazards-bank-2.html','equipment/exam-1/hazards-bank-3.html','equipment/exam-1/hazards-harder.html']){
  const src=read(p);
  if(!src.includes('bank1-quiz-ui.css'))fail(p+': not linked to canonical quiz UI');
  if(!src.includes('mbu-bank1-ui'))fail(p+': canonical quiz UI scope class missing');
 }
}

// Shared asset/cache contract: every versioned shared asset reference uses the current release revision.
{
 const updater=read('equipment/assets/auto-update.js');
 if(!updater.includes("sessionStorage.getItem(BUILD_CACHE_KEY)"))fail('Updater: build baseline is not retained per session');
 if(!updater.includes('const CHECK_COOLDOWN = 120000'))fail('Updater: update polling cooldown regressed');
 const studio=read('equipment/exam-1/studio.html');
 if(!studio.includes('await Promise.all(sources.map(async source=>'))fail('Studio: bank hydration is not parallelized');
 if(studio.includes("localStorage.getItem('mbu_bank3_progress')")||studio.includes("localStorage.getItem('MBU_BANK3_PROGRESS')"))fail('Studio: obsolete Bank 3 storage-key fallbacks remain');
}

if(failures.length){console.error('\nVALIDATION FAILED\n- '+failures.join('\n- '));process.exit(1)}
console.log('Repository validation passed: Banks 1-3 are 500 questions each; Combined is 150 questions; local assets, Studio sources, shared quiz runtimes, answer indexes, and build manifest are valid.');
