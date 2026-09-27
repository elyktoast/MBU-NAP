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
function questionStats(uid){return window.MBUStudyIntelligence?.questionStats?.(uid)||null}
function populationStats(uid){return window.MBUSupabase?.calibration?.(uid)||null}
function topicStats(topic){return window.MBUStudyIntelligence?.topicStats?.(topic)||{attempts:0,accuracy:0}}
function recentUids(limit=50){return new Set((window.MBUStudyIntelligence?.recentActivity?.(limit)||[]).map(x=>String(x.uid||'')))}
function challenge(q){
  const a=questionStats(q?.uid),multi=(Array.isArray(q?.ans)?q.ans:Array.isArray(q?.answer)?q.answer:[]).length>1;
  let score=3+(multi?.65:0)+((q?.bank==='hh'||Number(q?.set)===7)?.7:0);
  const pop=populationStats(q?.uid),learners=Number(pop?.unique_learners)||0;
  if(learners>=25&&Number.isFinite(Number(pop?.difficulty_logit))){
    const populationScore=clampLevel(3+clampLogit(pop.difficulty_logit)/1.25),weight=learners>=300?.8:learners>=100?.6:.35;
    score=score*(1-weight)+populationScore*weight
  }
  const topic=topicStats(topicOf(q));
  if(topic.attempts>=4)score+=(.5-(topic.accuracy/100))*1.2;
  if(a&&Number(a.attempts)>0){
    const acc=(Number(a.correct)||0)/Number(a.attempts),observed=3+(.5-acc)*3,weight=Math.min(.85,Number(a.attempts)/5);
    score=score*(1-weight)+observed*weight;
    if(!a.lastCorrect)score+=.15;
    if((Number(a.streak)||0)>=3)score-=.15
  }
  return Math.round(clampLevel(score)*100)/100
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
  const s=plain(state)?state:{},seen=Array.isArray(s.seenUids)?[...new Set(s.seenUids.map(String).filter(Boolean))]:[],topics=plain(s.topicCounts)?s.topicCounts:{},poolUids=Array.isArray(s.poolUids)?[...new Set(s.poolUids.map(String).filter(Boolean))]:[],path=Array.isArray(s.path)?s.path.filter(plain).slice(-200):[],estimate=path.length?estimateAbility(path):{theta:clampLogit(s.theta),se:Number(s.se)||1.5,information:Number(s.information)||0};
  return{mode:'adaptive',theta:estimate.theta,se:estimate.se,information:estimate.information,level:logitToLevel(estimate.theta),answered:Math.max(0,Number(s.answered)||path.length),correct:Math.max(0,Number(s.correct)||path.filter(x=>x.ok).length),maxQuestions:Math.max(1,Math.min(200,Number(s.maxQuestions)||Number(count)||50)),seenUids:seen,poolUids,topicCounts:Object.fromEntries(Object.entries(topics).map(([k,v])=>[String(k),Math.max(0,Number(v)||0)])),path,currentLevel:logitToLevel(estimate.theta),currentDifficulty:Number.isFinite(Number(s.currentDifficulty))?clampLogit(s.currentDifficulty):null,currentChallenge:Number.isFinite(Number(s.currentChallenge))?Number(s.currentChallenge):null,currentProbability:Number.isFinite(Number(s.currentProbability))?Number(s.currentProbability):null}
}
function poolTopicCounts(questions,allowed){
  const counts={};let total=0;
  for(const q of questions){if(!q?.uid||allowed&&!allowed.has(String(q.uid)))continue;const t=topicOf(q);counts[t]=(counts[t]||0)+1;total++}
  return{counts,total}
}
function pick(questions,state){
  const s=normalize(state),seen=new Set(s.seenUids),allowed=s.poolUids.length?new Set(s.poolUids):null,available=questions.filter(q=>q&&q.uid&&!seen.has(String(q.uid))&&(!allowed||allowed.has(String(q.uid))));
  if(!available.length)return{question:null,state:s};
  const recent=recentUids(50),distribution=poolTopicCounts(questions,allowed),target=s.theta;
  const ranked=available.map((q,i)=>{
    const c=challenge(q),difficulty=challengeToLogit(c),probability=logistic(target-difficulty),information=probability*(1-probability),topic=topicOf(q),topicCount=Number(s.topicCounts[topic])||0,share=distribution.total?(distribution.counts[topic]||0)/distribution.total:0,expected=(s.answered+1)*share,balancePenalty=Math.max(0,topicCount-expected)*.08,exposurePenalty=recent.has(String(q.uid))?.08:0;
    return{q,challenge:c,difficulty,probability,information,score:Math.abs(probability-.5)+balancePenalty+exposurePenalty,tie:tieRank(q.uid||i)}
  }).sort((a,b)=>a.score-b.score||b.information-a.information||a.tie-b.tie);
  const chosen=ranked[0],next={...s,seenUids:[...s.seenUids,String(chosen.q.uid)],topicCounts:{...s.topicCounts,[topicOf(chosen.q)]:(Number(s.topicCounts[topicOf(chosen.q)])||0)+1},currentLevel:logitToLevel(s.theta),currentDifficulty:chosen.difficulty,currentChallenge:chosen.challenge,currentProbability:chosen.probability};
  return{question:chosen.q,state:next,challenge:chosen.challenge,difficulty:chosen.difficulty,probability:chosen.probability,information:chosen.information}
}
function start(questions,count=50){
  const base=normalize({theta:0,maxQuestions:count,poolUids:questions.map(q=>String(q.uid))},count);
  return pick(questions,base)
}
function advance(state,q,ok){
  const s=normalize(state),difficulty=Number.isFinite(Number(s.currentDifficulty))?clampLogit(s.currentDifficulty):challengeToLogit(challenge(q)),presentedChallenge=Number.isFinite(Number(s.currentChallenge))?Number(s.currentChallenge):challenge(q),before=s.theta,path=[...s.path,{uid:String(q?.uid||''),ok:!!ok,difficulty,challenge:presentedChallenge,at:Date.now()}].slice(-200),estimate=estimateAbility(path),after=estimate.theta;
  return{...s,theta:after,se:estimate.se,information:estimate.information,level:logitToLevel(after),currentLevel:logitToLevel(after),currentDifficulty:null,currentChallenge:null,currentProbability:null,answered:s.answered+1,correct:s.correct+(ok?1:0),path:[...path.slice(0,-1),{...path[path.length-1],thetaBefore:before,thetaAfter:after}]}
}
window.MBUAdaptiveQuiz={challenge,estimateAbility,normalize,start,pick,advance};
})();
