import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd(),errors=[],warnings=[];
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const norm=s=>String(s??'').trim().replace(/\s+/g,' ').toLowerCase();
const err=m=>errors.push(m),warn=m=>warnings.push(m);
const manifest=read('equipment/exam-1/banks.json'),baseline=read('scripts/content-integrity-baseline.json');

const sources=[
  ['Quiz Bank 1','equipment/exam-1/data/bank1.json'],
  ['Quiz Bank 2','equipment/exam-1/data/bank2.json'],
  ['Quiz Bank 3','equipment/exam-1/data/bank3.json'],
  ['Combined','equipment/exam-1/data/combined.json'],
  ['Workstation Hazards','equipment/exam-1/data/hazards.json']
];

function keyedText(q,indexes){
  const opts=Array.isArray(q.options??q.c)?(q.options??q.c):[];
  return indexes.map(i=>norm(opts[i])).filter(Boolean).sort();
}

for(const [label,file] of sources){
  const payload=read(file),qs=Array.isArray(payload)?payload:(payload.questions||[]),name=path.basename(file);
  const seenStemBySet=new Map(),seenId=new Set(),knownDupes=new Set(baseline.knownDuplicateStems?.[name]||[]),seenKnownDupes=new Set();
  let missingCitation=0,missingTopic=0,missingExplanation=0;

  for(let i=0;i<qs.length;i++){
    const q=qs[i]||{},id=String(q.id??i+1),set=Number(q.set??q.setn??1),stem=String(q.stem??q.q??'').trim(),opts=q.options??q.c;
    const ans0=q.answer??q.correct??q.a,ans=Array.isArray(ans0)?ans0:[ans0],identity=set+'::'+id;

    if(seenId.has(identity))err(label+': duplicate id '+identity);
    seenId.add(identity);
    if(!stem)err(label+': '+identity+' has no stem');

    const sk=set+'::'+norm(stem);
    if(stem&&seenStemBySet.has(sk)){
      const first=seenStemBySet.get(sk),message=label+': duplicate stem in set '+set+' ('+first.id+' and '+id+')';
      if(knownDupes.has(identity)){
        seenKnownDupes.add(identity);
        const firstIndexes=(Array.isArray(first.question.answer??first.question.correct??first.question.a)?(first.question.answer??first.question.correct??first.question.a):[first.question.answer??first.question.correct??first.question.a]).map(Number);
        const thisIndexes=ans.map(Number);
        if(JSON.stringify(keyedText(first.question,firstIndexes))!==JSON.stringify(keyedText(q,thisIndexes)))warn(message+' has different keyed answer wording');
      }else err(message+' is not in the approved duplicate baseline');
    }else if(stem)seenStemBySet.set(sk,{id,question:q});

    if(!Array.isArray(opts)||opts.length<2){err(label+': '+identity+' has fewer than 2 options');continue}
    const optNorm=opts.map(norm);
    if(optNorm.some(x=>!x))err(label+': '+identity+' has a blank option');
    if(new Set(optNorm).size!==optNorm.length)err(label+': '+identity+' has duplicate answer choices');

    const indexes=ans.map(Number);
    if(!indexes.length||indexes.some(x=>!Number.isInteger(x)||x<0||x>=opts.length))err(label+': '+identity+' has invalid answer indexes');
    if(new Set(indexes).size!==indexes.length)err(label+': '+identity+' repeats an answer index');
    if(!['single','multi'].includes(q.type))err(label+': '+identity+' has invalid question type '+String(q.type));
    if(q.type==='single'&&indexes.length!==1)err(label+': '+identity+' is single-answer but keys '+indexes.length+' answers');
    if(q.type==='multi'&&indexes.length<2)err(label+': '+identity+' is multi-answer but keys fewer than 2 answers');

    const citation=q.citation??q.src??q.ref;
    if(citation==null||String(Array.isArray(citation)?citation.join(' '):citation).trim()==='')missingCitation++;
    const topic=String(q.topic??q.lec??q.concept??'').trim();
    if(!topic)missingTopic++;
    else if(!['Monitoring','Medical Gas','CO₂ & Scavenging','Airway','Hazards & Safety'].includes(topic))err(label+': '+identity+' has non-canonical topic '+topic);
    const citationText=String(Array.isArray(citation)?citation.join('; '):citation||'');
    if(citationText&&(/\.pdf\b/i.test(citationText)||/,\s*Slides?\b/i.test(citationText)||/:\s*slides?\b/i.test(citationText)))err(label+': '+identity+' has legacy citation formatting');
    if(!String(q.explanation??q.exp??q.rationale??'').trim())missingExplanation++;

    for(const imageKey of [q.imageId,q.image]){
      if(typeof imageKey==='string'&&imageKey&&!imageKey.startsWith('data:')&&!imageKey.trim().startsWith('<')&&!/^[A-Za-z0-9_-]+$/.test(imageKey))err(label+': '+identity+' has unsafe image id '+imageKey);
    }
  }

  for(const identity of knownDupes)if(!seenKnownDupes.has(identity))warn(label+': duplicate baseline entry '+identity+' is no longer duplicated and can be removed');
  if(missingCitation)err(label+': '+missingCitation+' questions have no citation/source text');
  if(missingExplanation)err(label+': '+missingExplanation+' questions have no explanation/rationale');

  const allowedMissingTopics=Number(baseline.allowedMissingTopics?.[name]??0);
  if(missingTopic>allowedMissingTopics)err(label+': '+missingTopic+' questions have no explicit topic; baseline allows '+allowedMissingTopics);
  else if(missingTopic)warn(label+': '+missingTopic+' questions have no explicit topic (known baseline: '+allowedMissingTopics+')');
}

for(const bank of manifest.banks||[]){
  if(!bank.data||bank.id==='hazards')continue;
  const payload=read('equipment/exam-1/'+bank.data),qs=Array.isArray(payload)?payload:(payload.questions||[]);
  if(bank.questionsPerSet)for(const set of bank.sets||[]){
    const count=qs.filter(q=>Number(q.set)===Number(set)).length;
    if(count!==bank.questionsPerSet)err(bank.id+': set '+set+' count '+count+' != '+bank.questionsPerSet);
  }
}

const hazards=read('equipment/exam-1/data/hazards.json'),hqs=Array.isArray(hazards)?hazards:(hazards.questions||[]);
for(const [set,count] of Object.entries(manifest.banks.find(b=>b.id==='hazards')?.setCounts||{})){
  const actual=hqs.filter(q=>Number(q.set)===Number(set)).length;
  if(actual!==Number(count))err('hazards: set '+set+' count '+actual+' != '+count);
}

for(const w of warnings)console.warn('CONTENT WARNING: '+w);
if(errors.length){
  console.error('\nCONTENT INTEGRITY FAILED\n- '+errors.join('\n- '));
  process.exit(1);
}
console.log('Content integrity passed across '+sources.length+' canonical question sources. Warnings: '+warnings.length+'.');
