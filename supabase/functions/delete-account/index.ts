import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Content-Type":"application/json"
};

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return new Response(JSON.stringify({error:"Method not allowed"}),{status:405,headers:cors});

  const auth=req.headers.get("Authorization")||"";
  const token=auth.startsWith("Bearer ")?auth.slice(7):"";
  if(!token)return new Response(JSON.stringify({error:"Authentication required"}),{status:401,headers:cors});

  const url=Deno.env.get("SUPABASE_URL")!;
  const anon=Deno.env.get("SUPABASE_ANON_KEY")!;
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient=createClient(url,anon,{auth:{persistSession:false}});
  const {data:{user},error:userError}=await userClient.auth.getUser(token);
  if(userError||!user)return new Response(JSON.stringify({error:"Invalid session"}),{status:401,headers:cors});

  const admin=createClient(url,service,{auth:{persistSession:false}});
  const {error}=await admin.auth.admin.deleteUser(user.id);
  if(error)return new Response(JSON.stringify({error:"Account deletion failed"}),{status:500,headers:cors});
  return new Response(JSON.stringify({deleted:true}),{status:200,headers:cors});
});
