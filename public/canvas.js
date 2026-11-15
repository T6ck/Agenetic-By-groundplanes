'use strict';
const originalRender = render;
const studio = {
  selected: new Set(), inspector: false, library: false, connecting: null,
  view: {x: 0, y: 0, scale: 0.85}, gesture: null, history: [], future: [],
  dirty: false, frame: 0, suppressClick: false, initialized: false
};
const symbols = {file:'▤', agent:'◈', task:'→', model:'◇'};
function studioNodes() {
  return [...data.files.map(n=>({...n,kind:'file'})), ...data.agents.map(n=>({...n,kind:'agent'})),
    ...data.models.map(n=>({...n,kind:'model'})), ...(data.tasks||[]).map(n=>({...n,kind:'task'}))];
}
function activeSpace() { return data.spaces.find(s=>s.id===data.activeSpace)||data.spaces[0]; }
function spaceNodes() {
  const space=activeSpace();
  return studioNodes().filter(n=>(space.id==='home'?(data.profile?.demo||!n.sample):space.members.includes(n.id))&&!(space.hidden||[]).includes(n.id));
}
function nodePosition(id) { return activeSpace().positions[id]||[100,100]; }
function ensureStudio() {
  data.tasks??=[];data.links??=[];
  data.spaces??=[{id:'home',name:'My mindspace',members:[],positions:{},groups:[]}];
  data.activeSpace??='home';
  if(!data.legacySamplesSeparated){const samples=studioNodes().filter(n=>n.sample&&!data.spaces.some(s=>s.id!=='home'&&s.members.includes(n.id)));if(samples.length)data.spaces.push({id:crypto.randomUUID(),name:'Starter examples',members:samples.map(n=>n.id),positions:{},groups:[]});data.legacySamplesSeparated=true;}
  const example=data.spaces.find(s=>s.id===data.exampleSpaceId);
  if(example?.name==='Dendral · Example')example.name='Agenetic · Example';
  const space=activeSpace();space.groups??=[];space.positions??={};
  const nodes=spaceNodes();
  const counts=new Map();
  for(const [i,n] of nodes.entries()) {
    const same=counts.get(n.kind)||0;
    counts.set(n.kind,same+1);
    if(space.positions[n.id])continue;
    const layouts={file:[100+(same%2)*310,130+Math.floor(same/2)*280],agent:[850,130+same*280],task:[1240,130+same*280],model:[850,-170+same*280]};
    space.positions[n.id]=space.id==='home'?(data.positions?.[n.id]||layouts[n.kind]):[100+(i%3)*310,130+Math.floor(i/3)*280];
  }
  if(!studio.initialized){studio.initialized=true;if(space.camera)studio.view={...space.camera};}
}
function studioButton(action,label,id='',extra='') {
  return '<button type="button" data-command="'+action+'" data-key="'+esc(id)+'" '+extra+'>'+label+'</button>';
}
function studioLinks() {
  const ids=new Set(spaceNodes().map(n=>n.id));
  const links=data.links.map(l=>({...l,kind:'reference'}));
  for(const a of data.agents) {
    for(const id of a.files)links.push({from:id,to:a.id,kind:'context'});
    if(a.model)links.push({from:a.model,to:a.id,kind:'model'});
  }
  for(const t of data.tasks)if(t.agent)links.push({from:t.agent,to:t.id,kind:'assignment'});
  return links.filter(l=>ids.has(l.from)&&ids.has(l.to));
}
function connectionKey(l) { return [l.from,l.to,l.kind].join('|'); }
function edgePath(l) {
  const [x,y]=nodePosition(l.from),[u,v]=nodePosition(l.to);
  const right=u>=x, start=x+(right?250:0), end=u+(right?0:250), bend=Math.max(70,Math.abs(end-start)*.45);
  return 'M '+start+' '+(y+95)+' C '+(start+(right?bend:-bend))+' '+(y+95)+' '+(end+(right?-bend:bend))+' '+(v+95)+' '+end+' '+(v+95);
}
function cardMarkup(n) {
  const [x,y]=nodePosition(n.id),selected=studio.selected.has(n.id);
  const description=n.kind==='agent'?n.task:n.kind==='task'?n.description:n.kind==='model'?'Local model file':n.text||'Add a thought, a reference, or a question…';
  const status=n.kind==='agent'?(n.model?'Model assigned':'Needs a model'):n.kind==='task'?(n.status||'planned'):n.sample?'Example':n.kind==='model'?'GGUF':'Local note';
  return '<article class="mind-card '+n.kind+(selected?' is-selected':'')+'" data-card="'+esc(n.id)+'" style="--card-x:'+x+'px;--card-y:'+y+'px" tabindex="0" aria-label="'+esc(n.name)+'"><div class="card-header"><span class="card-symbol">'+symbols[n.kind]+'</span><span>'+({file:'Knowledge',agent:'Agent',task:'Workflow step',model:'Model'}[n.kind])+'</span><span class="card-menu">⋯</span></div><h2>'+esc(n.name.replace(/\.md$/,''))+'</h2><div class="card-preview">'+esc(description.replace(/^#+\s/gm,'').slice(0,170))+'</div><div class="card-bottom"><span class="state-dot"></span>'+esc(status)+'<button type="button" class="connection-port" data-command="connect" data-key="'+esc(n.id)+'" aria-label="Connect '+esc(n.name)+'">＋</button></div></article>';
}
function groupMarkup(g) {
  const members=g.members.filter(id=>spaceNodes().some(n=>n.id===id));if(!members.length)return '';
  const points=members.map(nodePosition),x=Math.min(...points.map(p=>p[0]))-25,y=Math.min(...points.map(p=>p[1]))-55;
  const width=Math.max(...points.map(p=>p[0]))-x+275,height=Math.max(...points.map(p=>p[1]))-y+242;
  return '<section class="mind-group" data-group="'+esc(g.id)+'" style="left:'+x+'px;top:'+y+'px;width:'+width+'px;height:'+height+'px"><div class="group-handle" data-group-drag="'+esc(g.id)+'"><span>'+esc(g.name)+'</span>'+studioButton('ungroup','×',g.id,'aria-label="Ungroup '+esc(g.name)+'"')+'</div></section>';
}
render=function() {
  if(page!=='Overview'&&page!=='Graph') {
    document.body.classList.remove('mindspace');originalRender();
    $('#content').insertAdjacentHTML('afterbegin','<div class="return-to-space">'+studioButton('home','← Back to mindspace')+'</div>');return;
  }
  ensureStudio();document.body.classList.add('mindspace');document.body.classList.remove('studio','immersive');
  const space=activeSpace(),nodes=spaceNodes();
  $('#content').innerHTML='<div class="space-stage" tabindex="-1" aria-label="Mindspace canvas"><div class="space-world"><div class="group-layer">'+space.groups.map(groupMarkup).join('')+'</div><svg class="connection-layer" aria-label="Connections"><defs><marker id="edge-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M 0 0 L 10 5 L 0 10" fill="currentColor"/></marker></defs><g>'+studioLinks().map(l=>'<path data-edge="'+esc(connectionKey(l))+'" class="edge '+l.kind+'" d="'+edgePath(l)+'" marker-end="url(#edge-arrow)"/>').join('')+'</g></svg><div class="card-layer">'+nodes.map(cardMarkup).join('')+'</div></div><div class="selection-box" hidden></div></div>'+
  '<header class="space-header"><div class="brand-orbit" aria-label="Agenetic"><span>⋈</span><strong>dendral</strong></div><span class="header-divider"></span><button class="space-switcher" data-command="spaces">'+esc(space.name)+' <span>⌄</span></button><div class="header-right"><span class="local-indicator"><i></i> On this device</span>'+studioButton('search','⌕','', 'aria-label="Search mindspace" title="Search · Ctrl K"')+studioButton('share','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V3m-4 4 4-4 4 4M4 13v8h16v-8"/></svg>','', 'aria-label="Export workflow"')+'</div></header>'+
  '<div class="space-caption"><span>WORKSPACE</span><h1>'+esc(space.name)+'</h1><p>'+ (nodes.length?'A place for connected thought.':'Start with a note. Give it room to grow.')+'</p></div>'+
  '<div class="space-dock">'+studioButton('library','▥<span>Library</span>','', 'title="Browse your knowledge"')+'<i></i>'+studioButton('note','▤<span>Note</span>','', 'title="New note · N"')+studioButton('agent','◈<span>Agent</span>')+studioButton('task','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18 18 5M7 5h11v11"/></svg><span>Step</span>')+'<i></i>'+studioButton('run-batch','<span>Run tasks</span>')+studioButton('group','⊞<span>Group</span>','', 'title="Group selected cards · Ctrl G"')+studioButton('fit','⌗<span>Fit</span>','', 'title="Fit canvas · F"')+'</div>'+
  '<div class="space-footer"><span id="space-hint">Drag to explore · Scroll to zoom · Shift-drag to select</span><div>'+studioButton('undo','↶','', 'aria-label="Undo" '+(!studio.history.length?'disabled':''))+studioButton('redo','↷','', 'aria-label="Redo" '+(!studio.future.length?'disabled':''))+studioButton('zoomout','−','', 'aria-label="Zoom out"')+'<span id="zoom-value"></span>'+studioButton('zoomin','＋','', 'aria-label="Zoom in"')+'</div></div>'+
  '<aside id="space-library" '+(!studio.library?'hidden':'')+'></aside><aside id="space-inspector" '+(!studio.inspector?'hidden':'')+'></aside><div id="connect-banner" '+(!studio.connecting?'hidden':'')+'>Select another card to connect'+studioButton('cancel','Cancel')+'</div>';
  applyCamera();drawLibrary();drawInspector();
  if(!space.camera&&!studio.fitted){studio.fitted=true;requestAnimationFrame(fitSpace);}
  if(!nodes.length)$('#space-hint').textContent='N creates a note · Files can be dropped onto the canvas';
};
function applyCamera() {
  const world=$('.space-world');if(!world)return;
  const {x,y,scale}=studio.view;world.style.transform='translate('+x+'px,'+y+'px) scale('+scale+')';
  $('.space-stage').style.backgroundPosition=x+'px '+y+'px';
  $('.space-stage').style.backgroundSize=(28*scale)+'px '+(28*scale)+'px';
  $('#zoom-value').textContent=Math.round(scale*100)+'%';
}
function updateGeometry() {
  for(const el of document.querySelectorAll('[data-card]')) {
    const p=nodePosition(el.dataset.card);el.style.setProperty('--card-x',p[0]+'px');el.style.setProperty('--card-y',p[1]+'px');
    el.classList.toggle('is-selected',studio.selected.has(el.dataset.card));
  }
  const links=studioLinks();for(const el of document.querySelectorAll('[data-edge]')) {
    const link=links.find(l=>connectionKey(l)===el.dataset.edge);if(link)el.setAttribute('d',edgePath(link));
  }
  $('.group-layer').innerHTML=activeSpace().groups.map(groupMarkup).join('');
}
function drawLibrary(query='') {
  const el=$('#space-library');if(!el)return;
  const nodes=studioNodes().filter(n=>[n.name,n.text,n.task,n.description].join(' ').toLowerCase().includes(query.toLowerCase()));
  el.innerHTML='<div class="floating-heading"><h2>Library</h2>'+studioButton('close-library','×','', 'aria-label="Close library"')+'</div><input id="library-search" type="search" placeholder="Search everything…" value="'+esc(query)+'" aria-label="Search library"><div class="library-list">'+['file','agent','task','model'].map(kind=>'<div class="library-label">'+({file:'Knowledge',agent:'Agents',task:'Workflow steps',model:'Models'}[kind])+'</div>'+nodes.filter(n=>n.kind===kind).map(n=>'<button data-command="focus" data-key="'+esc(n.id)+'"><span>'+symbols[kind]+'</span><strong>'+esc(n.name)+'</strong><span>↗</span></button>').join('')).join('')+'</div><div class="library-actions">'+studioButton('import','Import files')+studioButton('runtime','Local runtime')+'</div>';
}
function drawInspector() {
  const el=$('#space-inspector');if(!el)return;
  const n=studioNodes().find(n=>n.id===[...studio.selected][0]);
  if(!studio.inspector||!n){el.hidden=true;return}el.hidden=false;
  const links=studioLinks().filter(l=>l.from===n.id||l.to===n.id);
  let fields='';
  if(n.kind==='file')fields='<label>Content<textarea name="text" '+(n.text===undefined?'disabled':n.research?'readonly':'')+'>'+esc(n.text??'Binary file. Open the original from the file vault.')+'</textarea></label>';
  if(n.kind==='agent')fields='<label>Role<input name="role" required value="'+esc(n.role)+'"></label><label>Instructions<textarea name="task" required maxlength="5000">'+esc(n.task)+'</textarea></label><label>Model<select name="model" aria-label="Model"><option value="">Choose a local model</option>'+data.models.map(m=>'<option value="'+esc(m.id)+'" '+(n.model===m.id?'selected':'')+'>'+esc(m.name)+'</option>').join('')+'</select></label>';
  if(n.kind==='task')fields='<label>Task<textarea name="description" required maxlength="5000">'+esc(n.description)+'</textarea></label><label>Assigned agent<select name="agent" aria-label="Assigned agent"><option value="">Choose an agent</option>'+data.agents.map(a=>'<option value="'+esc(a.id)+'" '+(n.agent===a.id?'selected':'')+'>'+esc(a.name)+'</option>').join('')+'</select></label><label>Status<select name="status" aria-label="Status">'+['planned','in progress','complete'].map(s=>'<option '+(n.status===s?'selected':'')+'>'+s+'</option>').join('')+'</select></label>';
  el.innerHTML='<div class="floating-heading"><span class="inspector-type">'+symbols[n.kind]+' '+n.kind+'</span>'+studioButton('close-inspector','×','', 'aria-label="Close inspector"')+'</div><form id="studio-editor" data-key="'+esc(n.id)+'"><input class="editor-title" name="name" aria-label="Title" value="'+esc(n.name)+'" maxlength="120" required>'+fields+'<div class="editor-save"><span id="editor-status">Saved locally</span><button type="submit" class="save-button">Save</button></div></form>'+(n.kind==='agent'?'<div class="inspector-actions">'+studioButton('run-agent','Run a task ↗',n.id)+'</div>':'')+(n.kind==='task'?'<div class="inspector-actions">'+studioButton('run-step','Run with agent ↗',n.id)+'</div>':'')+'<div class="inspector-section">Connections <span>'+links.length+'</span></div>'+links.map(l=>{const other=studioNodes().find(x=>x.id===(l.from===n.id?l.to:l.from));return '<div class="inspector-link">'+studioButton('focus',esc(other.name),other.id)+'<small>'+(l.kind==='wikilink'?(l.from===n.id?'Links to':'Linked from'):l.kind==='context'?'Agent context':l.kind==='assignment'?'Assigned agent':l.kind==='model'?'Model':'Reference')+'</small>'+studioButton('unlink','×',connectionKey(l),'aria-label="Disconnect '+esc(other.name)+'"')+'</div>'}).join('')+'<div class="inspector-actions">'+studioButton('connect','＋ Connect',n.id)+studioButton('remove','Remove from space',n.id)+'</div>'+(n.output?'<div class="inspector-section">Last output</div><pre class="output">'+esc(n.output)+'</pre>':'');
  if (n.kind==='file' && n.research) {
   const state = n.research.state;
   const files = new Map(workspaceSourceFiles().map(file=>[file.id,file]));
   const ready = researchSourceReady(n,files);
   const label = ready ? (state==='supported'?'Reviewed claim':'Exact evidence') :
    ({pending:'Draft · needs claim review',rejected:'Claim rejected',unresolved:'Needs evidence'}[state]||'Evidence unavailable or superseded');
   el.insertAdjacentHTML('beforeend','<div class="inspector-section">'+esc(label)+'</div><div class="inspector-actions">'+
    (state==='pending'?studioButton('review-research','Review claims',n.id):ready?studioButton('branch-research','Create next step',n.id):'')+'</div>');
  }
  studio.dirty=false;
}
async function commitStudio(mutator) {
  const before=structuredClone(data);
  mutator();
  try { await save();studio.history.push(before);studio.history=studio.history.slice(-30);studio.future=[];render();return true; }
  catch(error){data=before;toast('Could not save. Your previous state was restored.');render();return false;}
}
async function saveEditor() {
  if(!studio.dirty)return true;
  const form=$('#studio-editor');if(!form)return true;
  if(!form.reportValidity())return false;
  const values=new FormData(form),id=form.dataset.key;
  const n=[...data.files,...data.agents,...data.models,...data.tasks].find(n=>n.id===id);if(!n)return false;
  const before=structuredClone(data);
  const title=String(values.get('name')||'').trim();if(!title){toast('Give this item a name.');return false}n.name=title;
  for(const key of ['text','role','task','model','description','agent','status'])if(values.has(key)&&!(key==='text'&&n.research))n[key]=values.get(key);
  if(n.text!==undefined)n.size=new Blob([n.text]).size;
  n.sample=false;
  try{await save();studio.history.push(before);studio.future=[];studio.dirty=false;return true}
  catch{data=before;toast('Could not save your changes.');return false}
}
function centerPoint() {
  const stage=$('.space-stage').getBoundingClientRect();
  return [(stage.width/2-studio.view.x)/studio.view.scale-125,(stage.height/2-studio.view.y)/studio.view.scale-105];
}
async function createNode(kind) {
  if(!await saveEditor())return;
  const id=crypto.randomUUID(),position=centerPoint();
  const selected=[...studio.selected][0];
  if(selected){const origin=nodePosition(selected);position[0]=origin[0]+330;position[1]=origin[1];}
  while(spaceNodes().some(n=>{const p=nodePosition(n.id);return Math.abs(p[0]-position[0])<260&&Math.abs(p[1]-position[1])<220}))position[1]+=250;
  await commitStudio(()=>{
    if(kind==='file')data.files.push({id,name:'Untitled note',text:'',size:0});
    if(kind==='agent')data.agents.push({id,name:'New agent',role:'',task:'',files:[],model:''});
    if(kind==='task')data.tasks.push({id,name:'New workflow step',description:'',agent:'',status:'planned'});
    activeSpace().members.push(id);activeSpace().positions[id]=position;
    studio.selected=new Set([id]);studio.inspector=true;
  });
  $('#studio-editor [name="name"]')?.focus();$('#studio-editor [name="name"]')?.select();
}
async function selectNode(id,extend=false) {
  if(!await saveEditor())return;
  if(studio.connecting){await connectStudio(id);return}
  if(extend){if(studio.selected.has(id))studio.selected.delete(id);else studio.selected.add(id)}else studio.selected=new Set([id]);
  studio.inspector=studio.selected.size===1;updateGeometry();drawInspector();
}
async function connectStudio(to) {
  const from=studio.connecting;studio.connecting=null;if(from===to){render();return}
  await commitStudio(()=>{
    const agent=data.agents.find(n=>n.id===from)||data.agents.find(n=>n.id===to);
    const other=agent?(agent.id===from?to:from):null;
    const task=data.tasks.find(n=>n.id===other);
    if(agent&&data.files.some(n=>n.id===other)){if(!agent.files.includes(other))agent.files.push(other)}
    else if(agent&&data.models.some(n=>n.id===other))agent.model=other;
    else if(agent&&task)task.agent=agent.id;
    else if(!data.links.some(l=>(l.from===from&&l.to===to)||(l.from===to&&l.to===from)))data.links.push({from,to});
  });
}
async function unlinkStudio(key) {
  const [from,to,kind]=key.split('|');
  await commitStudio(()=>{
    if(kind==='context'){const a=data.agents.find(n=>n.id===to);if(a)a.files=a.files.filter(id=>id!==from)}
    if(kind==='model'){const a=data.agents.find(n=>n.id===to);if(a)a.model=''}
    if(kind==='assignment'){const t=data.tasks.find(n=>n.id===to);if(t)t.agent=''}
    if(kind==='reference')data.links=data.links.filter(l=>l.from!==from||l.to!==to);
  });
}
function fitSpace() {
  const nodes=spaceNodes();if(!nodes.length){studio.view={x:0,y:0,scale:1};applyCamera();return}
  const points=nodes.map(n=>nodePosition(n.id)),bounds=$('.space-stage').getBoundingClientRect();
  const minX=Math.min(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1]));
  const width=Math.max(...points.map(p=>p[0]))-minX+250,height=Math.max(...points.map(p=>p[1]))-minY+210;
  const scale=Math.max(.15,Math.min(1,(bounds.width-180)/width,(bounds.height-300)/height));
  studio.view={x:(bounds.width-width*scale)/2-minX*scale,y:150+(bounds.height-300-height*scale)/2-minY*scale,scale};applyCamera();persistCamera();
}
function persistCamera() { activeSpace().camera={...studio.view};save().catch(report); }
function zoomAt(factor,x,y) {
  const old=studio.view,scale=Math.max(.15,Math.min(2.5,old.scale*factor));
  studio.view={x:x-(x-old.x)*scale/old.scale,y:y-(y-old.y)*scale/old.scale,scale};applyCamera();
}
function showSpaces() {
  modal('Your spaces','<div class="space-list">'+data.spaces.map(s=>studioButton('switch-space',esc(s.name)+' <span>↗</span>',s.id)).join('')+'</div><form id="new-space"><label class="field">New space<input name="name" placeholder="e.g. Product research" maxlength="80" required></label><button class="primary">Create space</button></form>');
}
async function groupSelection() {
  if(studio.selected.size<2){toast('Shift-click cards or Shift-drag a selection, then group them.');return}
  modal('Group selected cards','<form id="new-group"><label class="field">Group name<input name="name" placeholder="Research, planning, or a workflow…" required maxlength="80"></label><button class="primary">Create group</button></form>');
}
function evidenceWorkflow(target){
 const space = activeSpace();
 const members = new Set(space.members);
 const hidden = new Set(space.hidden || []);
 const tasks = new Map(data.tasks.filter(task => !hidden.has(task.id) &&
  (space.id === 'home' ? data.profile?.demo || !task.sample : members.has(task.id))).map(task => [task.id, task]));
 const upstream = new Map();
 for (const {from, to} of data.links || []) {
  if (!tasks.has(from) || !tasks.has(to)) continue;
  if (!upstream.has(to)) upstream.set(to, []);
  upstream.get(to).push(from);
 }
 const visiting = new Set(), completed = new Set(), ordered = [];
 function visit(id){
  if (completed.has(id)) return;
  if (visiting.has(id)) throw new Error('Remove the circular connection between workflow steps.');
  if (!tasks.has(id)) throw new Error('Open the workspace containing this step.');
  if (visiting.size + completed.size >= 32) throw new Error('This batch exceeds the 32-step run limit. Choose fewer targets.');
  visiting.add(id);
  for (const dependency of upstream.get(id) || []) visit(dependency);
  visiting.delete(id);
  completed.add(id);
  ordered.push(tasks.get(id));
 }
 for (const id of Array.isArray(target)?target:[target]) visit(id);
 return ordered;
}

