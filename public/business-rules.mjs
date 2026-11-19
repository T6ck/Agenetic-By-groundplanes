export const BUSINESS_API='https://tejsbytmtcdzvgzlpkgp.supabase.co/functions/v1/agenetic-business';
export const AUTH_URL='https://tejsbytmtcdzvgzlpkgp.supabase.co/auth/v1';
export const PUBLISHABLE_KEY='sb_publishable_Wu9i_AiY83mk7NwPRuq4qw_I7C0Eu7R';
export const PRICES={month:'price_1UbpJgLQL7spGHgnM76dgQY6',year:'price_1UbpJtLQL7spGHgnHJIY70CT'};
export const PRODUCT='prod_Vd5UrlnWrmhCki';
export const PERSONAL_FEATURES=['notes','graph','canvas','models','research','claim_review','workflow_export','themes','backup'];
export function paidAccess(team,now=Date.now()) {return !!team&&['active','trialing'].includes(team.status)&&!team.risk_hold&&team.seats>0&&Date.parse(team.period_end)>now;}
export function seatCount(value){if(!Number.isSafeInteger(value)||value<1||value>500)throw Error('Choose between 1 and 500 seats.');return value;}
export function emailAddress(value){const s=String(value||'').trim().toLowerCase();if(s.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))throw Error('Enter a valid email address.');return s;}
export function modelSetup(v){
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!['name','repo','revision','filename','context','threads','gpuLayers'].includes(k)))throw Error('Model setup contains unsupported fields. Credentials and local paths must stay on each device.');
 if(typeof v.name!=='string'||!v.name.trim()||v.name.length>100||!/^[-\w.]+\/[-\w.]+$/.test(v.repo)||! /^[a-f0-9]{40}$/.test(v.revision)||typeof v.filename!=='string'||v.filename.length>512||!v.filename.endsWith('.gguf')||v.filename.includes('\\')||v.filename.split('/').some(s=>!s||s==='.'||s==='..'))throw Error('Use an exact Hugging Face repository, commit revision, and GGUF filename.');
 for(const [key,min,max] of [['context',512,32768],['threads',1,128],['gpuLayers',0,999]])if(!Number.isInteger(v[key])||v[key]<min||v[key]>max)throw Error('Invalid '+key+' limit.');
 return v;
}
export async function sha256(text){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');}
export async function claimAudit(files,{team,workspace,reviewer,current,now=new Date().toISOString()}){
 const rows=[],byId=new Map(files.map(file=>[file.id,file])),hashes=new Map();
 for(const f of files.filter(f=>f.research)){
  const evidence=[];
  for(const q of f.research.quotes||[]){
   const source=byId.get(q.id);
   if(!source){
    evidence.push({source_id:null,source_name:'Source unavailable in this workspace',quote:'',quote_present:false,source_sha256:null});
    continue;
   }
   const text=source.text||'',quote=String(q.excerpt||'');
   if(!hashes.has(source.id))hashes.set(source.id,await sha256(text));
   evidence.push({source_id:q.id,source_name:source.name,quote,quote_present:!!quote&&text.includes(quote),source_sha256:hashes.get(source.id)});
  }
  rows.push({claim_id:f.id,claim:f.research.statement||f.name,review_state:f.research.state||'pending',review_decision:f.research.decision||null,review_currency:['supported','evidence'].includes(f.research.state)&&current?(current.has(f.id)?'current':'needs_recheck'):'unassessed',evidence,check:!evidence.length?'no_quote':evidence.every(e=>e.quote_present)?'exact_quote_present':'quote_missing_or_changed'});
 }
 return {format:'agenetic-claim-audit/1',team,workspace,exported_by:reviewer,exported_at:now,method:'Exact substring comparison against visible workspace sources at export time. A previously accepted result needs rechecking if its evidence chain or reviewed text has changed. Quote presence does not establish that a claim is true or supported. Review states are user decisions, not independent certification.',rows};
}
export function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function auditHtml(report){const e=escapeHtml;return '<!doctype html><html lang="en"><meta charset="utf-8"><title>Agenetic claim audit</title><style>body{font:15px Georgia,serif;margin:40px;color:#182626}table{border-collapse:collapse;width:100%}td,th{border:1px solid #aab5b4;padding:12px;text-align:left;vertical-align:top;overflow-wrap:anywhere}blockquote{margin:8px 0}small{display:block}h1{font-weight:400}@media print{body{margin:0}tr{break-inside:avoid}}</style><h1>Claim audit</h1><p>'+e(report.team)+' · '+e(report.workspace)+'</p><p>'+e(report.exported_at)+' · Exported by '+e(report.exported_by)+'</p><p>'+e(report.method)+'</p><table><thead><tr><th>Claim / review</th><th>Quoted evidence</th><th>Check</th></tr></thead><tbody>'+report.rows.map(r=>'<tr><td>'+e(r.claim)+'<small>'+e(r.review_state)+' · '+e(r.review_currency)+'</small><small>'+e(r.review_decision?.rationale||'No review rationale recorded')+'</small><small>'+e(r.review_decision?.time?new Date(r.review_decision.time).toISOString():'No decision timestamp')+'</small></td><td>'+r.evidence.map(q=>'<strong>'+e(q.source_name)+'</strong><blockquote>'+e(q.quote)+'</blockquote><small>Source SHA-256: '+e(q.source_sha256)+'</small>').join('')+'</td><td>'+e(r.check)+'</td></tr>').join('')+'</tbody></table></html>';}
