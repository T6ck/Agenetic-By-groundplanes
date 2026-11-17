import Stripe from 'npm:stripe@23.1.0';
import {createClient} from 'npm:@supabase/supabase-js@2.112.4';
const prices=new Set(['price_1UbpJgLQL7spGHgnM76dgQY6','price_1UbpJtLQL7spGHgnHJIY70CT']);
const events=new Set(['checkout.session.completed','checkout.session.async_payment_succeeded','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','invoice.paid','invoice.payment_failed','charge.dispute.created','charge.refunded','radar.early_fraud_warning.created']);
const id=(v:any)=>typeof v==='string'?v:v?.id;
Deno.serve(async req=>{
 if(req.method!=='POST')return new Response('POST required',{status:405});
 const key=Deno.env.get('AGENETIC_STRIPE_KEY'),secret=Deno.env.get('AGENETIC_STRIPE_WEBHOOK_SECRET');
 if(!key||!secret)return new Response('Billing is not configured',{status:503});
 const stripe=new Stripe(key,{apiVersion:'2026-10-28.endive',httpClient:Stripe.createFetchHttpClient()});
 let event:Stripe.Event;
 try{const raw=await req.text();if(raw.length>1000000)return new Response('Too large',{status:413});event=await stripe.webhooks.constructEventAsync(raw,req.headers.get('stripe-signature')||'',secret,undefined,Stripe.createSubtleCryptoProvider());}catch{return new Response('Invalid signature',{status:400});}
 if(!events.has(event.type))return Response.json({ignored:true});
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 try{
  const obj:any=event.data.object;let customer=id(obj.customer),subId:string|undefined;let risk=false;
  if(event.type.startsWith('checkout.')){if(obj.payment_status!=='paid')return Response.json({ignored:true});subId=id(obj.subscription);}
  else if(event.type.startsWith('customer.subscription.'))subId=obj.id;
  else if(event.type.startsWith('invoice.'))subId=id(obj.parent?.subscription_details?.subscription);
  else {
   risk=true;const charge=event.type==='charge.refunded'?obj:await stripe.charges.retrieve(id(obj.charge));customer=id(charge.customer);
  }
  if(!customer)return Response.json({ignored:true});
  const {data:team,error}=await db.from('agenetic_teams').select('id,subscription_id,owner_id').eq('customer_id',customer).maybeSingle();if(error)throw error;
  if(!team)return Response.json({ignored:true});
  subId ||= team.subscription_id;if(!subId)throw Error('Subscription not available yet');
  const version=Date.now();const sub=await stripe.subscriptions.retrieve(subId);if(id(sub.customer)!==customer)throw Error('Customer mismatch');
  const items=sub.items.data.filter(i=>prices.has(i.price.id));if(items.length!==1)throw Error('Expected one commercial seat item');
  const item=items[0];
  const applied=await db.rpc('agenetic_billing_apply',{p_event:event.id,p_type:event.type,p_customer:customer,p_subscription:sub.id,p_status:sub.status,p_seats:item.quantity||0,p_end:new Date(item.current_period_end*1000).toISOString(),p_cancel:sub.cancel_at_period_end,p_version:version,p_risk:risk});
  if(applied.error)throw applied.error;
  if(['invoice.paid','invoice.payment_failed'].includes(event.type)){
   const user=await db.auth.admin.getUserById(team.owner_id);const email=user.data.user?.email;
   if(email){const r=await db.from('agenetic_mail').upsert({team_id:team.id,dedupe:'invoice:'+event.id,recipient:email,subject:event.type==='invoice.paid'?'Agenetic payment received':'Agenetic payment needs attention',body:'Open https://groundplanes.com/team.html to view the invoice and manage payment details. Personal features remain free.'},{onConflict:'dedupe',ignoreDuplicates:true});if(r.error)throw r.error;}
  }
  return Response.json({ok:true});
 }catch{ return new Response('Could not reconcile billing; retry required',{status:503}); }
});