async function executeStep(id){
 if (!await saveEditor()) return;
 if (running) {toast('A local task is already running.');return;}
 const tasks=spaceNodes().filter(node=>node.kind==='task');
 const task=tasks.find(item=>item.id===id);
 const draftAgent = data.agents.find(agent => agent.id === task?.agent);
 const picked = new Set(id?[id]:[...studio.selected]);
 const list = tasks.map(item=>'<label><input type="checkbox" name="targets" value="'+esc(item.id)+'" '+
  (picked.has(item.id)?'checked':'')+'> '+esc(item.name)+'</label>').join('');
 modal(esc(task?.name||'Run research tasks'), '<p>Choose one or more targets. Prerequisites run once in arrow order. Finished evidence is saved into the graph. Independent branches continue if a step gets blocked.</p>'+
  '<fieldset id="step-targets"><legend>Tasks to run</legend>'+(list||'<p>Add a workflow step first.</p>')+'</fieldset>'+
  '<label class="setup-check"><input type="checkbox" id="step-follow"> Follow one hop from connected notes</label>'+
  '<div class="actions"><button type="button" class="primary" id="step-run">Run evidence workflow</button>'+
  '<button type="button" id="step-stop" hidden>Stop after current step</button>'+
  (draftAgent?'<button type="button" id="step-draft">Open model draft</button>':'')+
  '</div><p id="step-status" role="status"></p><div id="step-output"></div>');
 const button = $('#step-run'), status = $('#step-status'), output = $('#step-output');
 const dialog = $('#dialog'), stop = $('#step-stop'), draft = $('#step-draft');
 if (draft) draft.onclick = () => {if (!running) showAgent(draftAgent, data.tasks.find(item=>item.id===id));};
 const workspace = activeSpace().id, record = data;
 let stopping = false;
 stop.onclick = () => {stopping=true;stop.disabled=true;status.textContent='Stopping after the current step…';};
 button.onclick = async () => {
  if (running) {status.textContent = 'Wait for the active run.';return;}
  const targets = [...$('#step-targets').querySelectorAll('input:checked')].map(input=>input.value);
  if (!targets.length) {status.textContent='Choose at least one task.';return;}
  let steps;
  try {steps = evidenceWorkflow(targets);}
  catch (error) {status.textContent=error.message;return;}
  const follow = $('#step-follow').checked;
  const results = [], blocked = new Set(), ordered = new Set(steps.map(item=>item.id));
  stopping=false;
  running = true;
  button.disabled = true;
  stop.hidden=false;
  stop.disabled=false;
  output.innerHTML='';
  const display = () => {output.innerHTML = results.map(result=>
   '<details '+(result.error?'open':'')+'><summary>'+esc(result.title)+'</summary><pre class="output">'+esc(result.text)+'</pre>'+
   (result.node?studioButton('branch-research','Create next step',result.node):'')+'</details>').join('');};
  try {
   for (const item of steps) {
    if (stopping || !dialog.open || !button.isConnected || data !== record || activeSpace().id !== workspace) break;
    status.textContent = 'Checking evidence for '+item.name+'…';
    try {
     if ((data.links||[]).some(link=>link.to===item.id&&ordered.has(link.from)&&blocked.has(link.from))) {
      throw new Error('Waiting for an upstream step.');
     }
     const agent = data.agents.find(candidate => candidate.id === item.agent);
     if (!agent) throw new Error('Assign an agent before continuing.');
     const fileMap = new Map(workspaceSourceFiles().map(file=>[file.id,file]));
     const approved = [...fileMap.values()].find(file=>file.research?.step===item.id&&file.research.state==='supported'&&file.research.stepTask===item.description
      && (data.links||[]).some(link=>link.from===item.id&&link.to===file.id)&&researchSourceReady(file,fileMap));
     if (approved) {results.push({title:item.name+' · reviewed claim',text:approved.text,node:approved.id});display();continue;}
     const scope = agentSourceScope(agent, item, follow || agent.followLinkedNotes);
     const sourceIds = new Set(scope.files);
     const pdfFailures = await indexSavedPdfs(workspaceSourceFiles().filter(file=>sourceIds.has(file.id)));
     if (data!==record || activeSpace().id!==workspace) break;
     const selection = selectContext(scope, item.description || agent.task, true);
     if (!selection.quotes?.length) throw new Error(pdfFailures[0] || 'No matching evidence. Attach a relevant source or review a claim for this step.');
     const result = await saveAgentEvidence(agent, item.description || agent.task, selection, scope, item);
     results.push({title:item.name+(result.reused?' · reused':' · added to graph'),text:result.output,node:result.node});
    } catch (error) {
     blocked.add(item.id);
     results.push({title:item.name+' · blocked',text:error.message,error:true});
    }
    display();
   }
   status.textContent=results.length+' / '+steps.length+' checked · '+blocked.size+' blocked'+(results.length<steps.length?' · stopped':'');
   render();
  } finally {
   running = false;
   button.disabled = false;
   stop.hidden=true;
  }
 };
}

