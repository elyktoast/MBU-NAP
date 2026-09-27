/* Stable display ordering for answer choices.
   Canonical option indexes remain unchanged in persistence, grading, reports, and source data. */
(()=>{'use strict';
const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function hash(text){let h=2166136261;for(const ch of String(text||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function shuffle(items,seed){const out=[...items];let x=seed||1;for(let i=out.length-1;i>0;i--){x^=x<<13;x^=x>>>17;x^=x<<5;const j=(x>>>0)%(i+1);[out[i],out[j]]=[out[j],out[i]]}return out}
function order(key,count,answers=[]){
 const n=Math.max(0,Number(count)||0),base=Array.from({length:n},(_,i)=>i);
 if(n<2)return base;
 const ans=(Array.isArray(answers)?answers:[answers]).map(Number).filter(i=>Number.isInteger(i)&&i>=0&&i<n);
 if(ans.length===1){
  const correct=ans[0],wrong=shuffle(base.filter(i=>i!==correct),hash(String(key)+'|wrong')),target=hash(String(key)+'|position')%n;
  wrong.splice(target,0,correct);return wrong
 }
 return shuffle(base,hash(String(key)+'|all'))
}
function displayIndex(ordering,canonicalIndex){const i=Array.isArray(ordering)?ordering.indexOf(Number(canonicalIndex)):-1;return i>=0?i:Number(canonicalIndex)}
function letter(ordering,canonicalIndex){const i=displayIndex(ordering,canonicalIndex);return letters[i]||String(i+1)}
globalThis.MBUAnswerOrder={hash,order,displayIndex,letter};
})();
