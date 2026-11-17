'use strict';
// Shared object vocabulary and reading surfaces.
function objectLabel(n){
 if(n.kind==='file')return n.research?researchStateLabel(n):(n.pdfIndex||n.size&&!n.text?'Source':'Note');
 if(n.kind==='task')return n.researchJob?'Research task':({complete:'Complete','in progress':'Running',planned:'Task'})[n.status]||'Task';
 return n.kind==='model'?'Model':'Agent';
}
function nodeState(n){
 if(n.research?.state==='pending')return 'draft';
 if(n.research?.state==='supported')return 'claim';
 if(n.research?.state==='unresolved')return 'unresolved';
 if(n.research?.state==='rejected')return 'rejected';
 if(n.research?.state==='evidence')return 'excerpt';
 return n.kind;
}
const workbenchNode=networkNode;
networkNode=function(n,links){
 let html=workbenchNode(n,links);const state=nodeState(n);
 html=html.replace('signal-node '+n.kind,'signal-node '+n.kind+' subtype-'+state);
 html=html.replace('</text>','<tspan class="node-state-label" x="32" dy="17">'+esc(objectLabel(n))+'</tspan></text>');
 html=html.replace('aria-label="Open '+esc(n.name)+'"','aria-label="Open '+esc(n.name)+' · '+esc(objectLabel(n))+'"');
 return html;
};
const workbenchCamera=applyNetworkCamera;
applyNetworkCamera=function(){workbenchCamera();const svg=$('.knowledge-svg');if(svg)svg.dataset.detail=network.camera.scale>=.8?'full':'compact';};
let readingNode='';
const workbenchInspector=drawInspector;
drawInspector=function(){
 workbenchInspector();const el=$('#space-inspector'),form=$('#studio-editor');if(!el||el.hidden||!form)return;
 const node=data.files.find(f=>f.id===form.dataset.key);if(!node||!node.text)return;
 const body=form.querySelector('textarea[name=text]');if(!body)return;
 if(!el.querySelector('.reader-tabs')){
  form.insertAdjacentHTML('beforebegin','<div class="reader-tabs" role="group" aria-label="Document mode"><button data-reader-mode="read" aria-pressed="true">Read</button><button data-reader-mode="edit" aria-pressed="false">'+(node.research?'Inspect text':'Edit')+'</button></div><section class="source-reader"><h2>'+esc(node.name)+'</h2><span class="state-tag">'+esc(objectLabel({...node,kind:'file'}))+'</span><div class="reader-content">'+esc(node.text)+'</div><button data-reader-original="'+esc(node.id)+'">Open original or text export</button></section>');
  el.dataset.readerMode='read';readingNode=node.id;
 }
};
document.addEventListener('click',event=>{
 const toggle=event.target.closest('[data-reader-mode]');if(toggle){
  (async()=>{if(toggle.dataset.readerMode==='read'&&!await saveEditor())return;const el=$('#space-inspector');if(!el)return;el.dataset.readerMode=toggle.dataset.readerMode;el.querySelectorAll('[data-reader-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===toggle)));const n=data.files.find(f=>f.id===readingNode);if(n){el.querySelector('.reader-content').textContent=n.text;el.querySelector('.source-reader h2').textContent=n.name;}})().catch(report);
 }
 const original=event.target.closest('[data-reader-original]');if(original)(async()=>{const file=data.files.find(f=>f.id===original.dataset.readerOriginal);if(!file)return;const stored=await blob(file.id);download(stored||file.text,stored?.name||file.name+'.txt',stored?.type||'text/plain');})().catch(report);
 if(event.target.closest('[data-community-compose]')){document.querySelector('.community-shell')?.classList.toggle('compose-open');document.querySelector('.compose-open textarea')?.focus();}
});
// Stop scheduling at a workspace boundary; completed checkpoints remain in that workspace.
const workbenchCommand=studioCommand;
studioCommand=async function(action,...args){if(action==='switch-space'&&data?.spaces){deskState().enabled=false;await save();}return workbenchCommand(action,...args);};
const workbenchProfile=activateProfile;
activateProfile=async function(id){if(data?.spaces){deskState().enabled=false;await save();}return workbenchProfile(id);};
const workbenchModal=modal;
modal=function(title,html){workbenchModal(title,html);$('#dialog').classList.toggle('claim-review-dialog',!!$('#claim-review'));};

// Mobile explorer is a sheet, independent of the saved desktop layout preference.
document.addEventListener('click',event=>{
 if(innerWidth>600||!event.target.closest('[data-explorer-toggle]'))return;
 event.stopImmediatePropagation();
 document.documentElement.dataset.mobileExplorer=document.documentElement.dataset.mobileExplorer==='open'?'closed':'open';
 event.target.closest('button').setAttribute('aria-expanded',String(document.documentElement.dataset.mobileExplorer==='open'));
},true);