function branchResearch(id){
 if (running) {toast('Wait for the current workflow to finish.');return;}
 const files=new Map(workspaceSourceFiles().map(file=>[file.id,file]));
 const source=files.get(id);
 if (!researchSourceReady(source,files)) {toast('Review the research or restore its supporting evidence before branching.');return;}
 const workspace=activeSpace().id, record=data;
 modal('Branch from research','<p>'+esc(source.name)+'</p><form id="branch-research-form">'+
  '<label class="field">Step name<input name="name" maxlength="120" required></label>'+
  '<label class="field">Next research task<textarea name="task" maxlength="5000" required></textarea>'+
  '<button type="submit" class="primary">Create connected step</button></form>');
 $('#branch-research-form').onsubmit=async event=>{
  event.preventDefault();
  if (data!==record||activeSpace().id!==workspace||running) return;
  const values=new FormData(event.target),name=values.get('name').trim(),description=values.get('task').trim();
  if (!name||!description) return;
  const item={id:crypto.randomUUID(),name,description,agent:source.research?.agent||'',status:'planned'};
  if (await commitStudio(()=>{
   data.tasks.push(item);
   activeSpace().members.push(item.id);
   data.links.push({from:source.id,to:item.id});
   const ancestor=source.research?.step;
   if (ancestor && spaceNodes().some(node=>node.id===ancestor&&node.kind==='task')) data.links.push({from:ancestor,to:item.id});
  })) {
   $('#dialog').close();
   studio.selected=new Set([item.id]);
   studio.inspector=true;
   render();
  }
 };
}

