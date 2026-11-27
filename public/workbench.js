'use strict';
// Shared object vocabulary and reading surfaces.
function objectLabel(n){
 if(n.kind==='file')return n.research?researchStateLabel(n):productionRole(n.name)||(n.pdfIndex||n.size&&!n.text?'Source':'Note');
 if(n.kind==='task')return ({complete:'Complete','in progress':'Running',planned:'Task',paused:'Paused',blocked:'Blocked',cancelled:'Cancelled'})[n.status]||'Task';
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
 if(network.layout&&network.layout!=='freeform')return atlasNode(n,links);
 let html=workbenchNode(n,links);const state=nodeState(n);
 html=html.replace('signal-node '+n.kind,'signal-node '+n.kind+' subtype-'+state);
 html=html.replace('</text>','<tspan class="node-state-label" x="32" dy="17">'+esc(objectLabel(n))+'</tspan></text>');
 html=html.replace('aria-label="Open '+esc(n.name)+'"','aria-label="Open '+esc(n.name)+' · '+esc(objectLabel(n))+'"');
 return html;
};
const workbenchCamera=applyNetworkCamera;
applyNetworkCamera=function(){const svg=$('.knowledge-svg');if(svg)svg.dataset.detail=network.camera.scale>=.8?'full':'compact';workbenchCamera();};
function readerPassageHtml(file,workspace=false) {
 if(productionRole(file.name)==='Captions'){
  const cues=captionCues(file.text);
  if(cues.length)return '<ol class="caption-sheet">'+cues.map(c=>'<li><time>'+esc(c.start)+'</time><span>'+esc(c.dialogue)+'</span></li>').join('')+'</ol>';
 }
 const notes=new Map();
 for(const item of spaceNodes()){
  if(item.kind!=='file')continue;
  const name=fileNameKey(item.name);
  notes.set(name,notes.has(name)?null:item.id);
 }
 let html='',offset=0;
 for(const match of file.text.matchAll(/\[\[([^\]\n]+)\]\]/g)){
  const [ref,alias]=match[1].split('|'),id=notes.get(fileNameKey(ref.split('#')[0]));
  if(!id||id===file.id)continue;
  // Keep punctuation that follows a link on the same line as the link.
  // A button is an atomic box, so without this "[[Note]]." could wrap and
  // start the next line with a lone full stop.
  const end=match.index+match[0].length,tail=/^[.,;:!?)\]]+/.exec(file.text.slice(end))?.[0]||'';
  const button=workspace?'<button class="reader-reference" data-reading="open" data-id="'+esc(id)+'">'+esc(alias||ref)+'</button>':studioButton('focus',esc(alias||ref),id,'class="reader-reference"');
  html+=esc(file.text.slice(offset,match.index))+(tail?'<span class="reference-glue">'+button+esc(tail)+'</span>':button);
  offset=end+tail.length;
 }
 return html+esc(file.text.slice(offset));
}
let readingNode='';
const workbenchInspector=drawInspector;
drawInspector=function(){
 workbenchInspector();const el=$('#space-inspector'),form=$('#studio-editor');if(!el||el.hidden||!form)return;
 const node=data.files.find(f=>f.id===form.dataset.key);if(!node||!node.text)return;
 const body=form.querySelector('textarea[name=text]');if(!body)return;
 if(!el.querySelector('.reader-tabs')){
  form.insertAdjacentHTML('beforebegin','<div class="reader-tabs" role="group" aria-label="Document mode"><button data-reader-mode="read" aria-pressed="true">Read</button><button data-reader-mode="edit" aria-pressed="false">'+(node.research?'Inspect text':'Edit')+'</button></div><section class="source-reader"><h2>'+esc(node.name)+'</h2><span class="state-tag">'+esc(objectLabel({...node,kind:'file'}))+'</span><div class="reader-content">'+readerPassageHtml(node)+'</div><button data-reader-original="'+esc(node.id)+'">Download source</button></section>');
  el.dataset.readerMode='read';readingNode=node.id;
 }
};
document.addEventListener('click',event=>{
 const toggle=event.target.closest('button[data-reader-mode]');if(toggle){
  (async()=>{if(toggle.dataset.readerMode==='read'&&!await saveEditor())return;const el=$('#space-inspector');if(!el)return;el.dataset.readerMode=toggle.dataset.readerMode;el.querySelectorAll('[data-reader-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===toggle)));const n=data.files.find(f=>f.id===readingNode);if(n){el.querySelector('.reader-content').innerHTML=readerPassageHtml(n);el.querySelector('.source-reader h2').textContent=n.name;}})().catch(report);
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

// Animate a destination once. Editing a field, fetching posts or moving the
// camera also renders the screen and must leave the current view still.
const renderDestination=render;
let lastDestination='';
render=function(){
 renderDestination();
 const stage=document.querySelector('.network-stage');
 const destination=page+'|'+(stage?stage.dataset.layout:activeSpace()?.viewMode||'')+'|'+activeSpace()?.id;
 const changed=lastDestination && lastDestination!==destination;
 lastDestination=destination;
 if(!changed||appearance().motion===false||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const content=document.querySelector('#content');
 const surface=stage?.querySelector('.knowledge-svg')||content.querySelector('.space-stage,.community-feed,.desk-columns,main')||content.firstElementChild;
 const heading=stage?.querySelector('.network-context')||content.querySelector('h1');
 const timing={duration:280,easing:'cubic-bezier(.18,.76,.25,1)'};
 surface?.animate?.([{opacity:.22,translate:'0 8px'},{opacity:1,translate:'0 0'}],timing);
 const guides=stage?.querySelector('.signal-field,.atlas-surface,.flow-columns,.cluster-guides,.orbit-guides');
 if(guides?.classList.contains('signal-field')){
  guides.animate([{clipPath:'inset(0 100% 0 0) fill-box',opacity:.15},{clipPath:'inset(0 0% 0 0) fill-box',opacity:.67}],{...timing,duration:520});
 }else guides?.animate?.([{opacity:0},{opacity:1}],{...timing,duration:360});
 stage?.querySelector('.network-nodes')?.animate?.([{opacity:0},{opacity:1}],{...timing,delay:60,fill:'backwards'});
 heading?.animate?.([{opacity:.12,translate:'-8px 0'},{opacity:1,translate:'0 0'}],{...timing,duration:220});
};
