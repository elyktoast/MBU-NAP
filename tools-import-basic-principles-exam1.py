from pathlib import Path
import re,json,base64,hashlib,mimetypes
src=Path('/mnt/data/bp1-src'); out=Path('/mnt/data/bp1-import'); out.mkdir(exist_ok=True)
sets=[
('basic-airway','Basic Airway Assessment & Management','Basic_Airway'),
('monitoring','Intraoperative Monitoring & Data Interpretation','Monitoring'),
('preop-assessment','Perioperative Assessment & Evaluation','PreOp_Assessment'),
('phases-ga','Phases of General Anesthesia','Phases_of_GA'),
('sedation-mac-tiva','Sedation, MAC & TIVA','Sedation_MAC_TIVA'),
('perioperative-pain','Perioperative Pain Management','Perioperative_Pain_Management'),
('misc-na-practice','Miscellaneous Topics in Nurse Anesthesia Practice','Misc_Topics_in_NA_Practice')]
summary=[]; all_ids=set(); errors=[]
for slug,label,base in sets:
 qtxt=(src/f'{base}_Questions.html').read_text(errors='replace')
 m=re.search(r'const\s+BANK\s*=\s*(\[.*?\]);\s*\n',qtxt,re.S)
 if not m: raise SystemExit(f'BANK not found {base}')
 qs=json.loads(m.group(1)); qout=[]
 itxt=(src/f'{base}_Images.html').read_text(errors='replace')
 # capture each figure block until next figure or closing wrap; get first media image
 blocks=re.split(r'(?=<section class="fig" id="fig-\d+")',itxt)
 figs={}
 fdir=out/'figures'/slug; fdir.mkdir(parents=True,exist_ok=True)
 for block in blocks:
  fm=re.match(r'<section class="fig" id="fig-(\d+)"',block)
  if not fm: continue
  n=int(fm.group(1)); titlem=re.search(r'<h2>(.*?)</h2>',block,re.S); title=re.sub('<.*?>','',titlem.group(1)).strip() if titlem else f'Figure {n}'
  dm=re.search(r'<img\s+src="data:([^;]+);base64,([^"]+)"',block,re.S)
  if dm:
   mime,b64=dm.groups(); ext={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif"}.get(mime,'bin')
   data=base64.b64decode(b64); fp=fdir/f'fig-{n}.{ext}'; fp.write_bytes(data)
   figs[n]={'path':f'figures/{slug}/{fp.name}','title':title,'sha256':hashlib.sha256(data).hexdigest(),'mime':mime}
  else:
   # preserve inline SVG if present in media
   sm=re.search(r'<div class="media">\s*(<svg.*?</svg>)',block,re.S)
   if sm:
    fp=fdir/f'fig-{n}.svg'; fp.write_text(sm.group(1)); data=fp.read_bytes(); figs[n]={'path':f'figures/{slug}/{fp.name}','title':title,'sha256':hashlib.sha256(data).hexdigest(),'mime':'image/svg+xml'}
 for i,q in enumerate(qs,1):
  oid=str(q.get('id') or f'{slug}-{i:03d}'); uid=f'bp1-{slug}-{oid.lower()}'
  if uid in all_ids: errors.append(f'duplicate uid {uid}')
  all_ids.add(uid)
  opts=q.get('o',[]); ans=q.get('a',[])
  if not opts or not ans or any(not isinstance(a,int) or a<0 or a>=len(opts) for a in ans): errors.append(f'bad answer {uid}')
  f=q.get('f'); image=None
  if f is not None:
   if int(f) not in figs: errors.append(f'missing figure {uid}: {f}')
   else: image={'kind':'direct','url':figs[int(f)]['path'],'id':int(f),'title':figs[int(f)]['title']}
  qout.append({'id':oid,'set':1,'type':'multi' if len(ans)>1 else 'single','stem':q.get('q',''),'options':opts,'answer':ans,'explanation':q.get('e',''),'citation':q.get('c') or q.get('src') or '', 'topic':q.get('t') or 'Other','sourceTitle':label,'image':image,'sourceMeta':{'sourcePackage':base,'originalFigure':f}})
 payload={'schema':1,'id':slug,'title':label,'count':len(qout),'questions':qout}
 (out/f'{slug}.json').write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')))
 summary.append({'slug':slug,'label':label,'questions':len(qout),'figures':len(figs),'figureRefs':sum(1 for q in qs if q.get('f') is not None),'subtopics':len(set(q.get('t') or 'Other' for q in qs))})
manifest={'schema':3,'course':{'id':'basic-principles','label':'Basic Principles'},'exam':{'id':'exam-1','label':'Exam 1'},'canonicalBank':'bp1','banks':[{'id':'bp1','label':'Basic Principles Exam 1','count':sum(x['questions'] for x in summary)}],'studioSources':[{'key':x['slug'],'label':x['label'],'groupLabel':'Basic Principles Exam 1','data':f'data/{x["slug"]}.json','format':'canonical','sets':[1],'setLabels':{'1':x['label']},'count':x['questions']} for x in summary], 'sync':{'schema':1,'mode':'local-first','studioStorageKey':'mbu_studio_basic-principles_exam-1_v1','metadataKey':'mbu_sync_meta_v1','deviceKey':'mbu_device_id_v1','adapterApi':'MBUSync.registerAdapter(name, adapter)'},'features':{'questionGenerator':{'enabled':False,'status':'unconfigured','storageKey':'mbu_generated_questions_basic-principles_exam-1_v1','provider':None}},'contentTaxonomy':{'topics':[x['label'] for x in summary],'sourceTitles':[x['label'] for x in summary]},'sessionEnvironment':'basic-principles-exam1-v1','defaultBankEngine':'canonical','bankPage':'bank.html','uidNamespace':'bp1'}
(out/'banks.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
report={'totalQuestions':sum(x['questions'] for x in summary),'uniqueUIDs':len(all_ids),'topics':summary,'errors':errors}
(out/'validation-report.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
if errors or report['totalQuestions']!=3500 or len(all_ids)!=3500: raise SystemExit(1)
