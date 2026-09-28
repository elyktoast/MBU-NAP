/* CAT termination policy: calibration-ready minimum/maximum and confidence-bound stopping rules. */
(()=>{'use strict';
const POLICY_VERSION=1,DIAGNOSTIC_FLOOR=6,DEFAULT_MIN_QUESTIONS=25,DEFAULT_MAX_QUESTIONS=75;
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const clampLogit=v=>clamp(Number(v)||0,-2.5,2.5);

function normalizePolicy(raw={},sessionMax=DEFAULT_MAX_QUESTIONS){
  const source=plain(raw)?raw:{};
  const mode=source.mode==='active'?'active':'observe';
  const sessionLimit=Math.max(DIAGNOSTIC_FLOOR,Math.min(200,Number(sessionMax)||DEFAULT_MAX_QUESTIONS));
  const requestedMax=Number(source.maxQuestions);
  const maxQuestions=Math.max(DIAGNOSTIC_FLOOR,Math.min(sessionLimit,Number.isFinite(requestedMax)?requestedMax:Math.min(DEFAULT_MAX_QUESTIONS,sessionLimit)));
  const requestedMin=Number(source.minQuestions);
  const minQuestions=Math.max(DIAGNOSTIC_FLOOR,Math.min(maxQuestions,Number.isFinite(requestedMin)?requestedMin:Math.min(DEFAULT_MIN_QUESTIONS,maxQuestions)));
  const cutTheta=Number(source.cutTheta),confidenceZ=Number(source.confidenceZ),targetSE=Number(source.targetSE);
  return{
    version:POLICY_VERSION,
    mode,
    minQuestions,
    maxQuestions,
    cutTheta:Number.isFinite(cutTheta)?clampLogit(cutTheta):null,
    confidenceZ:Number.isFinite(confidenceZ)&&confidenceZ>0?clamp(confidenceZ,.5,4):null,
    targetSE:Number.isFinite(targetSE)&&targetSE>0?clamp(targetSE,.1,2):null,
    calibrationId:String(source.calibrationId||''),
    calibratedAt:String(source.calibratedAt||'')
  }
}

function evaluate(state,rawPolicy={}){
  const s=plain(state)?state:{};
  const answered=Math.max(0,Number(s.answered)||0);
  const theta=clampLogit(s.theta);
  const se=Math.max(.0001,Number(s.se)||1.5);
  const policy=normalizePolicy(rawPolicy,s.maxQuestions);
  const z=policy.confidenceZ,cut=policy.cutTheta;
  const lower=z===null?null:theta-z*se,upper=z===null?null:theta+z*se;
  const calibrated=cut!==null&&z!==null;
  const precisionMet=policy.targetSE===null||se<=policy.targetSE;
  let wouldStop=false,reason='continue',classification='undetermined';

  if(answered>=policy.maxQuestions){
    wouldStop=true;
    reason='maximum_reached';
    classification=calibrated?(theta>=cut?'above_threshold':'below_threshold'):'unclassified';
  }else if(answered<policy.minQuestions){
    reason='minimum_not_reached';
  }else if(!calibrated){
    reason='awaiting_calibration';
  }else if(!precisionMet){
    reason='precision_not_met';
  }else if(lower>cut){
    wouldStop=true;
    reason='confidence_above_threshold';
    classification='above_threshold';
  }else if(upper<cut){
    wouldStop=true;
    reason='confidence_below_threshold';
    classification='below_threshold';
  }else{
    reason='threshold_uncertain';
  }

  return{
    version:POLICY_VERSION,
    mode:policy.mode,
    active:policy.mode==='active'&&calibrated,
    wouldStop,
    shouldStop:policy.mode==='active'&&wouldStop,
    reason,
    classification,
    answered,
    minQuestions:policy.minQuestions,
    maxQuestions:policy.maxQuestions,
    theta,
    se,
    lower,
    upper,
    cutTheta:cut,
    confidenceZ:z,
    targetSE:policy.targetSE,
    precisionMet,
    calibrated,
    calibrationId:policy.calibrationId,
    calibratedAt:policy.calibratedAt
  }
}

window.MBUCATTermination={POLICY_VERSION,DEFAULT_MIN_QUESTIONS,DEFAULT_MAX_QUESTIONS,normalizePolicy,evaluate};
})();
