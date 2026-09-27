import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd();
const dataDir=path.join(root,'equipment/exam-1/data');
const answerOrderContext={};vm.createContext(answerOrderContext);vm.runInContext(fs.readFileSync(path.join(root,'equipment/assets/answer-order.js'),'utf8'),answerOrderContext);const displayOrder=answerOrderContext.MBUAnswerOrder;
const files=['bank1.json','bank2.json','bank3.json','combined.json','hazards.json'];
const norm=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const pct=(n,d)=>d?Math.round(n*1000/d)/10:0;
const median=a=>{if(!a.length)return 0;const x=[...a].sort((m,n)=>m-n),i=Math.floor(x.length/2);return x.length%2?x[i]:(x[i-1]+x[i])/2};
const inc=(obj,key,n=1)=>obj[key]=(obj[key]||0)+n;
const sourceTitle=q=>String(q.sourceTitle||q.sourceMeta?.families?.[0]||q.citation||'Unknown').trim()||'Unknown';
const topicOf=q=>String(q.topic||'Unknown').trim()||'Unknown';
const answerOf=q=>{const raw=q.answer??q.correct??q.a??[];return (Array.isArray(raw)?raw:[raw]).map(Number).filter(Number.isInteger)};
const optionsOf=q=>Array.isArray(q.options)?q.options:(Array.isArray(q.c)?q.c:[]);
const explanationOf=q=>String(q.explanation??q.exp??q.rationale??'').trim();

const all=[];
for(const file of files){
  const payload=JSON.parse(fs.readFileSync(path.join(dataDir,file),'utf8'));
  const questions=Array.isArray(payload)?payload:(payload.questions||[]);
  for(const q of questions){
    const answers=answerOf(q),options=optionsOf(q),explanation=explanationOf(q);
    all.push({
      file,
      bank:file.replace('.json',''),
      id:String(q.id??''),
      set:Number(q.set??1),
      type:q.type==='multi'||answers.length>1?'multi':'single',
      stem:String(q.stem??q.q??''),
      normStem:norm(q.stem??q.q??''),
      topic:topicOf(q),
      source:sourceTitle(q),
      sourceLocator:String(q.sourceLocator||'').trim(),
      answers,
      optionCount:options.length,
      explanationWords:explanation?explanation.split(/\s+/).length:0,
      uid:file==='bank1.json'?'b1-'+String(q.id??''):file==='bank2.json'?'b2-'+String(q.id??''):file==='bank3.json'?'b3-'+String(q.id??''):file==='combined.json'?'combined-'+String(q.id??''):(Number(q.set)===4?'hh':'h'+Number(q.set))+'-'+String(q.id??''),
      hasImage:!!(q.imageSvg||q.image||q.img||q.imageId||q.image_id)
    });
  }
}

const exactGroups=new Map();
for(const q of all){
  if(!q.normStem)continue;
  if(!exactGroups.has(q.normStem))exactGroups.set(q.normStem,[]);
  exactGroups.get(q.normStem).push(q);
}
const exact=[...exactGroups.values()].filter(g=>g.length>1);
const crossBankExact=exact.filter(g=>new Set(g.map(q=>q.bank)).size>1);

function summarize(rows){
  const topics={},sources={},types={},sets={},optionCounts={},answerPositions={},displayAnswerPositions={};
  let images=0,missingSourceTitle=0,missingLocator=0,shortExplanations=0;
  const expWords=[];
  for(const q of rows){
    inc(topics,q.topic);inc(sources,q.source);inc(types,q.type);inc(sets,String(q.set));inc(optionCounts,String(q.optionCount));
    if(q.hasImage)images++;
    if(q.source==='Unknown')missingSourceTitle++;
    if(!q.sourceLocator)missingLocator++;
    if(q.explanationWords<12)shortExplanations++;
    expWords.push(q.explanationWords);
    if(q.type==='single'&&q.answers.length===1){inc(answerPositions,String(q.answers[0]));const ordering=displayOrder.order(q.uid,q.optionCount,q.answers),display=displayOrder.displayIndex(ordering,q.answers[0]);inc(displayAnswerPositions,String(display))}
  }
  const singles=types.single||0;
  const answerPositionPercent=Object.fromEntries(Object.entries(answerPositions).map(([k,v])=>[k,pct(v,singles)]));
  const displayAnswerPositionPercent=Object.fromEntries(Object.entries(displayAnswerPositions).map(([k,v])=>[k,pct(v,singles)]));
  return{
    count:rows.length,
    sets,
    types,
    topics,
    sources,
    optionCounts,
    images,
    imagePercent:pct(images,rows.length),
    sourceMetadata:{missingSourceTitle,missingLocator},
    explanationWords:{average:rows.length?Math.round(expWords.reduce((a,b)=>a+b,0)/rows.length*10)/10:0,median:median(expWords),under12:shortExplanations},
    singleAnswerPositions:{counts:answerPositions,percent:answerPositionPercent},
    displayedSingleAnswerPositions:{counts:displayAnswerPositions,percent:displayAnswerPositionPercent}
  };
}

const byBank={};
for(const bank of [...new Set(all.map(q=>q.bank))])byBank[bank]=summarize(all.filter(q=>q.bank===bank));

const report={
  generatedAt:new Date().toISOString(),
  totalQuestions:all.length,
  overall:summarize(all),
  banks:byBank,
  duplication:{
    exactStemGroups:exact.length,
    exactStemQuestionCount:exact.reduce((n,g)=>n+g.length,0),
    crossBankExactGroups:crossBankExact.length,
    largestGroups:exact.sort((a,b)=>b.length-a.length).slice(0,20).map(g=>({count:g.length,stem:g[0].stem,questions:g.map(q=>q.bank+':'+q.set+':'+q.id)}))
  }
};

console.log('Phase 2 question-bank analysis');
console.log('Total questions:',report.totalQuestions);
for(const [bank,s] of Object.entries(report.banks)){
  console.log('\n'+bank+': '+s.count+' questions');
  console.log('  types:',JSON.stringify(s.types));
  console.log('  topics:',JSON.stringify(s.topics));
  console.log('  source answer positions (%):',JSON.stringify(s.singleAnswerPositions.percent));
  console.log('  displayed answer positions (%):',JSON.stringify(s.displayedSingleAnswerPositions.percent));
  console.log('  images:',s.images+' ('+s.imagePercent+'%)');
  console.log('  explanation words avg/median:',s.explanationWords.average+'/'+s.explanationWords.median);
  console.log('  missing source title/locator:',s.sourceMetadata.missingSourceTitle+'/'+s.sourceMetadata.missingLocator);
}
console.log('\nExact duplicate stem groups:',report.duplication.exactStemGroups,'Cross-bank:',report.duplication.crossBankExactGroups);

if(process.argv.includes('--json'))console.log('\nJSON_REPORT_START\n'+JSON.stringify(report,null,2)+'\nJSON_REPORT_END');