async function studioCommand(action,id) {
  if(!await saveEditor())return;
  if(action==='home'){page='Overview';render();return}
  if(action==='note'||action==='agent'||action==='task')return createNode({note:'file',agent:'agent',task:'task'}[action]);
  if(action==='library'||action==='search'){studio.library=true;render();$('#library-search').focus();return}
  if(action==='close-library'){studio.library=false;render();return}
  if(action==='close-inspector'){studio.inspector=false;studio.selected.clear();render();return}
  if(action==='spaces')return showSpaces();
  if(action==='switch-space'){data.activeSpace=id;studio.selected.clear();studio.inspector=false;studio.view=activeSpace().camera||{x:0,y:0,scale:.85};$('#dialog').close();await save();render();return}
  if(action==='focus'){
    if(!spaceNodes().some(n=>n.id===id))await commitStudio(()=>{activeSpace().hidden=(activeSpace().hidden||[]).filter(n=>n!==id);activeSpace().members.push(id);activeSpace().positions[id]=centerPoint()});
    studio.selected=new Set([id]);studio.inspector=true;const [x,y]=nodePosition(id),bounds=$('.space-stage').getBoundingClientRect();
    studio.view.x=bounds.width/2-(x+125)*studio.view.scale;studio.view.y=bounds.height/2-(y+105)*studio.view.scale;render();return;
  }
  if(action==='connect'){studio.connecting=id;studio.inspector=false;render();return}
  if(action==='cancel'){studio.connecting=null;render();return}
  if(action==='unlink'){if(await confirmRemoval('Disconnect these items?','This removes the selected connection. It may change which context an agent can use. You can undo this canvas change.','Disconnect'))return unlinkStudio(id);return;}
  if(action==='fit')return fitSpace();
  if(action==='zoomin'||action==='zoomout'){const b=$('.space-stage').getBoundingClientRect();zoomAt(action==='zoomin'?1.2:1/1.2,b.width/2,b.height/2);persistCamera();return}
  if(action==='group')return groupSelection();
  if(action==='ungroup'){if(!await confirmRemoval('Ungroup these cards?','The group boundary is removed. The cards and their contents stay in your workspace.','Ungroup'))return;return commitStudio(()=>{activeSpace().groups=activeSpace().groups.filter(g=>g.id!==id)});}
  if(action==='undo'||action==='redo'){
    const source=action==='undo'?studio.history:studio.future,target=action==='undo'?studio.future:studio.history;
    if(!source.length)return;const previous=structuredClone(data),next=source.pop();data=next;
    try{await save();target.push(previous);studio.selected.clear();studio.inspector=false;render()}catch{data=previous;source.push(next);toast('Could not save this change.')}return;
  }
  if(action==='remove'){
    if(!await confirmRemoval('Remove '+(studioNodes().find(n=>n.id===id)?.name||'this item')+' from this space?','The item remains in your local library. Only its placement in this space is removed. Use Undo to restore it.','Remove from space'))return;
    return commitStudio(()=>{activeSpace().hidden??=[];activeSpace().hidden.push(id);activeSpace().members=activeSpace().members.filter(n=>n!==id);studio.selected.clear();studio.inspector=false});
  }
  if(action==='import')return workflowFilePicker();
  if(action==='runtime')return act('go','Models');
  if(action==='share')return workflowDialog();
  if(action==='run-agent')return act('agent',id);
  if(action==='run-step')return executeStep(id);
  if(action==='run-batch')return executeStep();
  if(action==='branch-research')return branchResearch(id);
  if(action==='review-research')return act('file',id);
}
document.addEventListener('click',e=>{
  const command=e.target.closest('[data-command]');if(command){studioCommand(command.dataset.command,command.dataset.key).catch(report);return}
  if(studio.suppressClick)return;
  const card=e.target.closest('[data-card]');if(card)selectNode(card.dataset.card,e.shiftKey).catch(report);
});
document.addEventListener('input',e=>{
  if(e.target.closest('#studio-editor')){studio.dirty=true;$('#editor-status').textContent='Unsaved changes';}
  if(e.target.id==='library-search'){
    const query=e.target.value;const position=e.target.selectionStart;drawLibrary(query);const input=$('#library-search');input.focus();try{input.setSelectionRange(position,position)}catch{}
  }
});
document.addEventListener('submit',async e=>{
  if(e.target.id==='studio-editor'){e.preventDefault();if(await saveEditor()){render();toast('Saved.')}return}
  if(e.target.id==='new-space'){
    e.preventDefault();const name=new FormData(e.target).get('name').trim();if(!name)return;
    await commitStudio(()=>{const id=crypto.randomUUID();data.spaces.push({id,name,members:[],positions:{},groups:[]});data.activeSpace=id;studio.selected.clear();studio.inspector=false;studio.view={x:0,y:0,scale:1}});$('#dialog').close();return;
  }
  if(e.target.id==='new-group'){
    e.preventDefault();const name=new FormData(e.target).get('name').trim();if(!name)return;
    await commitStudio(()=>{activeSpace().groups.push({id:crypto.randomUUID(),name,members:[...studio.selected]});studio.inspector=false});$('#dialog').close();
  }
});
document.addEventListener('pointerdown',e=>{
  if(!e.target.closest('.space-stage')||e.target.closest('button')||e.button!==0||studio.connecting)return;
  const card=e.target.closest('[data-card]'),group=e.target.closest('[data-group-drag]');
  const ids=group?activeSpace().groups.find(g=>g.id===group.dataset.groupDrag).members:card?(studio.selected.has(card.dataset.card)?[...studio.selected]:[card.dataset.card]):[];
  studio.gesture={x:e.clientX,y:e.clientY,view:{...studio.view},ids,origins:Object.fromEntries(ids.map(id=>[id,[...nodePosition(id)]])),before:structuredClone(data),mode:ids.length?'move':e.shiftKey?'select':'pan',moved:false};
});
document.addEventListener('pointermove',e=>{
  const g=studio.gesture;if(!g)return;
  const dx=e.clientX-g.x,dy=e.clientY-g.y;if(!g.moved&&Math.hypot(dx,dy)<5)return;
  g.moved=true;
  if(g.mode==='pan'){studio.view.x=g.view.x+dx;studio.view.y=g.view.y+dy;applyCamera()}
  if(g.mode==='move'){
    for(const id of g.ids)activeSpace().positions[id]=[g.origins[id][0]+dx/g.view.scale,g.origins[id][1]+dy/g.view.scale];updateGeometry();
  }
  if(g.mode==='select'){
    const bounds=$('.space-stage').getBoundingClientRect(),box=$('.selection-box');
    const left=Math.min(g.x,e.clientX)-bounds.left,top=Math.min(g.y,e.clientY)-bounds.top,width=Math.abs(dx),height=Math.abs(dy);
    box.hidden=false;Object.assign(box.style,{left:left+'px',top:top+'px',width:width+'px',height:height+'px'});
    studio.selected=new Set(spaceNodes().filter(n=>{const [x,y]=nodePosition(n.id);const cx=x*g.view.scale+g.view.x,cy=y*g.view.scale+g.view.y;return cx+250*g.view.scale>=left&&cx<=left+width&&cy+210*g.view.scale>=top&&cy<=top+height}).map(n=>n.id));updateGeometry();
  }
});
document.addEventListener('pointerup',async()=>{
  const g=studio.gesture;studio.gesture=null;if(!g||!g.moved)return;
  studio.suppressClick=true;setTimeout(()=>studio.suppressClick=false,100);
  if(g.mode==='move'){
    try{await save();studio.history.push(g.before);studio.future=[]}catch{data=g.before;toast('Layout could not be saved.');updateGeometry()}
  }
  if(g.mode==='pan')persistCamera();
  if(g.mode==='select'){$('.selection-box').hidden=true;studio.inspector=false;$('#space-inspector').hidden=true;$('#space-hint').textContent=studio.selected.size+' selected · Ctrl G to group';}
  // Refresh controls without replacing an unsaved editor.
  const undo=document.querySelector('[data-command="undo"]');if(undo)undo.disabled=!studio.history.length;
});
document.addEventListener('wheel',e=>{
  if(!e.target.closest('.space-stage'))return;e.preventDefault();
  const bounds=$('.space-stage').getBoundingClientRect();zoomAt(Math.exp(-e.deltaY*.001),e.clientX-bounds.left,e.clientY-bounds.top);
  clearTimeout(studio.cameraTimer);studio.cameraTimer=setTimeout(persistCamera,250);
},{passive:false});
document.addEventListener('keydown',e=>{
  if(!document.body.classList.contains('mindspace')||$('#dialog').open)return;
  const typing=e.target.closest('input,textarea,select');
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();saveEditor().then(ok=>{if(ok)render()});return}
  if(typing)return;
  if(e.key==='Escape'){studio.connecting=null;studio.inspector=false;studio.selected.clear();render();return}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();studioCommand(e.shiftKey?'redo':'undo').catch(report);return}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='g'){e.preventDefault();groupSelection();return}
  if(e.key.toLowerCase()==='n')createNode('file').catch(report);
  if(e.key.toLowerCase()==='f')fitSpace();
  if(e.key==='Enter'&&e.target.closest('[data-card]'))selectNode(e.target.closest('[data-card]').dataset.card).catch(report);
});
document.addEventListener('dragover',e=>{if(e.target.closest('.space-stage'))e.preventDefault()});
document.addEventListener('drop',async e=>{
  if(!e.target.closest('.space-stage')||!e.dataTransfer?.files.length)return;e.preventDefault();
  if(!await saveEditor())return;
  const before=new Set(studioNodes().map(n=>n.id));await ingest([...e.dataTransfer.files],'Vault');
  await commitStudio(()=>{for(const n of studioNodes())if(!before.has(n.id)){activeSpace().members.push(n.id);activeSpace().positions[n.id]=centerPoint()}});
});
