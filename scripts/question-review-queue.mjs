import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),files=['bank1.json','bank2.json','bank3.json','combined.json','hazards.json'];
const stop=new Set('a an the and or of to in on for with by is are was were be been being which what when where how why from as at that this these those patient patients anesthesia anesthetic'.split(' '));
const norm=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const tokens=s=>new Set(norm(s).split(' ').filter(x=>x.length>2&&!stop.has(x)));
const selectCount=s=>{const m=String(s??'').match(/(?:select|choose)\s+(\d+)/i);return m?Number(m[1]):null};
const sameSet=(a,b)=>a.size===b.size&&[...a].every(x=>b.has(x));
const uidOf=(file,q)=>{const id=String(q.id??'');if(file==='bank1.json')return'b1-'+id;if(file==='bank2.json')return'b2-'+id;if(file==='bank3.json')return'b3-'+id;if(file==='combined.json')return'combined-'+id;const set=Number(q.set??1);return(set===4?'hh':'h'+set)+'-'+id};
const rows=[];
for(const file of files){const p=JSON.parse(fs.readFileSync(path.join(root,'equipment/exam-1/data',file),'utf8')),qs=Array.isArray(p)?p:(p.questions||[]);for(const q of qs){const opts=(q.options??q.c??[]).map(String),raw=q.answer??q.correct??q.a??[],ans=(Array.isArray(raw)?raw:[raw]).map(Number).filter(Number.isInteger),stem=String(q.stem??q.q??''),ex=String(q.explanation??q.exp??q.rationale??'').trim();rows.push({file,set:Number(q.set??1),id:String(q.id??''),uid:uidOf(file,q),stem,norm:norm(stem),tokens:tokens(stem),selectCount:selectCount(stem),key:ans.map(i=>norm(opts[i]||'')).filter(Boolean).sort(),optionSig:JSON.stringify(opts.map(norm).sort()),explanationWords:ex?ex.split(/\s+/).length:0,source:String(q.sourceTitle||q.sourceMeta?.families?.[0]||q.citation||'').trim(),locator:String(q.sourceLocator||'').trim()})}}
const candidates=[],exact=new Map();
for(const r of rows){if(!r.norm)continue;if(!exact.has(r.norm))exact.set(r.norm,[]);exact.get(r.norm).push(r)}
let sameSetExactGroups=0,crossBankExactGroups=0;
for(const g of exact.values()){if(g.length<2)continue;const fileSets=new Set(g.map(x=>x.file+'::'+x.set)),banks=new Set(g.map(x=>x.file));if(fileSets.size===1)sameSetExactGroups++;if(banks.size>1)crossBankExactGroups++;const optionSigs=new Set(g.map(x=>x.optionSig)),keys=new Set(g.map(x=>JSON.stringify(x.key)));if(optionSigs.size>1&&keys.size>1){const semanticKeys=g.map(x=>new Set(x.key));const equivalent=semanticKeys.every(x=>sameSet(x,semanticKeys[0]));if(!equivalent)candidates.push({type:'exact_stem_variant',severity:'manual_review',stem:g[0].stem,questions:g.map(x=>x.uid).sort()})}}
const buckets=new Map();
for(const r of rows){const sig=[...r.tokens].sort().slice(0,5).join('|');if(!sig)continue;if(!buckets.has(sig))buckets.set(sig,[]);buckets.get(sig).push(r)}
const seen=new Set();
for(const g of buckets.values()){if(g.length>80)continue;for(let i=0;i<g.length;i++)for(let j=i+1;j<g.length;j++){const a=g[i],b=g[j],pair=[a.file,a.set,a.id,b.file,b.set,b.id].join('|');if(seen.has(pair))continue;seen.add(pair);const union=new Set([...a.tokens,...b.tokens]),inter=[...a.tokens].filter(x=>b.tokens.has(x)).length,sim=union.size?inter/union.size:0;if(sim<.9||a.norm===b.norm||JSON.stringify(a.key)===JSON.stringify(b.key))continue;if(a.selectCount!==null&&b.selectCount!==null&&a.selectCount!==b.selectCount)continue;candidates.push({type:'near_duplicate_key_variation',severity:'manual_review',similarity:Number(sim.toFixed(2)),questions:[a.uid,b.uid].sort(),stems:[a.stem,b.stem]})}}
candidates.sort((a,b)=>a.type.localeCompare(b.type)||JSON.stringify(a.questions).localeCompare(JSON.stringify(b.questions)));
const report={schema:1,totalQuestions:rows.length,summary:{sameSetExactGroups,crossBankExactGroups,missingSourceTitle:rows.filter(x=>!x.source).length,missingSourceLocator:rows.filter(x=>!x.locator).length,explanationsUnder8Words:rows.filter(x=>x.explanationWords<8).length,manualReviewCandidates:candidates.length},candidates};
const output=JSON.stringify(report,null,2)+'\n',reportPath=path.join(root,'reports/question-content-review.json');
if(process.argv.includes('--write')){fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,output)}
if(process.argv.includes('--check')){const current=fs.existsSync(reportPath)?fs.readFileSync(reportPath,'utf8'):'';if(current!==output){console.error('Question content review queue is stale. Run npm run review:questions:write.');process.exit(1)}}
console.log('Phase 3 content review queue: '+candidates.length+' manual-review candidates; '+sameSetExactGroups+' same-set exact duplicate groups; '+crossBankExactGroups+' cross-bank exact duplicate groups; '+report.summary.missingSourceTitle+' missing source titles; '+report.summary.missingSourceLocator+' missing source locators; '+report.summary.explanationsUnder8Words+' explanations under 8 words.');
