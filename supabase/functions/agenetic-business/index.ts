import Stripe from 'npm:stripe@23.1.0';
import {createClient} from 'npm:@supabase/supabase-js@2.112.4';
import {PRICES,seatCount,emailAddress,modelSetup,sha256} from './rules.mjs';
import {validateWorkflow} from './workflow-schema.mjs';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
const allowed=new Set(['https://groundplanes.com','https://www.groundplanes.com','https://neuron-ops.enchantingflora5.chatgpt.site','agenetic://app']);
const json=(v:unknown,status=200,origin='')=>Response.json(v,{status,headers:{'Cache-Control':'no-store','Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'authorization, content-type, apikey','Access-Control-Allow-Methods':'POST, OPTIONS'}});
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
async function command(user:string,action:string,body:any){const r=await db.rpc('agenetic_command',{p_user:user,p_action:action,p_body:body});if(r.error)throw Error(r.error.message);return r.data;}
Deno.serve(async(req)=>{
 const origin=req.headers.get('origin')||'';if(origin&&!allowed.has(origin))return json({error:'Origin not allowed'},403);
 if(req.method==='OPTIONS')return json({},200,origin);if(req.method!=='POST')return json({error:'POST required'},405,origin);
 try {
  if(Number(req.headers.get('content-length')||0)>16100000)return json({error:'Team workflow requests can be up to 16 MB.'},413,origin);
  const raw=await req.text(),bytes=new TextEncoder().encode(raw).byteLength;
  if(bytes>16100000)return json({error:'Team workflow requests can be up to 16 MB.'},413,origin);
  const b=JSON.parse(raw),action=b.action;delete b.action;
  if(action!=='project_put' && bytes>1100000)return json({error:'Request exceeds 1 MB'},413,origin);
  let uid:string|undefined,deviceTeam:string|undefined;
  const token=(req.headers.get('authorization')||'').replace(/^Bearer /,'');
  if(token.startsWith('agk_')){
   const k=await db.from('agenetic_keys').select('user_id,team_id').eq('key_hash',await sha256(token)).is('revoked_at',null).gt('expires_at',new Date().toISOString()).maybeSingle();
   uid=k.data?.user_id;deviceTeam=k.data?.team_id;
   if(!['status','project_get','project_put','entitlement'].includes(action)||b.team_id!==deviceTeam)return json({error:'Device keys are scoped to their team and research actions. Sign in to administer billing.'},403,origin);
  }else{
   const u=await db.auth.getUser(token);uid=u.data.user?.email_confirmed_at?u.data.user.id:undefined;
   if(uid&&u.data.user?.factors?.some(f=>f.status==='verified')){
    const claims=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
    if(claims.aal!=='aal2')return json({error:'Complete your second-factor sign-in at groundplanes.com/dashboard, then open groundplanes.com/team.html. Use a device key to connect the desktop app.'},403,origin);
   }
  }
  if(!uid)return json({error:'Sign in with a verified business account.'},401,origin);
  b.request_id ||= crypto.randomUUID();
  if(action==='invite') {b.email=emailAddress(b.email);if(!['admin','member'].includes(b.role))throw Error('Choose member or administrator.');b.token=random();b.token_hash=await sha256(b.token);}
  if(action==='accept'){if(!/^[a-f0-9]{64}$/.test(b.token||''))throw Error('Invalid invitation');b.token_hash=await sha256(b.token);delete b.token;}
  if(action==='project_put'){
   if(!b.package||b.package.format!=='agenetic/1'||b.package.kind!=='workflow')throw Error('Choose an Agenetic workflow package.');
   if(new TextEncoder().encode(JSON.stringify(b.package)).byteLength>16000000)return json({error:'Team workflow packages can be up to 16 MB.'},413,origin);
   validateWorkflow(b.package.payload);b.name=String(b.package.name||'Shared project').slice(0,100);
  }
  if(action==='model_put')b.config=modelSetup(b.config);
  if(action==='support'&&(!b.subject?.trim()||!b.body?.trim()||b.subject.length>160||b.body.length>8000))throw Error('Enter a subject and a message under 8,000 characters.');
  if(action==='key_create'){
   const key='agk_'+random();b.key_hash=await sha256(key);b.name=String(b.name||'Device').slice(0,80);
   const result=await command(uid,action,b);return json({...result,key,expires_in_days:90},200,origin);
  }
  if(['checkout','portal','invoices','seats'].includes(action)){
   const ctx=await command(uid,'billing_context',b);
   const secret=(Deno.env.get('AGENETIC_STRIPE_KEY')||Deno.env.get('STRIPE_SECRET_KEY'));
   if(!secret)return json({error:'Team billing is not enabled yet. Personal use is unaffected.'},503,origin);
   const stripe=new Stripe(secret,{httpClient:Stripe.createFetchHttpClient()});
   if(action==='invoices'){
    if(!ctx.customer_id)return json({invoices:[]},200,origin);
    const list=await stripe.invoices.list({customer:ctx.customer_id,limit:20,...(b.after?{starting_after:b.after}:{})});
    return json({invoices:list.data.map(i=>({id:i.id,number:i.number,status:i.status,amount:i.total,currency:i.currency,url:i.hosted_invoice_url,pdf:i.invoice_pdf})),has_more:list.has_more},200,origin);
   }
   if(action==='portal'){
    if(!ctx.customer_id)throw Error('Start a team subscription first.');
    const portal=await stripe.billingPortal.sessions.create({customer:ctx.customer_id,configuration:Deno.env.get('AGENETIC_PORTAL_CONFIGURATION'),return_url:'https://groundplanes.com/team.html'});
    return json({url:portal.url},200,origin);
   }
   if(action==='seats'){
    const quantity=seatCount(b.seats);if(quantity<Number(ctx.used_seats))throw Error('Remove members or revoke pending invitations before reducing seats.');
    if(!ctx.subscription_id)throw Error('Start a subscription first.');
    const sub=await stripe.subscriptions.retrieve(ctx.subscription_id);const item=sub.items.data.find(i=>Object.values(PRICES).includes(i.price.id));if(!item)throw Error('Commercial seat item was not found.');
    // Checkout/portal confirmation is safer than charging from an unreviewed field.
    const session=await stripe.billingPortal.sessions.create({customer:ctx.customer_id,configuration:Deno.env.get('AGENETIC_PORTAL_CONFIGURATION'),return_url:'https://groundplanes.com/team.html',flow_data:{type:'subscription_update_confirm',subscription_update_confirm:{subscription:sub.id,items:[{id:item.id,price:item.price.id,quantity}]},after_completion:{type:'redirect',redirect:{return_url:'https://groundplanes.com/team.html'}}}});
    return json({url:session.url},200,origin);
   }
   if(ctx.subscription_id&&!['canceled','incomplete_expired'].includes(ctx.status))throw Error('This team already has a subscription. Use Manage billing.');
   const quantity=seatCount(b.seats),price=PRICES[b.interval];if(!price)throw Error('Choose monthly or yearly billing.');
   const regs=await stripe.tax.registrations.list({status:'active',limit:1});if(!regs.data.length)return json({error:'Commercial checkout is awaiting the billing tax setup. Contact hello@groundplanes.com.'},503,origin);
   let customer=ctx.customer_id;
   if(!customer){
    const c=await stripe.customers.create({email:ctx.email,name:ctx.name},{idempotencyKey:'agenetic-team-customer:'+ctx.id});customer=c.id;
    const update=await db.from('agenetic_teams').update({customer_id:customer}).eq('id',ctx.id).is('customer_id',null);if(update.error)throw Error('Could not connect billing.');
   }
   const existing=await stripe.subscriptions.list({customer,status:'all',limit:100});
   if(existing.data.some(s=>!['canceled','incomplete_expired'].includes(s.status)))throw Error('A subscription already exists. Wait for confirmation or contact support.');
   const pending=await stripe.checkout.sessions.list({customer,status:'open',limit:1});
   if(pending.data[0]?.url)return json({url:pending.data[0].url},200,origin);
   const s=await stripe.checkout.sessions.create({mode:'subscription',customer,line_items:[{price,quantity}],customer_update:{address:'auto'},billing_address_collection:'required',tax_id_collection:{enabled:true},automatic_tax:{enabled:true},client_reference_id:ctx.id,integration_identifier:'agenetic-teams-groundpln',success_url:'https://groundplanes.com/team.html?checkout=complete',cancel_url:'https://groundplanes.com/team.html?checkout=cancelled'}, {idempotencyKey:'agenetic-checkout:'+uid+':'+b.request_id});
   return json({url:s.url},200,origin);
  }
  const result=await command(uid,action,b);
  if(deviceTeam&&action==='status'){result.role='member';result.invites=[];result.keys=[];result.mail_pending=0;result.members=result.members.map((m:any)=>({user_id:m.user_id,role:m.role}));}
  return json({result},200,origin);
 }catch(e){const message=e instanceof Stripe.errors.StripeError?'Billing request failed. Please retry or contact support.':e instanceof Error?e.message:'Request failed';return json({error:message.startsWith('Invalid API')?'Billing configuration unavailable.':message},400,origin);}
});
