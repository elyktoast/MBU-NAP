(function(){
 const defs=[
  ['SRNA_HAZARDS_BANK_1_2026_V2','hazards-100.html?review=1','array'],
  ['SRNA_HAZARDS_BANK_2_2026_V1','hazards-bank-2.html?review=1','array'],
  ['hazards_practice3_progress_2026_V2','hazards-bank-3.html?review=1','answers'],
  ['hazards_harder_progress_2026_V1','hazards-harder.html?review=1','answers']
 ];
 let total=0,doneTotal=0;
 defs.forEach(([key,url,type])=>{
   let n=0,done=0,correct=0;try{const d=JSON.parse(localStorage.getItem(key)||'null');if(d){if(type==='array'){const graded=d.graded||{},ok=d.correct||{};done=Object.keys(graded).filter(k=>graded[k]===true).length;correct=Object.keys(graded).filter(k=>graded[k]===true&&ok[k]===true).length;n=Array.isArray(d.missed)?d.missed.length:Math.max(0,done-correct)}else{const ans=d.ans||{};done=Object.keys(ans).length;correct=Object.values(ans).filter(x=>x&&x.ok).length;n=Object.values(ans).filter(x=>x&&!x.ok).length}}}catch(e){}
   total+=n;doneTotal+=done;
   const ix=defs.findIndex(x=>x[0]===key), ids=[['hazSet1Stats','hazSet1Bar',100,'hazSet1Review','hazSet1Start','Practice Set 1'],['hazSet2Stats','hazSet2Bar',100,'hazSet2Review','hazSet2Start','Practice Set 2'],['hazSet3Stats','hazSet3Bar',100,'hazSet3Review','hazSet3Start','Practice Set 3'],['hazChallengeStats','hazChallengeBar',50,'hazChallengeReview','hazChallengeStart','Challenge Set']][ix];if(ids){const s=document.getElementById(ids[0]),b=document.getElementById(ids[1]),r=document.getElementById(ids[3]);if(s)s.textContent=ids[2]+' questions · '+done+'/'+ids[2]+' completed · '+(done?Math.round(100*correct/done):0)+'% score · '+n+' missed';if(b)b.style.width=Math.min(100,done/ids[2]*100)+'%';const start=document.getElementById(ids[4]);if(start)start.textContent=(done?'Continue ':'Start ')+ids[5];if(r&&!n){r.removeAttribute('href');r.setAttribute('aria-disabled','true');r.style.pointerEvents='none';r.style.opacity='.55'}}
 });
 const ov=document.getElementById('hazOverall');if(ov)ov.textContent=doneTotal+' / 350 completed';
 const label=total+' question'+(total===1?'':'s')+' currently in the missed bank';
 document.getElementById('hazMissedTotal').textContent=label;
 const bar=document.getElementById('hazMissedBar');bar.style.width=total?Math.min(100,total/350*100)+'%':'0%';
 const btn=document.getElementById('hazMissedReviewBtn');if(total){btn.href='studio.html?mode=hazards-missed&return=hazards';btn.removeAttribute('aria-disabled');btn.style.pointerEvents='';btn.style.opacity='';}

})();
