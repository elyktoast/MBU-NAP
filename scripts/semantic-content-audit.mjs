import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),failures=[],warnings=[];
const files=['bank1.json','bank2.json','bank3.json','combined.json','hazards.json'];
const stop=new Set('a an the and or of to in on for with by is are was were be been being which what when where how why from as at that this these those patient patients anesthesia anesthetic'.split(' '));
const norm=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const tokens=s=>new Set(norm(s).split(' ').filter(x=>x.length>2&&!stop.has(x)));
const keyed=q=>{const opts=q.options??q.c??[],raw=q.answer??q.correct??q.a??[],ans=(Array.isArray(raw)?raw:[raw]).map(Number).filter(Number.isInteger);return ans.map(i=>norm(opts[i]||'')).filter(Boolean).sort()};
const rows=[];
for(const file of files){
 const p=JSON.parse(fs.readFileSync(path.join(root,'equipment/exam-1/data',file),'utf8')),qs=Array.isArray(p)?p:(p.questions||[]);
 for(const q of qs){const opts=(q.options??q.c??[]).map(norm);rows.push({file,id:String(q.id??''),set:Number(q.set??1),stem:String(q.stem??q.q??''),norm:norm(q.stem??q.q??''),key:keyed(q),optionSig:JSON.stringify([...opts].sort()),tokens:tokens(q.stem??q.q??'')})}
}
const exact=new Map();
for(const r of rows){if(!r.norm)continue;if(!exact.has(r.norm))exact.set(r.norm,[]);exact.get(r.norm).push(r)}
let exactGroups=0,crossSetExact=0;
for(const group of exact.values()){
 if(group.length<2)continue;exactGroups++;
 if(new Set(group.map(x=>x.file+'::'+x.set)).size>1)crossSetExact++;
 const byOptions=new Map();
 for(const item of group){if(!byOptions.has(item.optionSig))byOptions.set(item.optionSig,[]);byOptions.get(item.optionSig).push(item)}
 for(const sameOptions of byOptions.values()){
  if(sameOptions.length<2)continue;
  const keyForms=new Set(sameOptions.map(x=>JSON.stringify(x.key)));
  if(keyForms.size>1)failures.push('Same stem and same answer choices have conflicting keyed answers: '+sameOptions.map(x=>x.file+' '+x.set+'::'+x.id).join(', '));
 }
 if(byOptions.size>1&&new Set(group.map(x=>JSON.stringify(x.key))).size>1)warnings.push('Exact stem is reused with different option pools/key wording: '+group.map(x=>x.file+' '+x.set+'::'+x.id).join(', '));
}
const buckets=new Map();
for(const r of rows){
 const sig=[...r.tokens].sort().slice(0,5).join('|');if(!sig)continue;
 if(!buckets.has(sig))buckets.set(sig,[]);buckets.get(sig).push(r)
}
const seen=new Set();let nearPairs=0;
for(const group of buckets.values()){
 if(group.length>80)continue;
 for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++){
  const a=group[i],b=group[j],pair=[a.file,a.set,a.id,b.file,b.set,b.id].join('|');if(seen.has(pair))continue;seen.add(pair);
  const union=new Set([...a.tokens,...b.tokens]),inter=[...a.tokens].filter(x=>b.tokens.has(x)).length,sim=union.size?inter/union.size:0;
  if(sim<0.9||a.norm===b.norm)continue;nearPairs++;
  if(JSON.stringify(a.key)!==JSON.stringify(b.key))warnings.push('Near-duplicate stems use different keyed wording ('+sim.toFixed(2)+'): '+a.file+' '+a.set+'::'+a.id+' vs '+b.file+' '+b.set+'::'+b.id);
 }
}
const hazards=rows.filter(r=>r.file==='hazards.json'),hazSet2=hazards.filter(r=>r.set===2),uniqueHaz2=new Set(hazSet2.map(r=>r.norm)).size;
if(hazSet2.length===100&&uniqueHaz2<50)warnings.push('Hazards Set 2 contains only '+uniqueHaz2+' unique normalized stems across 100 questions; this is documented source-content debt.');
for(const w of warnings.slice(0,50))console.warn('SEMANTIC WARNING: '+w);
if(failures.length){console.error('\nSEMANTIC CONTENT AUDIT FAILED\n- '+failures.join('\n- '));process.exit(1)}
console.log('Semantic content audit passed across '+rows.length+' questions: '+exactGroups+' exact duplicate groups, '+crossSetExact+' cross-set exact groups, '+nearPairs+' near-duplicate pairs, '+warnings.length+' warnings, no conflicting exact-answer keys.');
