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
  const manifest=JSON.parse(read('equipment/exam-1/banks.json')),bank=manifest.banks.find(b=>b.id==='bank1'),renderer=read('equipment/assets/canonical-bank-page.js'),engine=read('equipment/assets/quiz-engine.js');
  if(!bank||bank.data!=='data/bank1.json'||bank.storageKey!=='SRNA_COMBINED_EXAM_SET_1_2026_V1')fail('Bank 1: canonical manifest config is missing');
  if(!renderer.includes('window.MBU_QUIZ_CONFIG=')||!renderer.includes("loadScript('quiz-engine.js')"))fail('Bank 1: shared canonical renderer/runtime wiring is missing');
  if(!engine.includes('MBUNavigator.button')||!engine.includes('MBUCalculator?.besideFlag()'))fail('Bank 1 shared engine: canonical navigation/calculator contract is missing');
  return qs;
}
function checkBank2(){
  canonicalPayload('equipment/exam-1/data/bank2.json','Quiz Bank 2 canonical data',500,{1:100,2:100,3:100,4:100,5:100});
  const bank=JSON.parse(read('equipment/exam-1/banks.json')).banks.find(b=>b.id==='bank2');
  if(!bank||bank.data!=='data/bank2.json'||bank.legacyFormat!=='bank2'||bank.engine!=='canonical')fail('Bank 2: canonical manifest config is missing');
}
function checkBank3(){
  const qs=canonicalPayload('equipment/exam-1/data/bank3.json','Quiz Bank 3 canonical data',500,{1:100,2:100,3:100,4:100,5:100});
  const bank=JSON.parse(read('equipment/exam-1/banks.json')).banks.find(b=>b.id==='bank3');
  if(!bank||bank.data!=='data/bank3.json'||bank.legacyFormat!=='bank3'||bank.imageBase!=='images/bank3/'||bank.engine!=='canonical')fail('Bank 3: canonical manifest config is missing');
  for(const q of qs)if(q.imageId&&!exists('equipment/exam-1/images/bank3/'+q.imageId+'.png'))fail('Bank 3: missing indexed image asset '+q.imageId);
}
function checkCombined(){
  const qs=canonicalPayload('equipment/exam-1/data/combined.json','Combined',150,{1:50,2:50,3:50});
  for(const q of qs)if(q.imageId&&!exists('equipment/exam-1/images/combined/'+q.imageId+'.png'))fail('Combined: missing indexed image asset '+q.imageId);
  const bank=JSON.parse(read('equipment/exam-1/banks.json')).banks.find(b=>b.id==='combined');
  if(!bank||bank.data!=='data/combined.json'||bank.legacyFormat!=='combined'||bank.imageBase!=='images/combined/'||bank.engine!=='canonical')fail('Combined: canonical manifest config is missing');
}
function checkHazardsCanonical(){
  const qs=canonicalPayload('equipment/exam-1/data/hazards.json','Workstation Hazards',350,{1:100,2:100,3:100,4:50});
  for(const q of qs)if(q.image&&!q.imageSvg&&!exists('equipment/exam-1/images/hazards/'+q.image+'.png'))fail('Workstation Hazards: missing indexed image asset '+q.image);
  const manifest=JSON.parse(read('equipment/exam-1/banks.json')),loader=read('equipment/assets/hazards-page.js'),standard=read('equipment/assets/hazards-standard-engine.js'),advanced=read('equipment/assets/hazards-quiz-engine.js');
  if(!standard.includes('startFromData')||!advanced.includes('startFromData'))fail('Workstation Hazards: shared engines do not load canonical data');
  for(const def of manifest.hazards?.pages||[]){
    const page=read('equipment/exam-1/'+def.page);
    if(!page.includes('data-mbu-hazard="'+def.id+'"')||!page.includes("src:'hazards-page.js'")||!page.includes('../assets/build-bootstrap.js'))fail(def.page+': build-driven Hazards bootstrap is missing');
    if(def.data!=='data/hazards.json'||![1,2,3,4].includes(def.setFilter)||!def.storageKey||!def.bankKey||!['standard','advanced'].includes(def.runtime))fail(def.page+': Hazards manifest runtime config is incomplete');
    if(page.includes('MBUHazardsStandardEngine.startFromData(')||page.includes('MBUHazardsQuizEngine.startFromData(')||page.includes('hazards-quiz-engine.js?v=')||page.includes('hazards-standard-engine.js?v='))fail(def.page+': duplicated Hazards runtime config remains');
  }
  for(const token of ["runtime.loadScript('hazards-standard-engine.js')","runtime.loadScript('hazards-quiz-engine.js')",'MBUHazardsStandardEngine.startFromData','MBUHazardsQuizEngine.startFromData'])if(!loader.includes(token))fail('Hazards loader missing '+token);
}
function checkCanonicalNewQuizBanks(){
  const manifest=JSON.parse(read('equipment/exam-1/banks.json')),renderer=read('equipment/assets/canonical-bank-page.js'),engine=read('equipment/assets/quiz-engine.js');
  const canonical=manifest.banks.filter(b=>b.engine==='canonical');
  for(const bank of canonical){
    const p='equipment/exam-1/'+bank.page;if(!exists(p)){fail('Canonical bank page missing '+p);continue}
    const page=read(p);
    if(!page.includes('data-mbu-bank="'+bank.id+'"'))fail(bank.page+': page does not declare its canonical bank id');
    if(!page.includes("readyGlobal:'MBUQuizReady'")||!page.includes("src:'canonical-bank-page.js'")||!page.includes('../assets/build-bootstrap.js'))fail(bank.page+': build-driven canonical bootstrap is missing');
    for(const forbidden of ['id="dashboard"','id="quiz"','MBU_QUIZ_CONFIG','quiz-engine.js?v=','bank1-quiz-ui.css?v=','<style>'])if(page.includes(forbidden))fail(bank.page+': duplicated canonical implementation remains: '+forbidden);
  }
  for(const bit of ['id="dashboard"','id="cards"','id="overall"','id="quiz"','id="set-badge"','id="mbuFlagBtn"','>Report</button>','>Navigator</button>','mbu-return','id="completed"','id="total"','id="score"','id="missed"','mbu-crossout-hint','id="multi-submit-row"','id="submit-multi"','id="explain"','id="citation"','id="prev"','id="next"',"runtime.loadStyle('bank1-quiz-ui.css')","runtime.loadScript('studio-sync.js')","runtime.loadScript('navigator.js')","runtime.loadScript('calculator.js')","runtime.loadScript('quiz-engine.js')","runtime.loadScript('auto-update.js')"])if(!renderer.includes(bit))fail('Canonical bank renderer is missing '+bit);
  for(const bit of ['MBUNavigator.button','MBUCalculator?.besideFlag()','goDashboard()','Submit Selections (','lastSaved'])if(!engine.includes(bit))fail('Canonical quiz engine: missing shared behavior '+bit);
}
function checkCopies(){
  for(const p of ['equipment/exam-1/index.html','equipment/exam-1/quiz-bank-3.html']){
    const src=read(p); if(/600\s+questions/i.test(src)) fail(p+': stale 600-question Bank 3 copy remains');
  }
}
function checkAssetVersions(){
  const pages=['index.html','equipment/index.html',...fs.readdirSync(path.join(root,'equipment/exam-1')).filter(x=>x.endsWith('.html')).map(x=>'equipment/exam-1/'+x)];
  for(const p of pages){
    const src=read(p);
    if(/[?&]v=\d+/.test(src))fail(p+': manual shared-asset revision remains');
    if((p==='index.html'||p==='equipment/index.html'||p.startsWith('equipment/exam-1/'))&&!src.includes('build-bootstrap.js')&&p!=='equipment/exam-1/banks.json')fail(p+': build bootstrap is missing');
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
  const src=read('equipment/assets/studio-page.js');
  let manifest;try{manifest=JSON.parse(read('equipment/exam-1/banks.json'))}catch(e){fail('Studio: bank manifest is invalid JSON: '+e.message);return}
  if(manifest.canonicalBank!=='bank1')fail('Studio: Bank 1 is not declared canonical in banks.json');
  for(const id of ['bank1','bank2','bank3','combined','hazards'])if(!manifest.banks.some(b=>b.id===id))fail('Studio: central bank manifest is missing '+id);
  if(!Array.isArray(manifest.studioSources)||manifest.studioSources.length<8)fail('Studio: complete manifest source catalog is missing');
  for(const srcDef of manifest.studioSources){if(srcDef.format!=='canonical')fail('Studio: noncanonical source format remains for '+srcDef.key);if(!exists('equipment/exam-1/'+srcDef.data))fail('Studio: manifest data source missing '+srcDef.data)}
  for(const bit of ["studioFetch('banks.json')","BANK_MANIFEST.studioSources.map","STUDIO_SOURCES=BANK_MANIFEST.studioSources.map","meta.format!=='canonical'"])if(!src.includes(bit))fail('Studio: manifest-driven hydration contract missing '+bit);
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
  const loader=read('equipment/assets/hazards-page.js'),standard=read('equipment/assets/hazards-standard-engine.js'),challenge=read('equipment/assets/hazards-quiz-engine.js');
  if(!loader.includes("runtime.loadScript('navigator.js')"))fail('Hazards loader: shared Bank 1 navigator is not loaded');
  if(!standard.includes('MBUNavigator.button'))fail('Shared standard Hazards engine does not use the canonical navigator renderer');
  if(!challenge.includes('MBUNavigator.button'))fail('Shared challenge Hazards engine does not use the canonical navigator renderer');
}
checkHazardNavigators();
// Hazards dashboard standard sets must count graded submissions, while answer-record sets may count saved result objects.
{
 const src=read('equipment/assets/hazards-dashboard.js');
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
  const studio=read('equipment/assets/studio-page.js');
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
  const src=read('equipment/assets/hazards-dashboard.js');
  if(!src.includes("(done?'Continue ':'Start ')+ids[5]"))fail('Hazards dashboard: missing Continue behavior for started sets');
}
function checkStudioIndexes(){
  const src=read('equipment/assets/studio-page.js'),page=read('equipment/exam-1/studio.html');
  for(const token of ['ALL_BY_UID=new Map','BANK_QUESTIONS=new Map','ALL_BY_UID.get(uid)','BANK_QUESTIONS.get(bank)']) if(!src.includes(token))fail('Studio: missing indexed lookup '+token);
  if(src.includes("ALL.find(x=>x.uid===uid)"))fail('Studio: linear UID lookup remains in quiz path');
  if(!src.includes("if(!DB.active||!Array.isArray(DB.active.uids)||!DB.active.uids.length||!ALL_BY_UID.size)return;"))fail('Studio: active session hydration guard is missing');
  if(!src.includes('if(missing&&studioHasFailedSource())'))fail('Studio: active session is not preserved during a source failure');
  if(!page.includes('id="studio-submit-row"')||!page.includes('class="explain"')||!page.includes('id="fbCitation" class="cite"'))fail('Studio: quiz session is not using canonical Bank 1 structure');
  if(page.includes('Studio quiz view: keep the normal question workflow within a desktop viewport.'))fail('Studio: obsolete quiz-specific compact layout remains');
  if(!src.includes('if(meta.imageBase)')||!src.includes("img={kind:'direct',url:meta.imageBase")||!src.includes("q.img.kind==='direct'"))fail('Studio: canonical image questions are not using indexed image paths');
  if(!src.includes("document.body.classList.toggle('mbu-quiz-active',id==='quiz')")||!page.includes('body.mbu-quiz-active>.wrap>.top{display:none}'))fail('Studio: canonical quiz is still wrapped by the extra Studio shell');
}
{
 const engine=read('equipment/assets/quiz-engine.js'),haz=read('equipment/assets/hazards-quiz-engine.js');
 for(const p of ['equipment/exam-1/combined-images.js','equipment/exam-1/data/bank3-images.js','equipment/exam-1/data/hazards-images.json'])if(exists(p))fail('Indexed images: obsolete bundle still exists '+p);
 if(engine.includes('MBU_IMAGE_SOURCE_CACHE')||engine.includes('imageBundleText(')||engine.includes('imageSource'))fail('Canonical quiz engine: legacy image-bundle fallback remains');
 if(haz.includes('IMGS[q.img]')||haz.includes('imageUrl'))fail('Hazards engine: legacy image-bundle fallback remains');
}
checkStudioIndexes();
{
  const engine=read('equipment/assets/quiz-engine.js');
  for(const token of ['QUESTION_BY_SET_ID=new Map','QUESTION_INDEX_BY_SET_ID=new Map','questionById(s,id)','ids.map(id=>questionById(s,id))'])if(!engine.includes(token))fail('Canonical quiz engine: missing indexed lookup '+token);
  if(engine.includes('SETS[s].find(')||engine.includes('findIndex(q=>String(q.id)'))fail('Canonical quiz engine: linear set-ID lookup remains');
  for(const p of ['equipment/exam-1/studio-bank1.json','equipment/exam-1/studio-bank2.json','equipment/exam-1/studio-bank3.json','equipment/exam-1/studio-hazards3.json','equipment/exam-1/studio-challenge.json','equipment/exam-1/combined-questions.js'])if(exists(p))fail('Canonical data: obsolete duplicate artifact remains '+p);
}
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
  const engine=read('equipment/assets/quiz-engine.js'),renderer=read('equipment/assets/canonical-bank-page.js');
  if(!renderer.includes("runtime.loadScript('navigator.js')"))fail('Canonical renderer: shared navigator is not loaded');
  if(!renderer.includes("runtime.loadScript('quiz-engine.js')"))fail('Canonical renderer: shared quiz engine is not loaded');
  if(renderer.includes('mbuNavButton('))fail('Canonical renderer: obsolete navigator alias remains');
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
{
 const renderer=read('equipment/assets/canonical-bank-page.js'),studio=read('equipment/exam-1/studio.html');
 if(!renderer.includes('Right-click an answer to cross it out.')||!renderer.includes('mbu-crossout-hint'))fail('Canonical bank renderer: missing cross-out interaction hint');
 if(!studio.includes('Right-click an answer to cross it out.')||!studio.includes('mbu-crossout-hint'))fail('Studio: missing canonical cross-out interaction hint');
}
{
 const standard=read('equipment/assets/hazards-standard-engine.js'),advanced=read('equipment/assets/hazards-quiz-engine.js');
 if(!standard.includes('mbu-crossout-hint')||!standard.includes('Right-click an answer to cross it out.'))fail('Shared standard Hazards runtime is missing canonical cross-out hint');
 if(!advanced.includes('mbu-crossout-hint')||!advanced.includes('Right-click an answer to cross it out.'))fail('Shared advanced Hazards runtime is missing canonical cross-out hint');
}

// Hazards dashboard and Studio must use the exact Challenge persistence key from the manifest.
{
 const manifest=JSON.parse(read('equipment/exam-1/banks.json')),challenge=(manifest.hazards?.pages||[]).find(x=>x.id==='hh'),dashboard=read('equipment/assets/hazards-dashboard.js'),studio=read('equipment/assets/studio-page.js');
 if(!challenge?.storageKey)fail('Challenge: persistence key missing from manifest');
 else{
  if(!dashboard.includes("'"+challenge.storageKey+"'"))fail('Hazards dashboard: Challenge aggregation key does not match manifest');
  if(!studio.includes("['hh','"+challenge.storageKey+"','ans']"))fail('Studio: Challenge aggregation key does not match manifest');
 }
 if((dashboard+studio).includes('srna_hazards_safety_harder_v1'))fail('Obsolete Challenge aggregation key remains');
}

// Study Studio answer state must use canonical UIDs and restore graded selections on revisit.
{
 const studio=read('equipment/assets/studio-page.js'),sync=read('equipment/assets/studio-sync.js');
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
 const src=read('equipment/assets/studio-page.js');
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
 if(!src.includes('if(changed)save(d);'))fail('Studio sync: normalized storage is not persisted');
 if(src.includes('try{lastSerialized=JSON.stringify(d)}catch(e){}\n    if(changed) save(d);'))fail('Studio sync: normalization fingerprint is set before persistence');
 if(!src.includes("if(!v){changed=true;continue}"))fail('Studio sync: stale false flag/cross entries are not compacted');
 if(!src.includes("if(next)d.flags[k]=true;else delete d.flags[k]"))fail('Studio sync: unflagging still leaves dead false entries');
 if(!src.includes('function plainObject(v)')||!src.includes('function normalizeSessionState(v)'))fail('Studio sync: structural storage normalization is missing');
}

// Shared Studio storage should not retain obsolete helper code.
{
 const src=read('equipment/assets/studio-sync.js');
 if(src.includes('function empty()'))fail('Studio sync: unused empty storage helper remains');
}

// Studio home stats should avoid temporary mapped/filtered arrays.
{
 const src=read('equipment/assets/studio-page.js');
 if(src.includes('Object.entries(DB.ans).filter(')||src.includes('Object.entries(DB.flags).filter('))fail('Studio: home stats still allocate filtered entry arrays');
 if(!src.includes('for(const q of ALL){'))fail('Studio: home stats are not consolidated into the hydrated question pass');
}

// Studio custom source/topic matching should use Set membership.
{
 const src=read('equipment/assets/studio-page.js');
 if(!src.includes("const bs=new Set(checkedValues('sourceChecks'))")||!src.includes("const ts=new Set(checkedValues('topicChecks'))"))fail('Studio: custom builder is not using Set membership');
}

// Studio session statistics should be computed in one pass without temporary mapped/filtered arrays.
{
 const src=read('equipment/assets/studio-page.js');
 if(src.includes('session.map(q=>sessionAnswer(q.uid)).filter(Boolean)'))fail('Studio: session statistics still allocate intermediate arrays');
 if(!src.includes('for(const q of session){const r=sessionAnswer(q.uid);if(!r)continue;done++;if(r.ok)correct++}'))fail('Studio: session statistics are not consolidated into one pass');
}

// Studio should keep one canonical UID lookup Map; the redundant UID Set and legacy parsers are removed.
{
 const src=read('equipment/assets/studio-page.js');
 if(!src.includes('ALL_BY_UID=new Map()')||!src.includes('ALL_BY_UID.set(q.uid,q);'))fail('Studio: canonical UID Map is missing');
 if(src.includes('ALL_UIDS'))fail('Studio: redundant UID Set remains');
 if(src.includes('function arrAfter(')||src.includes('function evalArr('))fail('Studio: obsolete legacy array parser helpers remain');
}
// Studio hydration should fetch independent bank sources concurrently to reduce startup latency.
{
 const src=read('equipment/assets/studio-page.js');
 if(!src.includes('await Promise.all(STUDIO_SOURCES.map(source=>hydrateStudioSource(source)))'))fail('Studio: bank sources are not hydrated concurrently');
 if(!src.includes("addLoadedQuestions(qs);state.status='ready'"))fail('Studio: loaded banks are not published progressively to the selector');
 if(!src.includes('ALL_BY_UID.set(q.uid,q);'))fail('Studio: progressive hydration does not maintain the UID index incrementally');
 if(src.includes('ALL_BY_UID=new Map(ALL.map(q=>[q.uid,q]))'))fail('Studio: progressive hydration still rebuilds the full UID index');
}

// Phase 3: Studio loading must expose per-source state and retry failures without discarding healthy banks.
{
 const src=read('equipment/assets/studio-page.js');
 for(const token of ['STUDIO_SOURCE_STATE=new Map()','function renderStudioLoadState()','function retryStudioSource(key)','studio-retry-',"state.status='failed'"]) if(!src.includes(token))fail('Studio Phase 3 source reliability missing: '+token);
 if(!src.includes("home.setAttribute('aria-busy',loading?'true':'false')"))fail('Studio Phase 3 loading state does not expose aria-busy');
 if(src.includes("errors.push(label+': '"))fail('Studio Phase 3 still aggregates source failures into an unrecoverable error list');
}

// Phase 3: unchanged imported progress and a Studio answer submission should avoid redundant storage writes.
{
 const studio=read('equipment/assets/studio-page.js'),sync=read('equipment/assets/studio-sync.js');
 if(!studio.includes('let syncChanged=false;'))fail('Studio Phase 3 sync does not track whether imported progress changed');
 if(!studio.includes('if(prev&&prev.ok===nextOk&&prev.bank===bank&&prev.topic===q.topic)return;'))fail('Studio Phase 3 sync still rewrites unchanged imported answers');
 if(!studio.includes('if(syncChanged)save();'))fail('Studio Phase 3 sync still saves unconditionally');
 if(!sync.includes('function stageAnswer(bank,q,ok)'))fail('Studio sync Phase 3 staged answer API is missing');
 if(!studio.includes('MBUStudio.stageAnswer(q.bank,q,ok);setSessionAnswer('))fail('Studio Phase 3 grading still performs separate cumulative/session storage writes');
}

// Phase 3 completion: saved state is normalized, active sessions survive source outages, and flag/reset writes stay compact.
{
 const studio=read('equipment/assets/studio-page.js'),sync=read('equipment/assets/studio-sync.js');
 for(const token of ['function normalizeSessionState(v)',"for(const field of ['active','searchReturn'])",'function reconcileActiveState()','function studioHasFailedSource()',"retry failed source first"])if(!(studio+sync).includes(token))fail('Studio Phase 3 session resilience missing: '+token);
 if(studio.includes('DB.flags[q.uid]=MBUStudio.toggleFlag'))fail('Studio Phase 3 unflagging can reintroduce false flag entries');
 if(!studio.includes("let changed=false;if(DB.active&&DB.active.answers"))fail('Studio Phase 3 reset cleanup is not batched');
 if(studio.includes('function clearSessionAnswer('))fail('Studio Phase 3 obsolete per-answer save helper remains');
 if(studio.includes("syncCanonical('combined'"))fail('Studio Phase 3 still applies the index-based sync path to Combined ID-keyed state');
}

// Studio runtime and shared assets are build-driven, not duplicated in HTML.
{
 const page=read('equipment/exam-1/studio.html'),loader=read('equipment/assets/studio-loader.js');
 if(page.includes('const STORE=MBUStudio.STORE')||page.includes('../assets/studio-sync.js?v=')||page.includes('../assets/auto-update.js?v='))fail('Studio: inline/manual-version runtime remains');
 if(!page.includes("src:'studio-loader.js'")||!page.includes('../assets/build-bootstrap.js'))fail('Studio: build bootstrap wiring is missing');
 for(const token of ["runtime.loadStyle('site-nav.css')","runtime.loadStyle('bank1-quiz-ui.css')","runtime.loadScript('studio-sync.js')","runtime.loadScript('navigator.js')","runtime.loadScript('calculator.js')","runtime.loadScript('studio-page.js')","runtime.loadScript('auto-update.js')"])if(!loader.includes(token))fail('Studio loader missing '+token);
}

// Studio must use direct indexed image files instead of parsing image bundles.
{
 const src=read('equipment/assets/studio-page.js');
 if(src.includes('STUDIO_IMAGE_CACHE')||src.includes('meta.imageSource')||src.includes('hazards-images.json')||src.includes('bank3-images.js')||src.includes('combined-images.js'))fail('Studio: legacy image-bundle hydration remains');
 if(!src.includes('if(meta.imageBase)')||!src.includes("kind:'direct'"))fail('Studio: direct indexed image hydration is missing');
}

// Studio search should use its normalized one-time search index instead of rebuilding text per query.
{
 const src=read('equipment/assets/studio-page.js');
 if(!src.includes("searchText:(stem+' '+topic+' '+exp+' '+src).toLowerCase()"))fail('Studio: normalized questions do not preindex search text');
 if(!src.includes("for(const q of ALL){if(q.searchText.includes(x)){r.push(q);if(r.length===100)break}}"))fail('Studio: search does not stop after the visible result cap');
}

// Shared Hazards Set 3 / Challenge navigation must cancel pending auto-advance before moving.
{
 const src=read('equipment/assets/hazards-quiz-engine.js');
 if(!src.includes('function nav(i){clearTimeout(timer);timer=null;'))fail('Hazards shared quiz engine: navigator does not cancel auto-advance');
 if(!src.includes('function prev(){clearTimeout(timer);timer=null;'))fail('Hazards shared quiz engine: Previous does not cancel auto-advance');
}

// Hazards Set 3 and Challenge share one advanced engine through the Hazards loader.
{
 const loader=read('equipment/assets/hazards-page.js');
 if(!loader.includes("runtime.loadScript('hazards-quiz-engine.js')")||!loader.includes('MBUHazardsQuizEngine.startFromData'))fail('Shared advanced Hazards loader/runtime is missing');
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

// Hazards Sets 1-2 share one standard runtime through the Hazards loader.
{
 const loader=read('equipment/assets/hazards-page.js');
 if(!loader.includes("runtime.loadScript('hazards-standard-engine.js')")||!loader.includes('MBUHazardsStandardEngine.startFromData'))fail('Shared standard Hazards loader/runtime is missing');
}
const sharedHazardsEngine=read('equipment/assets/hazards-quiz-engine.js');
if(/images\s*:\s*[A-Za-z_$][\w$]*\s*\|\|/.test(sharedHazardsEngine))fail('Shared Hazards engine has invalid default expression inside object destructuring');

// Final end-to-end regression invariants for dashboards, Studio resume/reset, and bank totals.
{
 const studio=read('equipment/assets/studio-page.js'),manifest=JSON.parse(read('equipment/exam-1/banks.json')),bank1=manifest.banks.find(b=>b.id==='bank1');
 if(!bank1||bank1.sets.length*bank1.questionsPerSet!==500)fail('Bank 1: manifest total is not 500');
 const b2Payload=JSON.parse(read('equipment/exam-1/data/bank2.json'));if((b2Payload.questions||[]).length!==500)fail('Bank 2: canonical question total is not 500');
 const b3Payload=JSON.parse(read('equipment/exam-1/data/bank3.json'));if((b3Payload.questions||[]).length!==500)fail('Bank 3: canonical question total is not 500');
 for(const token of [
  'function resumeActive(){',
  'if(!DB.active||!Array.isArray(DB.active.uids)||!DB.active.uids.length)return;',
  'pos=Math.min(DB.active.pos||0,session.length-1);showQ()',
  'function studioNav(delta){clearTimeout(autoTimer);autoTimer=null;',
  'pos=n;saveActive();showQ()',
  'function resetStudioCurrent(){clearTimeout(autoTimer);autoTimer=null;',
  'delete DB.active.answers[q.uid]',
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
 const loader=read('equipment/assets/hazards-page.js');
 if(!loader.includes("runtime.loadStyle('bank1-quiz-ui.css')"))fail('Hazards loader: canonical quiz UI is not loaded');
 for(const p of ['equipment/exam-1/hazards-100.html','equipment/exam-1/hazards-bank-2.html','equipment/exam-1/hazards-bank-3.html','equipment/exam-1/hazards-harder.html'])if(!read(p).includes('mbu-bank1-ui'))fail(p+': canonical quiz UI scope class missing');
}


// JavaScript syntax is a release blocker. A page shell that renders while its inline script fails to parse is not valid.
{
 const jsAssets=['equipment/assets/supabase-config.js','equipment/assets/supabase-sync.js','equipment/assets/app-core.js','equipment/assets/build-bootstrap.js','equipment/assets/canonical-bank-page.js','equipment/assets/studio-loader.js','equipment/assets/studio-page.js','equipment/assets/hazards-page.js','equipment/assets/hazards-dashboard.js','equipment/assets/exam-dashboard.js','equipment/assets/quiz-engine.js','equipment/assets/hazards-standard-engine.js','equipment/assets/hazards-quiz-engine.js','equipment/assets/studio-sync.js','equipment/assets/site-nav.js','equipment/assets/navigator.js','equipment/assets/calculator.js','equipment/assets/auto-update.js'];
 for(const p of jsAssets){try{new vm.Script(read(p),{filename:p})}catch(e){fail(p+': JavaScript syntax error: '+e.message)}}
 for(const p of quizFiles){
  const src=read(p),re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;let m,i=0;
  while((m=re.exec(src))){const code=m[1].trim();if(!code)continue;try{new vm.Script(code,{filename:p+'#inline-'+(++i)})}catch(e){fail(p+': inline JavaScript syntax error: '+e.message)}}
 }
}

// Canonical bank session shell has one source of truth.
{
 const pages=['quiz-bank-1.html','quiz-bank-2.html','quiz-bank-3.html','combined.html'].map(p=>read('equipment/exam-1/'+p)),renderer=read('equipment/assets/canonical-bank-page.js');
 if(pages.some(src=>src.includes('<section id="quiz"')||src.includes('<section id="dashboard"')))fail('Canonical bank page duplicated the shared shell');
 if(!renderer.includes('function shell(bank)'))fail('Canonical bank renderer does not own the shared shell');
}

// Build bootstrap is the single cache-version source for all application pages.
{
 const boot=read('equipment/assets/build-bootstrap.js');
 for(const token of ["cache:'no-store'","u.searchParams.set('b',build)",'window.MBUPageReady=ready','readyGlobal','fetchJSON','jsonCache=new Map()'])if(!boot.includes(token))fail('Build bootstrap missing '+token);
}

// Shared asset/cache contract: every versioned shared asset reference uses the current release revision.
{
 const updater=read('equipment/assets/auto-update.js');
 if(!updater.includes("sessionStorage.getItem(BUILD_CACHE_KEY)"))fail('Updater: build baseline is not retained per session');
 if(!updater.includes("searchParams.get('b')"))fail('Updater: canonical runtime build id is not used as the baseline');
 if(!updater.includes('const CHECK_COOLDOWN = 120000'))fail('Updater: update polling cooldown regressed');
 const studio=read('equipment/assets/studio-page.js');
 if(!studio.includes('await Promise.all(STUDIO_SOURCES.map(source=>hydrateStudioSource(source)))'))fail('Studio: bank hydration is not parallelized');
 if(studio.includes("localStorage.getItem('mbu_bank3_progress')")||studio.includes("localStorage.getItem('MBU_BANK3_PROGRESS')"))fail('Studio: obsolete Bank 3 storage-key fallbacks remain');
}

// Phase 5: one in-page JSON request cache owns shared manifest/data reads.
{
 const boot=read('equipment/assets/build-bootstrap.js');
 if(!boot.includes('const jsonCache=new Map()')||!boot.includes('fetchJSON')||!boot.includes('jsonCache.delete(key)'))fail('Phase 5: shared JSON request cache is missing or cannot retry failures');
 for(const p of ['equipment/assets/site-nav.js','equipment/assets/canonical-bank-page.js','equipment/assets/hazards-page.js']){const src=read(p);if(!src.includes('runtime.fetchJSON('))fail('Phase 5: '+p+' bypasses the shared JSON request cache');if(src.includes("fetch(new URL('banks.json'"))fail('Phase 5: '+p+' directly refetches banks.json')}
 const studio=read('equipment/assets/studio-page.js');if(!studio.includes('MBUBuild.fetchJSON(')||studio.includes('STUDIO_SOURCE_CACHE'))fail('Phase 5: Studio does not use the central JSON request cache');
 const exam=read('equipment/exam-1/index.html'),dash=read('equipment/assets/exam-dashboard.js');if(!exam.includes("'exam-dashboard.js'")||!dash.includes('runtime.fetchJSON('))fail('Phase 5: Exam dashboard manifest rendering bypasses shared runtime');
}

// Phase 5: architecture/performance regressions must fail before browser tests run.
{
 const studio=read('equipment/assets/studio-page.js'),tests=read('tests/e2e/quiz-regression.spec.js');
 if(studio.includes('ALL.find('))fail('Phase 5: Studio reintroduced a linear UID lookup');
 if(studio.includes('ALL.filter(q=>q.uid==='))fail('Phase 5: Studio reintroduced a repeated UID scan');
 if(tests.includes('waitForTimeout('))fail('Phase 5: fixed browser sleeps are prohibited; wait on observable state instead');
 for(const p of ['equipment/exam-1/quiz-bank-1.html','equipment/exam-1/quiz-bank-2.html','equipment/exam-1/quiz-bank-3.html','equipment/exam-1/combined.html']){
  const src=read(p);
  if((src.match(/build-bootstrap\.js/g)||[]).length!==1)fail('Phase 5: '+p+' must load exactly one build bootstrap');
 }
 const boot=read('equipment/assets/build-bootstrap.js');
 if(!boot.includes("document.documentElement.dataset.mbuBoot='loading'")||!boot.includes("pointer-events:none"))fail('Phase 5: runtime readiness interaction gate is missing');
}

// Phases 6-9: shared app core, sync groundwork, accessibility, diagnostics, and documentation are release contracts.
{
 const boot=read('equipment/assets/build-bootstrap.js'),core=read('equipment/assets/app-core.js'),manifest=JSON.parse(read('equipment/exam-1/banks.json'));
 if(!boot.includes("loadStyle('app-core.css')")||!boot.includes("loadScript('app-core.js')"))fail('App core is not loaded globally by the build bootstrap');
 for(const token of ['window.MBUDiagnostics=','window.MBUSync=','window.MBUAppCore=','exportSnapshot','importSnapshot','registerAdapter','syncWith','touchStore','mbu_device_id_v1','mbu_sync_meta_v1'])if(!core.includes(token))fail('App core contract missing '+token);
 if(manifest.sync?.schema!==1||manifest.sync?.mode!=='local-first'||manifest.sync?.studioStorageKey!=='mbu_exam1_studio_v1')fail('Manifest sync contract is missing');
 for(const p of ['equipment/assets/quiz-engine.js','equipment/assets/hazards-standard-engine.js','equipment/assets/hazards-quiz-engine.js','equipment/assets/studio-sync.js'])if(!read(p).includes('touchStore'))fail(p+': save path is not sync-aware');
 const nav=read('equipment/assets/site-nav.js'),css=read('equipment/assets/app-core.css');
 if(!nav.includes('mountNav')||!core.includes('Skip to main content')||!css.includes(':focus-visible')||!css.includes('prefers-reduced-motion'))fail('Shared accessibility/tools contract is incomplete');
 for(const p of ['README.md','docs/ARCHITECTURE.md','docs/SYNC.md','CONTRIBUTING.md'])if(!exists(p))fail('Documentation missing '+p);
 if(!exists('scripts/content-integrity.mjs'))fail('Content integrity validator is missing');
}

// Final cleanup: hot quiz interactions must stay local and accessibility must be render-driven.
{
 const engine=read('equipment/assets/quiz-engine.js'),renderer=read('equipment/assets/canonical-bank-page.js'),core=read('equipment/assets/app-core.js');
 if(!engine.includes('function renderNavigator()')||!engine.includes('function toggleNavigator()'))fail('Cleanup: canonical navigator is not lazy-rendered');
 if(!engine.includes('function updateSelectionUI('))fail('Cleanup: answer selection does not have a local DOM update path');
 const choose=(engine.match(/function choose\(i\)\{[^}]+\}/)||[''])[0];
 if(choose.includes('loadQuestion()'))fail('Cleanup: answer selection still performs a full question render');
 if(!renderer.includes('onclick="toggleNavigator()"'))fail('Cleanup: canonical shell bypasses lazy navigator');
 if(core.includes('new MutationObserver('))fail('Cleanup: permanent whole-DOM accessibility observer returned');
}

// Supabase cloud sync must use only public browser credentials and authenticated RLS.
{
 const boot=read('equipment/assets/build-bootstrap.js'),cfg=read('equipment/assets/supabase-config.js'),cloud=read('equipment/assets/supabase-sync.js'),migration=read('supabase/migrations/20260927000217_create_mbu_sync_schema.sql');
 if(!boot.includes("loadScript('supabase-config.js')")||!boot.includes("loadScript('supabase-sync.js')"))fail('Supabase sync is not loaded by the shared bootstrap');
 if(!cfg.includes('sb_publishable_')||cfg.includes('sb_secret_')||cfg.includes('service_role'))fail('Supabase browser config must contain only a publishable key');
 for(const token of ['mbu_sync_state','mbu_sync_devices',"registerAdapter('supabase'",'/auth/v1/token?grant_type=password','on_conflict=user_id,store_key'])if(!cloud.includes(token))fail('Supabase adapter missing '+token);
 for(const token of ['mbu_sync_versions','mbu_sync_record_version','enable row level security','(select auth.uid())=user_id'])if(!migration.includes(token))fail('Supabase migration missing '+token);
 const all=[...quizFiles,'equipment/assets/app-core.js','equipment/assets/supabase-sync.js','equipment/assets/supabase-config.js'].map(read).join('\n');
 if(all.includes('sb_secret_'))fail('A Supabase secret key is present in browser/repository application code');
}

// Supabase email confirmation must return to the deployed app and bootstrap the browser session.
{
 const cloud=read('equipment/assets/supabase-sync.js');
 for(const token of ["APP_ROOT=new URL('../../'","/auth/v1/signup?redirect_to=",'consumeAuthRedirect','access_token','refresh_token',"history.replaceState(null,'',location.pathname+location.search)"])if(!cloud.includes(token))fail('Supabase confirmation flow missing '+token);
}

if(failures.length){console.error('\nVALIDATION FAILED\n- '+failures.join('\n- '));process.exit(1)}
console.log('Repository validation passed: Banks 1-3 are 500 questions each; Combined is 150 questions; local assets, Studio sources, shared quiz runtimes, answer indexes, and build manifest are valid.');
