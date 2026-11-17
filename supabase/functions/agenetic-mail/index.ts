import {createClient} from 'npm:@supabase/supabase-js@2.112.4';
// Public wake-up endpoint. Callers cannot supply recipients or message content.
// Only already-authorized transactional outbox rows can be leased and sent.
Deno.serve(async req=>{
 if(req.method!=='POST')return new Response('POST required',{status:405});
 const key=Deno.env.get('RESEND_API_KEY');if(!key)return new Response('Mail is not configured',{status:503});
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 const {data:rows,error}=await db.rpc('agenetic_mail_claim');if(error)return new Response('Queue unavailable',{status:503});
 for(const row of rows||[]){
  try{
   const r=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':'agenetic:'+row.id},body:JSON.stringify({from:'Agenetic by Groundplanes <hello@groundplanes.com>',reply_to:'hello@groundplanes.com',to:[row.recipient],subject:row.subject,text:row.body})});
   const out=await r.json();
   if(r.ok){await db.from('agenetic_mail').update({sent_at:new Date().toISOString(),provider_id:out.id,leased_until:null}).eq('id',row.id);}
   else{await db.from('agenetic_mail').update({leased_until:null,failed:r.status!==429&&r.status<500||row.attempts>=10,next_attempt:new Date(Date.now()+Math.min(3600000,30000*2**row.attempts)).toISOString()}).eq('id',row.id);}
  }catch{await db.from('agenetic_mail').update({leased_until:null,failed:row.attempts>=10,next_attempt:new Date(Date.now()+300000).toISOString()}).eq('id',row.id);}
 }
 // Never retry ambiguously delivered messages beyond Resend's idempotency window.
 await db.from('agenetic_mail').update({failed:true}).is('sent_at',null).lt('created_at',new Date(Date.now()-23*3600000).toISOString());
 return Response.json({ok:true});
});
