/* Opt-in CAT-style adaptive quiz engine for Study Studio.
   Uses provisional personal difficulty estimates until population-calibrated item statistics exist. */
(()=>{'use strict';
const DAY=86400000;
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const clampLevel=v=>Math.max(1,Math.min(5,Number(v)||3));
const clampLogit=v=>Math.max(-2.5,Math.min(2.5,Number(v)||0));
const challengeToLogit=challenge=>clampLogit((clampLevel(challenge)-3)*1.25);
const logitToLevel=logit=>clampLevel(Math.round(3+clampLogit(logit)/1.25));
const logistic=x=>1/(1+Math.exp(-Math.max(-12,Math.min(12,x))));
function tieRank(uid){let h=2166136261;for(const c of String(uid||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function topicOf(q){return String(q?.topic||q?.lec||q?.concept||'Other').trim()||'Other'}
function contentKey(q){const stem=String(q?.stem||q?.q||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();return stem||('uid:'+String(q?.uid||q?.id||''))}
function questionStats(uid){return window.MBUStudyIntelligence?.questionStats?.(uid)||null}
function populationStats(uid){return window.MBUSupabase?.calibration?.(uid)||null}
function topicStats(topic,cache){
  const key=String(topic||'');
  if(cache&&Object.prototype.hasOwnProperty.call(cache,key))return cache[key];
  return window.MBUStudyIntelligence?.topicStats?.(key)||{attempts:0,accuracy:0}
}
function topicStatsSnapshot(){
  const byTopic=window.MBUStudyIntelligence?.analytics?.()?.byTopic||{};
  return Object.fromEntries(Object.entries(byTopic).map(([topic,row])=>[String(topic),{attempts:Number(row?.attempts)||0,accuracy:Number(row?.accuracy)||0}]))
}
function recentUids(limit=50){return new Set((window.MBUStudyIntelligence?.recentActivity?.(limit)||[]).map(x=>String(x.uid||'')))}
function recentContentKeys(questions,limit=50){
  const recent=recentUids(limit),keys=new Set(),byUid=new Map((questions||[]).filter(q=>q?.uid).map(q=>[String(q.uid),q]));
  for(const uid of recent){
    const saved=questionStats(uid),q=byUid.get(uid);
    if(saved?.stem)keys.add(contentKey({stem:saved.stem,uid}));
    else if(q)keys.add(contentKey(q))
  }
  return keys
}
function challenge(q){
  const multi=(Array.isArray(q?.ans)?q.ans:Array.isArray(q?.answer)?q.answer:[]).length>1;
  let score=3+(multi?.65:0)+((q?.bank==='hh'||Number(q?.set)===7)?.7:0);
  const pop=populationStats(q?.uid),learners=Number(pop?.unique_learners)||0;
  if(learners>=25&&Number.isFinite(Number(pop?.difficulty_logit))){
    const populationScore=clampLevel(3+clampLogit(pop.difficulty_logit)/1.25),weight=learners>=300?.8:learners>=100?.6:.35;
    score=score*(1-weight)+populationScore*weight
  }
  return Math.round(clampLevel(score)*100)/100
}
function learningNeedAdjustment(q,topicCache=null){
  let adjustment=0;
  const topic=topicStats(topicOf(q),topicCache);
  if(topic.attempts>=4)adjustment+=(topic.accuracy/100-.5)*.12;
  const personal=questionStats(q?.uid);
  if(personal&&Number(personal.attempts)>0){
    if(!personal.lastCorrect)adjustment-=.04;
    if((Number(personal.streak)||0)>=3)adjustment+=.03
  }
  return Math.max(-.08,Math.min(.08,adjustment))
}
function estimateAbility(path=[]){
  const rows=Array.isArray(path)?path.filter(x=>plain(x)&&Number.isFinite(Number(x.difficulty))):[];
  let theta=0;
  const priorVar=2.25;
  for(let iter=0;iter<6;iter++){
    let gradient=-theta/priorVar,information=1/priorVar;
    for(const row of rows){
      const b=clampLogit(row.difficulty),p=logistic(theta-b);
      gradient+=(row.ok?1:0)-p;
      information+=p*(1-p)
    }
    const step=gradient/Math.max(.15,information);
    theta=clampLogit(theta+Math.max(-1,Math.min(1,step)));
    if(Math.abs(step)<.001)break
  }
  let information=1/priorVar;
  for(const row of rows){const p=logistic(theta-clampLogit(row.difficulty));information+=p*(1-p)}
  return{theta,se:1/Math.sqrt(information),information}
}
function normalize(state,count=50){
  const s=plain(state)?state:{},seen=Array.isArray(s.seenUids)?[...new Set(s.seenUids.map(String).filter(Boolean))]:[],seenContentKeys=Array.isArray(s.seenContentKeys)?[...new Set(s.seenContentKeys.map(String).filter(Boolean))]:[],topics=plain(s.topicCounts)?s.topicCounts:{},poolUids=Array.isArray(s.poolUids)?[...new Set(s.poolUids.map(String).filter(Boolean))]:[],path=Array.isArray(s.path)?s.path.filter(plain).slice(-200):[],estimate=path.length?estimateAbility(path):{theta:clampLogit(s.theta),se:Number(s.se)||1.5,information:Number(s.information)||0};
  return{mode:'adaptive',theta:estimate.theta,se:estimate.se,information:estimate.information,level:logitToLevel(estimate.theta),answered:Math.max(0,Number(s.answered)||path.length),correct:Math.max(0,Number(s.correct)||path.filter(x=>x.ok).length),maxQuestions:Math.max(1,Math.min(200,Number(s.maxQuestions)||Number(count)||50)),seenUids:seen,seenContentKeys,poolUids,topicCounts:Object.fromEntries(Object.entries(topics).map(([k,v])=>[String(k),Math.max(0,Number(v)||0)])),path,currentLevel:logitToLevel(estimate.theta),currentDifficulty:Number.isFinite(Number(s.currentDifficulty))?clampLogit(s.currentDifficulty):null,currentChallenge:Number.isFinite(Number(s.currentChallenge))?Number(s.currentChallenge):null,currentProbability:Number.isFinite(Number(s.currentProbability))?Number(s.currentProbability):null}
}
function poolTopicCounts(questions,allowed){
  const counts={},content=new Set();let total=0;
  for(const q of questions){if(!q?.uid||allowed&&!allowed.has(String(q.uid)))continue;const key=contentKey(q);if(content.has(key))continue;content.add(key);const t=topicOf(q);counts[t]=(counts[t]||0)+1;total++}
  return{counts,total}
}
function pick(questions,state){
  const s=normalize(state),seen=new Set(s.seenUids),allowed=s.poolUids.length?new Set(s.poolUids):null,seenContent=new Set(s.seenContentKeys);
  for(const q of questions)if(q?.uid&&seen.has(String(q.uid)))seenContent.add(contentKey(q));
  const recent=recentUids(50),recentContent=recentContentKeys(questions,50),distribution=poolTopicCounts(questions,allowed),topicCache=topicStatsSnapshot(),target=s.theta;
  let chosen=null,index=0;
  for(const q of questions){
    const key=contentKey(q);if(!q?.uid||seen.has(String(q.uid))||seenContent.has(key)||(allowed&&!allowed.has(String(q.uid)))){index++;continue}
    const c=challenge(q),difficulty=challengeToLogit(c),probability=logistic(target-difficulty),information=probability*(1-probability),topic=topicOf(q),topicCount=Number(s.topicCounts[topic])||0,share=distribution.total?(distribution.counts[topic]||0)/distribution.total:0,expected=(s.answered+1)*share,balancePenalty=Math.max(0,topicCount-expected)*.08,personal=questionStats(q.uid),attempts=Math.max(0,Number(personal?.attempts)||0),recentPenalty=(recent.has(String(q.uid))||recentContent.has(key))?.14:0,priorExposurePenalty=Math.min(.12,attempts*.04),exposurePenalty=recentPenalty+priorExposurePenalty,needAdjustment=learningNeedAdjustment(q,topicCache),candidate={q,challenge:c,difficulty,probability,information,score:Math.abs(probability-.5)+balancePenalty+exposurePenalty+needAdjustment,tie:tieRank(q.uid||index)};
    if(!chosen||candidate.score<chosen.score||(candidate.score===chosen.score&&(candidate.information>chosen.information||(candidate.information===chosen.information&&candidate.tie<chosen.tie))))chosen=candidate;
    index++
  }
  if(!chosen)return{question:null,state:s};
  const next={...s,seenUids:[...s.seenUids,String(chosen.q.uid)],seenContentKeys:[...seenContent,contentKey(chosen.q)],topicCounts:{...s.topicCounts,[topicOf(chosen.q)]:(Number(s.topicCounts[topicOf(chosen.q)])||0)+1},currentLevel:logitToLevel(s.theta),currentDifficulty:chosen.difficulty,currentChallenge:chosen.challenge,currentProbability:chosen.probability};
  return{question:chosen.q,state:next,challenge:chosen.challenge,difficulty:chosen.difficulty,probability:chosen.probability,information:chosen.information}
}
function start(questions,count=50){
  const uniqueCount=new Set(questions.filter(q=>q?.uid).map(contentKey)).size,maxQuestions=Math.max(1,Math.min(Number(count)||50,uniqueCount||1));
  const base=normalize({theta:0,maxQuestions,poolUids:questions.map(q=>String(q.uid)),seenContentKeys:[]},maxQuestions);
  return pick(questions,base)
}
function advance(state,q,ok){
  const s=normalize(state),difficulty=Number.isFinite(Number(s.currentDifficulty))?clampLogit(s.currentDifficulty):challengeToLogit(challenge(q)),presentedChallenge=Number.isFinite(Number(s.currentChallenge))?Number(s.currentChallenge):challenge(q),before=s.theta,path=[...s.path,{uid:String(q?.uid||''),ok:!!ok,difficulty,challenge:presentedChallenge,at:Date.now()}].slice(-200),estimate=estimateAbility(path),after=estimate.theta;
  return{...s,theta:after,se:estimate.se,information:estimate.information,level:logitToLevel(after),currentLevel:logitToLevel(after),currentDifficulty:null,currentChallenge:null,currentProbability:null,answered:s.answered+1,correct:s.correct+(ok?1:0),path:[...path.slice(0,-1),{...path[path.length-1],thetaBefore:before,thetaAfter:after}]}
}
window.MBUAdaptiveQuiz={challenge,estimateAbility,normalize,start,pick,advance};
})();
