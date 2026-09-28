/* Adaptive Mode 2.0: CAT-style challenge matching plus personal mastery/review priority. */
(()=>{'use strict';
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const clampLevel=v=>clamp(Number(v)||3,1,5);
const clampLogit=v=>clamp(Number(v)||0,-2.5,2.5);
const challengeToLogit=challenge=>clampLogit((clampLevel(challenge)-3)*1.25);
const logitToLevel=logit=>clampLevel(Math.round(3+clampLogit(logit)/1.25));
const logistic=x=>1/(1+Math.exp(-clamp(x,-12,12)));
const popWeight=n=>n<25?0:n<100?.35:n<300?.6:.8;
function tieRank(uid){let h=2166136261;for(const c of String(uid||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function topicOf(q){return String(q?.topic||q?.lec||q?.concept||'Other').trim()||'Other'}
function contentKey(q){const stem=String(q?.stem||q?.q||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();return stem||('uid:'+String(q?.uid||q?.id||''))}
function questionStats(uid){return window.MBUStudyIntelligence?.questionStats?.(uid)||null}
function populationStats(uid){return window.MBUSupabase?.calibration?.(uid)||null}
function masterySnapshot(){return window.MBUStudyIntelligence?.mastery?.()||{byTopic:{}}}
function learningPriority(q,snapshot){return window.MBUStudyIntelligence?.priorityForQuestion?.(q,Date.now(),snapshot)||{score:0,reason:'Balanced practice',topic:topicOf(q),mastery:null,confidence:0,due:false,seen:!!questionStats(q?.uid)}}
function recentUids(limit=50){return new Set((window.MBUStudyIntelligence?.recentActivity?.(limit)||[]).map(x=>String(x.uid||'')))}
function recentContentKeys(questions,limit=50){
  const recent=recentUids(limit),keys=new Set(),byUid=new Map((questions||[]).filter(q=>q?.uid).map(q=>[String(q.uid),q]));
  for(const uid of recent){const saved=questionStats(uid),q=byUid.get(uid);if(saved?.stem)keys.add(contentKey({stem:saved.stem,uid}));else if(q)keys.add(contentKey(q))}
  return keys
}
function challenge(q){
  const multi=(Array.isArray(q?.ans)?q.ans:Array.isArray(q?.answer)?q.answer:[]).length>1;
  let score=3+(multi?.65:0)+((q?.bank==='hh'||Number(q?.set)===7)?.7:0);
  const pop=populationStats(q?.uid),learners=Number(pop?.unique_learners)||0,weight=popWeight(learners);
  if(weight&&Number.isFinite(Number(pop?.difficulty_logit))){
    const populationScore=clampLevel(3+clampLogit(pop.difficulty_logit)/1.25);score=score*(1-weight)+populationScore*weight
  }
  return Math.round(clampLevel(score)*100)/100
}
function estimateAbility(path=[]){
  const rows=Array.isArray(path)?path.filter(x=>plain(x)&&Number.isFinite(Number(x.difficulty))):[];
  let theta=0;const priorVar=2.25;
  for(let iter=0;iter<6;iter++){
    let gradient=-theta/priorVar,information=1/priorVar;
    for(const row of rows){const b=clampLogit(row.difficulty),p=logistic(theta-b);gradient+=(row.ok?1:0)-p;information+=p*(1-p)}
    const step=gradient/Math.max(.15,information);theta=clampLogit(theta+clamp(step,-1,1));if(Math.abs(step)<.001)break
  }
  let information=1/priorVar;
  for(const row of rows){const p=logistic(theta-clampLogit(row.difficulty));information+=p*(1-p)}
  return{theta,se:1/Math.sqrt(information),information}
}
function normalize(state,count=50){
  const s=plain(state)?state:{},seen=Array.isArray(s.seenUids)?[...new Set(s.seenUids.map(String).filter(Boolean))]:[],seenContentKeys=Array.isArray(s.seenContentKeys)?[...new Set(s.seenContentKeys.map(String).filter(Boolean))]:[],topics=plain(s.topicCounts)?s.topicCounts:{},poolUids=Array.isArray(s.poolUids)?[...new Set(s.poolUids.map(String).filter(Boolean))]:[],path=Array.isArray(s.path)?s.path.filter(plain).slice(-200):[],focusCounts=plain(s.focusCounts)?s.focusCounts:{},estimate=path.length?estimateAbility(path):{theta:clampLogit(s.theta),se:Number(s.se)||1.5,information:Number(s.information)||0};
  return{mode:'adaptive',version:2,theta:estimate.theta,se:estimate.se,information:estimate.information,level:logitToLevel(estimate.theta),answered:Math.max(0,Number(s.answered)||path.length),correct:Math.max(0,Number(s.correct)||path.filter(x=>x.ok).length),maxQuestions:Math.max(1,Math.min(200,Number(s.maxQuestions)||Number(count)||50)),seenUids:seen,seenContentKeys,poolUids,topicCounts:Object.fromEntries(Object.entries(topics).map(([k,v])=>[String(k),Math.max(0,Number(v)||0)])),focusCounts:Object.fromEntries(Object.entries(focusCounts).map(([k,v])=>[String(k),Math.max(0,Number(v)||0)])),path,currentLevel:logitToLevel(estimate.theta),currentDifficulty:Number.isFinite(Number(s.currentDifficulty))?clampLogit(s.currentDifficulty):null,currentChallenge:Number.isFinite(Number(s.currentChallenge))?Number(s.currentChallenge):null,currentProbability:Number.isFinite(Number(s.currentProbability))?Number(s.currentProbability):null,currentFocus:String(s.currentFocus||''),currentTopic:String(s.currentTopic||'')}
}
function poolTopicCounts(questions,allowed){
  const counts={},content=new Set();let total=0;
  for(const q of questions){if(!q?.uid||allowed&&!allowed.has(String(q.uid)))continue;const key=contentKey(q);if(content.has(key))continue;content.add(key);const t=topicOf(q);counts[t]=(counts[t]||0)+1;total++}
  return{counts,total}
}
function candidateScore(q,s,distribution,recent,recentContent,snapshot,index){
  const key=contentKey(q),c=challenge(q),difficulty=challengeToLogit(c),probability=logistic(s.theta-difficulty),information=probability*(1-probability),topic=topicOf(q),topicCount=Number(s.topicCounts[topic])||0,share=distribution.total?(distribution.counts[topic]||0)/distribution.total:0,expected=(s.answered+1)*share,balancePenalty=Math.max(0,topicCount-expected)*.07,personal=questionStats(q.uid),attempts=Math.max(0,Number(personal?.attempts)||0),recentPenalty=(recent.has(String(q.uid))||recentContent.has(key))?.16:0,priorExposurePenalty=Math.min(.14,attempts*.035),priority=learningPriority(q,snapshot),personalizationWeight=s.answered<5?.11:.24,priorityBonus=(priority.score/100)*personalizationWeight,newCoverageBonus=!priority.seen&&s.answered>=5?.025:0,score=Math.abs(probability-.5)+balancePenalty+recentPenalty+priorExposurePenalty-priorityBonus-newCoverageBonus;
  return{q,challenge:c,difficulty,probability,information,topic,priority,score,tie:tieRank(q.uid||index)}
}
function pick(questions,state){
  const s=normalize(state),seen=new Set(s.seenUids),allowed=s.poolUids.length?new Set(s.poolUids):null,seenContent=new Set(s.seenContentKeys);
  for(const q of questions)if(q?.uid&&seen.has(String(q.uid)))seenContent.add(contentKey(q));
  const recent=recentUids(50),recentContent=recentContentKeys(questions,50),distribution=poolTopicCounts(questions,allowed),snapshot=masterySnapshot();let chosen=null,index=0;
  for(const q of questions){
    const key=contentKey(q);
    if(!q?.uid||seen.has(String(q.uid))||seenContent.has(key)||(allowed&&!allowed.has(String(q.uid)))){index++;continue}
    const candidate=candidateScore(q,s,distribution,recent,recentContent,snapshot,index);
    if(!chosen||candidate.score<chosen.score||(candidate.score===chosen.score&&(candidate.information>chosen.information||(candidate.information===chosen.information&&candidate.tie<chosen.tie))))chosen=candidate;
    index++
  }
  if(!chosen)return{question:null,state:s};
  const focus=chosen.priority.reason||'Balanced practice',topic=chosen.topic;
  const next={...s,seenUids:[...s.seenUids,String(chosen.q.uid)],seenContentKeys:[...seenContent,contentKey(chosen.q)],topicCounts:{...s.topicCounts,[topic]:(Number(s.topicCounts[topic])||0)+1},focusCounts:{...s.focusCounts,[focus]:(Number(s.focusCounts[focus])||0)+1},currentLevel:logitToLevel(s.theta),currentDifficulty:chosen.difficulty,currentChallenge:chosen.challenge,currentProbability:chosen.probability,currentFocus:focus,currentTopic:topic};
  return{question:chosen.q,state:next,challenge:chosen.challenge,difficulty:chosen.difficulty,probability:chosen.probability,information:chosen.information,focus,topic,priority:chosen.priority.score}
}
function start(questions,count=50){
  const uniqueCount=new Set(questions.filter(q=>q?.uid).map(contentKey)).size,maxQuestions=Math.max(1,Math.min(Number(count)||50,uniqueCount||1));
  return pick(questions,normalize({theta:0,maxQuestions,poolUids:questions.map(q=>String(q.uid)),seenContentKeys:[],focusCounts:{}},maxQuestions))
}
function advance(state,q,ok){
  const s=normalize(state),difficulty=Number.isFinite(Number(s.currentDifficulty))?clampLogit(s.currentDifficulty):challengeToLogit(challenge(q)),presentedChallenge=Number.isFinite(Number(s.currentChallenge))?Number(s.currentChallenge):challenge(q),before=s.theta,path=[...s.path,{uid:String(q?.uid||''),ok:!!ok,difficulty,challenge:presentedChallenge,focus:s.currentFocus,topic:s.currentTopic,at:Date.now()}].slice(-200),estimate=estimateAbility(path),after=estimate.theta;
  return{...s,theta:after,se:estimate.se,information:estimate.information,level:logitToLevel(after),currentLevel:logitToLevel(after),currentDifficulty:null,currentChallenge:null,currentProbability:null,currentFocus:'',currentTopic:'',answered:s.answered+1,correct:s.correct+(ok?1:0),path:[...path.slice(0,-1),{...path[path.length-1],thetaBefore:before,thetaAfter:after}]}
}
function sessionProfile(state){
  const s=normalize(state),accuracy=s.answered?Math.round(s.correct/s.answered*100):0;
  return{version:2,answered:s.answered,correct:s.correct,accuracy,challengeLevel:s.level,precision:s.se<=.55?'higher':s.se<=.85?'building':'early',focusCounts:{...s.focusCounts}}
}
window.MBUAdaptiveQuiz={challenge,estimateAbility,normalize,start,pick,advance,sessionProfile};
})();
