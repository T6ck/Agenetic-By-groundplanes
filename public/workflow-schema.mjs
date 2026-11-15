export function validateWorkflow(v){
 const fail=()=>{throw new Error('Invalid workflow: check records, references, attachments, and layout.')};
 const obj=(x,keys)=>{if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).some(k=>!keys.includes(k)))fail()};
 const text=(x,n=200000)=>{if(typeof x!=='string'||x.length>n)fail()};
 obj(v,['nodes','links','groups','positions','graphPositions','viewMode']);
 if(!Array.isArray(v.nodes)||v.nodes.length>1000||!Array.isArray(v.links)||v.links.length>10000||!Array.isArray(v.groups)||v.groups.length>100)fail();
 const ids=new Map();for(const n of v.nodes){obj(n,['id','kind','name','text','role','task','files','model','description','agent','size','attachment','source']);text(n.id,100);text(n.name,100);if(!n.id||!n.name||ids.has(n.id)||!['file','agent','task','model'].includes(n.kind))fail();ids.set(n.id,n.kind);if(n.source!==undefined){obj(n.source,['provider','repo','revision','filename']);const h=n.source;if(n.kind!=='model'||h.provider!=='huggingface'||typeof h.repo!=='string'||! /^[\w.-]+\/[\w.-]+$/.test(h.repo)||typeof h.revision!=='string'||! /^[a-f0-9]{40}$/.test(h.revision)||typeof h.filename!=='string'||h.filename.length>512||h.filename.includes('\\')||h.filename.split('/').some(p=>!p||p==='.'||p==='..')||!h.filename.endsWith('.gguf'))fail();}for(const k of ['text','role','task','description'])if(n[k]!==undefined)text(n[k]);if(n.size!==undefined&&(!Number.isSafeInteger(n.size)||n.size<0))fail();if(n.attachment!==undefined){obj(n.attachment,['base64','type']);text(n.attachment.type,100);text(n.attachment.base64,1000000);if(n.kind!=='file'||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(n.attachment.base64))fail()}}
 const ref=(id,kind)=>{if(typeof id!=='string'||(id&&(!ids.has(id)||(kind&&ids.get(id)!==kind))))fail()};
 for(const n of v.nodes){if(n.kind==='agent'){if(!Array.isArray(n.files)||n.files.length>1000)fail();n.files.forEach(id=>ref(id,'file'));ref(n.model,'model')}if(n.kind==='task')ref(n.agent,'agent')}
 for(const l of v.links){obj(l,['from','to']);ref(l.from);ref(l.to);if(!l.from||!l.to)fail()}
 for(const g of v.groups){obj(g,['name','members']);text(g.name,100);if(!Array.isArray(g.members))fail();g.members.forEach(id=>ref(id))}
 for(const key of ['positions','graphPositions']){if(!v[key]||Array.isArray(v[key])||typeof v[key]!=='object')fail();for(const [id,p] of Object.entries(v[key])){ref(id);if(!Array.isArray(p)||p.length!==2||p.some(x=>!Number.isFinite(x)||Math.abs(x)>1e7))fail()}}
 if(!['graph','canvas'].includes(v.viewMode))fail();return v;
}
export function restoreWorkflow(v,uuid){
 validateWorkflow(v);const ids=new Map(v.nodes.map(n=>[n.id,uuid()])),map=id=>ids.get(id)||'';
 const nodes=v.nodes.map(n=>{const r={...n,id:map(n.id)};delete r.kind;delete r.attachment;if(n.kind==='agent'){r.files=n.files.map(map);r.model=map(n.model)}if(n.kind==='task'){r.agent=map(n.agent);r.status='planned'}return {kind:n.kind,record:r,attachment:n.attachment}});
 return {nodes,links:v.links.map(l=>({from:map(l.from),to:map(l.to)})),space:{id:uuid(),members:nodes.map(n=>n.record.id),groups:v.groups.map(g=>({...g,id:uuid(),members:g.members.map(map)})),positions:Object.fromEntries(Object.entries(v.positions).map(([k,p])=>[map(k),p])),graphPositions:Object.fromEntries(Object.entries(v.graphPositions).map(([k,p])=>[map(k),p])),viewMode:v.viewMode}};
}
