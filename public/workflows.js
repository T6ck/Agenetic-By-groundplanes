'use strict';
function workflowFilePicker(){
 const input=document.createElement('input');input.type='file';input.multiple=true;
 input.onchange=async()=>{try{await ingest([...input.files],'Vault')}catch(e){report(e)}};input.click();
}
async function currentWorkflowPackage(){
 if(!await saveEditor())throw new Error('Save your edits before exporting.');ensureStudio();
 const exportable = node => !node.research && !node.originTrace &&
  !(node.kind==='file' && /^## Evidence review\n[\s\S]*\n## Critical review\n/.test(node.text||''));
 const all=studioNodes().filter(exportable),selected=new Set(spaceNodes().filter(exportable).map(n=>n.id));
 // Include explicit dependencies so imported agent assignments never dangle.
 let changed=true;while(changed){changed=false;for(const n of all.filter(n=>selected.has(n.id))){const refs=n.kind==='agent'?[...(n.files||[]),n.model]:n.kind==='task'?[n.agent]:[];for(const id of refs)if(id&&!selected.has(id)&&all.some(n=>n.id===id)){selected.add(id);changed=true}}}
 const nodes=[];let bytes=0;
 for(const n of all.filter(n=>selected.has(n.id))){let r={id:n.id,kind:n.kind,name:n.name};
 if(n.kind==='file'){r.text=n.text||'';r.size=n.size||0;const original=await blob(n.id);if(original){bytes+=original.size;if(bytes>10000000)throw new Error('This workflow has more than 10 MB of original attachments. Split the workspace before exporting; no files have been omitted.');const raw=new Uint8Array(await original.arrayBuffer());let binary='';for(let i=0;i<raw.length;i+=8192)binary+=String.fromCharCode(...raw.subarray(i,i+8192));r.attachment={base64:btoa(binary),type:original.type||'application/octet-stream'}}else if(!r.text&&r.size)throw new Error('Original file unavailable: '+n.name+'. Restore it before exporting this workflow.');}
 if(n.kind==='agent')Object.assign(r,{role:n.role||'',task:n.task||'',files:(n.files||[]).filter(id=>selected.has(id)),model:n.model||''});
 if(n.kind==='task')Object.assign(r,{description:n.description||'',agent:n.agent||''});
 if(n.kind==='model'){r.size=n.size||0;if(n.source)r.source=structuredClone(n.source);}nodes.push(r)}
 const s=activeSpace(),positions=source=>Object.fromEntries(Object.entries(source||{}).filter(([id])=>selected.has(id)));
 return readPackage({format:'agenetic/1',kind:'workflow',name:s.name.slice(0,80),version:'1.0.0',description:'Complete research workflow from '+s.name.slice(0,80)+'. Review the included documents and instructions before importing.',payload:{nodes,links:data.links.filter(l=>selected.has(l.from)&&selected.has(l.to)).map(({from,to})=>({from,to})),groups:(s.groups||[]).map(g=>({name:g.name,members:g.members.filter(id=>selected.has(id))})),positions:positions(s.positions),graphPositions:positions(s.graphPositions),viewMode:s.viewMode||'graph'}});
}
async function workflowDialog(){
 modal('Take your workflow with you.','<span class="section-kicker">EXPORT / SHARE</span><p>Export this workspace with its notes, original files, agent instructions, steps, connections, groups, and layout.</p><p>Model registrations travel as references. Model weights, runner credentials, your identity, and appearance settings stay on this device. Saved research results and claim reviews stay local. Imported steps start as planned.</p><div class="workflow-actions"><button data-workflow-review>Review full workflow</button><label class="exchange-upload">Import workflow<input type="file" id="workflow-file" accept=".json,application/json"></label></div><p class="policy-detail">Local workflow packages support up to 16 MB of JSON and 10 MB of original attachments. Community posts support up to 1.8 MB of JSON; a larger package can still be downloaded and shared as a file. Nothing is silently omitted.</p>');
 document.querySelector('[data-workflow-review]').onclick=async()=>{try{const p=await currentWorkflowPackage();try{const r=await fetch('/api/session',{cache:'no-store'});if(r.ok)Object.assign(community,await r.json())}catch{}await previewPackage(p)}catch(e){report(e)}};
 document.querySelector('#workflow-file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>16000000)throw new Error('Choose a workflow JSON file under 16 MB.');const p=await readPackage(await f.text());if(p.kind!=='workflow')throw new Error('Choose an Agenetic workflow package.');await previewPackage(p)}catch(err){report(err)}};
}
async function importWorkflowPackage(p){
 const {restoreWorkflow}=await import('./workflow-schema.mjs');const imported=restoreWorkflow(p.payload,()=>crypto.randomUUID());
 const originals=[];for(const n of imported.nodes)if(n.attachment){const bytes=Uint8Array.from(atob(n.attachment.base64),c=>c.charCodeAt(0));originals.push([n.record.id,new Blob([bytes],{type:n.attachment.type})])}
 const previous=structuredClone(data);try{for(const n of imported.nodes)data[{file:'files',agent:'agents',task:'tasks',model:'models'}[n.kind]].push(n.record);data.links.push(...imported.links);data.spaces.push({...imported.space,name:p.name});data.activeSpace=imported.space.id;data.additions??=[];data.additions.push({kind:'workflow',name:p.name,version:p.version,author:'Imported package',installedAt:Date.now()});await save(originals)}catch(e){data=previous;throw e}
 network.space=null;network.positions.clear();network.signature='';network.focus=null;network.search='';network.needFit=true;studio.selected.clear();studio.inspector=false;studio.initialized=false;$('#dialog').close();page='Overview';render();toast('Workflow imported into a new workspace. Nothing has run.');
}
