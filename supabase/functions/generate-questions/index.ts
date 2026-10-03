import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const allowed=new Set(["https://elyktoast.github.io","http://127.0.0.1:4173","http://localhost:4173"]);
const headers=(origin:string)=>({
  "Access-Control-Allow-Origin":allowed.has(origin)?origin:"https://elyktoast.github.io",
  "Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Content-Type":"application/json",
  "Vary":"Origin"
});
const json=(body:unknown,status:number,origin:string)=>new Response(JSON.stringify(body),{status,headers:headers(origin)});
const schema={
  type:"ARRAY",items:{type:"OBJECT",properties:{
    stem:{type:"STRING"},options:{type:"ARRAY",items:{type:"STRING"},minItems:4,maxItems:5},
    answer:{type:"ARRAY",items:{type:"INTEGER"},minItems:1,maxItems:4},
    type:{type:"STRING",enum:["single","multi"]},explanation:{type:"STRING"},
    topic:{type:"STRING"},citation:{type:"STRING"},sourceExcerpt:{type:"STRING"}
  },required:["stem","options","answer","type","explanation","topic","citation","sourceExcerpt"]}
};

Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("Origin")||"";
  if(req.method==="OPTIONS")return new Response("ok",{headers:headers(origin)});
  if(req.method!=="POST")return json({error:"Method not allowed"},405,origin);
  if(!allowed.has(origin))return json({error:"Origin not allowed"},403,origin);
  const key=Deno.env.get("GEMINI_API_KEY")||"";
  if(!key)return json({error:"Question generation is not configured."},503,origin);
  let body:any;try{body=await req.json()}catch{return json({error:"Invalid JSON body"},400,origin)}
  const material=String(body?.material||"").trim(),sourceName=String(body?.sourceName||"").trim(),citation=String(body?.citation||"").trim();
  const count=Math.max(1,Math.min(20,Number(body?.count)||5));
  if(!material)return json({error:"Source material is required."},400,origin);
  if(material.length>50000)return json({error:"Source material exceeds the 50,000 character limit."},413,origin);
  const model=Deno.env.get("GEMINI_MODEL")||"gemini-3.6-flash";
  const prompt=`Create ${count} graduate-level SRNA/NBCRNA-style questions using ONLY the supplied source material. Favor application and analysis over simple recall. Use concise stems, plausible distractors, and no answer cues. For multi-select questions, key every correct option. answer contains zero-based option indexes. Every explanation must state why the keyed answer is correct. citation should use the supplied citation when available. sourceExcerpt must be a short supporting excerpt or faithful concise source statement from the supplied material. Source: ${sourceName||"Provided material"}\nCitation: ${citation||"Provided material"}\n\nSOURCE MATERIAL:\n${material}`;
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{
    method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key},
    body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:"application/json",responseSchema:schema,temperature:.65}})
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok)return json({error:"Gemini generation failed.",status:response.status,detail:data?.error?.message||""},502,origin);
  const text=data?.candidates?.[0]?.content?.parts?.map((p:any)=>p?.text||"").join("")||"";
  let questions;try{questions=JSON.parse(text)}catch{return json({error:"Gemini returned invalid structured output."},502,origin)}
  if(!Array.isArray(questions))return json({error:"Gemini returned an invalid question list."},502,origin);
  return json({questions,model},200,origin);
});
