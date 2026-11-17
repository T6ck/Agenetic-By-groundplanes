'use strict';
const $=s=>document.querySelector(s), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={Overview:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',Graph:'M5 6l7 6 7-7M12 12l6 7M3 6a2 2 0 1 0 4 0 2 2 0 1 0-4 0m7 6a2 2 0 1 0 4 0 2 2 0 1 0-4 0m7-7a2 2 0 1 0 4 0 2 2 0 1 0-4 0m-1 14a2 2 0 1 0 4 0 2 2 0 1 0-4 0',Agents:'M4 8h16v12H4zM12 4v4M1 12v4m22-4v4M8 13h1m6 0h1m-7 4h6',Vault:'M3 7h7l2 2h9v11H3zM3 7V4h7l2 3h7v2',Models:'M6 6h12v12H6zM9 9h6v6H9zM9 2v4m6-4v4m-6 12v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4',Activity:'M2 12h5l3-7 4 14 3-7h5',Sharing:'M3 11v10h18V11M12 16V3m-4 4 4-4 4 4'};
const icon=n=>'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="'+icons[n]+'"/></svg>';
const box=(n,c='')=>'<span class="icon '+c+'">'+icon(n)+'</span>';
const seeds={agents:[{id:'atlas',name:'Atlas',role:'Research analyst',task:'Summarize research into clear findings and cite source filenames.',files:['brief','notes'],sample:true},{id:'sentinel',name:'Sentinel',role:'Security reviewer',task:'Identify risks and prioritize findings.',files:['security','brief'],sample:true},{id:'scribe',name:'Scribe',role:'Documentation agent',task:'Turn notes into concise documentation.',files:['notes','runbook'],sample:true}],files:[{id:'brief',name:'Project Brief.md',sample:true,text:'# Project brief\nBuild a local operations workspace for scoped agents.'},{id:'notes',name:'Research Notes.md',sample:true,text:'# Research notes\nRecord findings with their sources and open questions.'},{id:'security',name:'Security Policy.md',sample:true,text:'# Security policy\nKeep data on-device and require approval to share anything.'},{id:'runbook',name:'Runbook.md',sample:true,text:'# Runbook\nAssign a role, select context, and run a specific task.'}],models:[],logs:[{title:'Sample workspace created',detail:'Overview · Example activity',type:'Graph'},{title:'Research notes linked to Atlas',detail:'File vault · Example activity',type:'Vault'},{title:'Sentinel configured',detail:'Agents · Example activity',type:'Agents'}]};
let panX=0,panY=0; let data, db, page='Overview', zoom=1, token='', companionBase='http://127.0.0.1:7871', running=false, timer;
const initial={agents:[],files:[],models:[],logs:[]};
const req=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
function save(blobs=[],remove=[]){return new Promise((resolve,reject)=>{const t=db.transaction(['state','blobs'],'readwrite');try{t.objectStore('state').put(data,'current');if(deviceAppearance)t.objectStore('state').put(deviceAppearance,'device-appearance');if(data.profile){t.objectStore('state').put(data,'profile:'+data.profile.id);t.objectStore('state').put(profileRegistry,'profiles');}for(const [id,file] of blobs)t.objectStore('blobs').put(file,id);for(const id of remove)t.objectStore('blobs').delete(id)}catch(e){t.abort();reject(e)}t.oncomplete=resolve;t.onabort=()=>reject(t.error??new Error('Storage write failed'));t.onerror=()=>reject(t.error)})}
const blob=id=>req(db.transaction('blobs').objectStore('blobs').get(id));
function toast(s){$('#toast').textContent=s;clearTimeout(timer);timer=setTimeout(()=>$('#toast').textContent='',6000)}
async function change(fn, files=[], remove=[]){const prev=structuredClone(data);fn();try{await save(files,remove);render();return true}catch(e){data=prev;toast('Could not save on this device. Check browser storage.');return false}}
function log(title,detail,type){data.logs.unshift({title,detail,type,time:new Date().toISOString()});data.logs=data.logs.slice(0,100)}
function intro(title,description,tag=''){return '<section class="intro"><div><div class="eyebrow">AGENETIC / WORKSPACE</div><h1>'+title+'</h1><p>'+description+'</p></div>'+tag+'</section>'}
const btn=(action,label,id='')=>'<button type="button" data-act="'+action+'" data-id="'+esc(id)+'">'+label+'</button>';
const header=(title,sub='',right='')=>'<div class="panel-head"><div><h2>'+title+'</h2>'+(sub?'<p>'+sub+'</p>':'')+'</div>'+right+'</div>';
const empty=s=>'<div class="empty">'+s+'</div>';
function agentRow(a){return '<button class="agent-row" data-act="agent" data-id="'+esc(a.id)+'">'+box('Agents')+'<span class="row-main"><strong>'+esc(a.name)+'</strong><small>'+esc(a.role)+'</small></span><span class="pill '+(a.sample?'':'green')+'">'+(a.sample?'Sample':a.model?'Ready':'Setup')+'</span></button>'}
function fileRow(f,type='Vault'){return '<button class="file-row" data-act="'+(type==='Models'?'model':'file')+'" data-id="'+esc(f.id)+'">'+box(type,type==='Models'?'blue':'mint')+'<span class="row-main"><strong>'+esc(f.name)+'</strong><small>'+(f.sample?'Sample':new Intl.NumberFormat(undefined,{style:'unit',unit:'megabyte',maximumFractionDigits:2}).format(f.size/1e6)+(f.size<10000?' · '+f.size+' bytes':''))+'</small></span><span>›</span></button>'}
function activity(rows){return rows.map(r=>'<div class="activity-row">'+box(r.type,'mint')+'<div class="row-main"><strong>'+esc(r.title)+'</strong><small>'+esc(r.detail)+(r.time?' · '+esc(new Date(r.time).toLocaleString()):'')+'</small></div></div>').join('')||empty('No activity yet.')}
function graph(){
 const nodes=[...data.files.map(f=>({...f,type:'file'})),...data.agents.map(a=>({...a,type:'agent'})),...data.models.map(m=>({...m,type:'model'}))];
 const positions=new Map();
 let fileIndex=0, agentIndex=0, modelIndex=0;
 for(const n of nodes){
  const i=n.type==='file'?fileIndex++:n.type==='agent'?agentIndex++:modelIndex++;
  positions.set(n.id,n.type==='file'?[35+(i%4)*237,32+Math.floor(i/4)*210]:n.type==='agent'?[130+(i%3)*290,310+Math.floor(i/3)*240]:[160+(i%3)*280,600+Math.floor(i/3)*200]);
 }
 let paths='';
 for(const a of data.agents){
  const [ax,ay]=data.positions?.[a.id]||positions.get(a.id);
  for(const id of [...a.files,a.model].filter(Boolean)){
   const pos=data.positions?.[id]||positions.get(id);if(!pos)continue;
   const [x,y]=pos;
   paths+='<path d="M'+(ax+100)+' '+ay+' C'+(ax+100)+' '+(ay-75)+' '+(x+100)+' '+(y+245)+' '+(x+100)+' '+(y+175)+'" fill="none" stroke="#80778c" stroke-width="1" opacity=".7"/>';
  }
 }
 return '<div class="graph"><svg viewBox="'+[500-500/zoom-panX,280-280/zoom-panY,1000/zoom,560/zoom].join(' ')+'" aria-label="Agent and knowledge canvas">'+paths+nodes.map(n=>{
  const [x,y]=data.positions?.[n.id]||positions.get(n.id);
  return '<foreignObject x="'+x+'" y="'+y+'" width="200" height="180" data-node="'+esc(n.id)+'"><div xmlns="http://www.w3.org/1999/xhtml" tabindex="0" role="button" class="canvas-card '+n.type+'" data-act="'+n.type+'" data-id="'+esc(n.id)+'"><div class="kind">'+(n.type==='agent'?'Agent / '+(n.sample?'example':'configured'):n.type==='file'?'Knowledge / local':'Model / GGUF')+'</div><h3>'+esc(n.name)+'</h3><p>'+esc(n.type==='agent'?n.task:n.text?n.text.replace(/^#+ /gm,'').slice(0,180):'Registered locally. Open to inspect.')+'</p><footer>'+(n.type==='agent'?n.files.length+' connected sources':n.sample?'Example document':'On this device')+'</footer></div></foreignObject>';
 }).join('')+'</svg><div class="graph-controls">'+btn('zoomIn','<span aria-label="Zoom in">+</span>')+btn('zoomOut','<span aria-label="Zoom out">−</span>')+btn('resetZoom','<span aria-label="Reset zoom">⌂</span>')+'</div><div class="legend"><span>KNOWLEDGE CANVAS</span><span>Drag to arrange · Scroll to zoom</span></div></div>';
}
function graphPanel(full=false){return '<section class="panel graph-panel">'+header('Workspace.canvas','Connected documents and agent instructions',full?'':btn('go','Expand ↗','Graph'))+graph()+'</section>'}
function drop(kind){return '<label class="drop" data-drop="'+kind+'"><strong>'+ (kind==='Models'?'Drop GGUF models here':'Drop knowledge files here')+'</strong><small>or choose files from your device</small><input type="file" multiple '+(kind==='Models'?'accept=".gguf"':'')+'></label>'}
function render(){
 for(const [target,names] of [['nav',['Overview','Graph','Agents','Vault','Models']],['system',['Activity','Sharing']]])$('#'+target).innerHTML=names.map(n=>'<button class="'+(page===n?'active':'')+'" data-act="go" data-id="'+n+'">'+icon(n)+' '+({Graph:'Knowledge graph',Vault:'File vault',Models:'Local models'}[n]||n)+'</button>').join('');
 document.body.classList.toggle('immersive',page==='Overview'||page==='Graph'); $('#crumb').textContent=page==='Overview'||page==='Graph'?'Personal space / Untitled constellation': 'Personal space / '+page;
 const counts=[['Agents',data.agents.length,'','Agent profiles'],['Vault',data.files.length,'mint','Knowledge files'],['Models',data.models.length,'blue','Local models'],['Activity',data.logs.filter(r=>r.run).length,'peach','Completed runs']];
 const views={
 Overview:()=>'<div class="canvas-title"><span class="eyebrow">PERSONAL SPACE</span><h1>Your constellation</h1><p>Open a note, inspect its links, or run a connected research task.</p></div>'+graphPanel(true)+'<div class="canvas-dock">'+btn('new','＋ Agent')+btn('note','＋ Note')+btn('go','Import files','Vault')+btn('go','Models','Models')+'</div><div class="canvas-status"><span>● ON DEVICE</span><span>'+data.agents.length+' agents · '+data.files.length+' documents</span></div>',

 Graph:()=>intro('Knowledge graph','Select an agent, a knowledge file, or a model to inspect it.')+graphPanel(true),
 Agents:()=>intro('Agents','Define an agent’s role, assign knowledge, and run a task.')+'<div class="panel list">'+header('Agent profiles','',btn('new','＋ New agent'))+(data.agents.map(agentRow).join('')||empty('No agent profiles yet.'))+'</div>',
 Vault:()=>intro('File vault','Keep originals on this device. Attach text and Markdown to give agents context.')+'<div class="stack"><div class="panel pad">'+drop('Vault')+'</div><section class="panel list">'+header('Knowledge files')+(data.files.map(f=>fileRow(f)).join('')||empty('No files yet.'))+'</section></div>',
 Models:()=>modelLibraryView(),
 Activity:()=>intro('Activity','Review imports, agent setup, and completed task runs on this device.')+'<section class="panel">'+header('Workspace activity')+activity(data.logs)+'</section>',
 Sharing:()=>intro('Sharing','Prepare a public snapshot using only information you explicitly enter here.')+'<section class="panel pad"><h2>Export a snapshot</h2><p>Export a self-contained public page and host it separately. Vault files, models, agent instructions, and outputs stay out of the export unless you paste that information into the summary.</p>'+btn('share','Export snapshot')+'</section><section class="panel pad"><h2>Sample data</h2><p>Remove example agents, files, and activity when you’re ready to start fresh.</p>'+btn('clearSamples','Remove sample data')+'</section>'
 };$('#content').innerHTML=views[page]();
}
function modal(title,html){const d=$('#dialog');d.innerHTML=header(title,'',btn('close','Close'))+'<div class="pad">'+html+'</div>';if(!d.open)d.showModal()}
function download(value,name,type='text/plain'){const url=URL.createObjectURL(value instanceof Blob?value:new Blob([value],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
function researchSourceReady(file, files, chain = new Set()){
 if (!file?.text?.trim() || chain.has(file.id) || chain.size >= 12) return false;
 const research = file.research;
 if (!research) return !file.originTrace && !/^## Evidence review\n[\s\S]*\n## Critical review\n/.test(file.text);
 if (!['evidence','supported'].includes(research.state) || !research.quotes?.length || file.text!==research.reviewedText) return false;
 const visited = new Set(chain).add(file.id);
 return research.quotes.every(({id, excerpt}) => {
  const source = files.get(id);
  return (data.links||[]).some(link=>link.from===id&&link.to===file.id) &&
   source?.text?.includes(excerpt) && researchSourceReady(source, files, visited);
 });
}
function appendResearchNode({name, text, state, sources, quotes = [], step = '', draft = '', agent = '', statement = '', stepTask = ''}){
 const space = activeSpace();
 const node = {id:crypto.randomUUID(),name:name.slice(0,120),text,size:new Blob([text]).size,
  research:{state, sources:[...new Set(sources)].slice(0,20), quotes, step, draft, agent, statement, stepTask, reviewedText:['evidence','supported'].includes(state)?text:'', workspace:space.id}};
 data.links ??= [];
 data.files.push(node);
 if (!space.members.includes(node.id)) space.members.push(node.id);
 for (const from of new Set([...node.research.sources, step, draft, agent].filter(Boolean))) {
  data.links.push({from,to:node.id});
 }
 return node;
}
function reviewResearchDraft(draft){
 const workspace = activeSpace().id;
 if (draft.research?.state !== 'pending' || draft.research.workspace !== workspace) return;
 const files = new Map(workspaceSourceFiles().map(file => [file.id,file]));
 const choices = draft.research.sources.map(id=>files.get(id)).filter(file=>researchSourceReady(file,files));
 const reviewed = [...files.values()].filter(file=>file.research?.draft===draft.id);
 modal(esc(draft.name), '<p>Draft · excluded from task sources until you review individual claims.</p><pre class="output">'+esc(draft.text)+'</pre>'+
  '<h3>Claim review</h3>'+(reviewed.length?'<ul>'+reviewed.map(file=>'<li>'+esc(file.research.state)+' · '+esc(file.name)+'</li>').join('')+'</ul>':'')+
  '<form id="claim-review"><label class="field">One claim<textarea name="claim" required maxlength="600"></textarea></label>'+
  '<label class="field">Decision<select name="decision"><option value="supported">Supported by the quoted source</option><option value="unresolved">Needs more evidence</option><option value="rejected">Rejected</option></select></label>'+
  '<label class="field">Original connected source<select name="source"><option value="">Choose a source</option>'+choices.map(file=>'<option value="'+esc(file.id)+'">'+esc(file.name)+'</option>').join('')+'</select></label>'+
  '<pre id="claim-source-preview" class="output" hidden></pre><label class="field">Exact supporting quote<textarea name="quote" maxlength="1200"></textarea></label>'+
  '<button type="submit" class="primary">Save reviewed claim</button><p role="status"></p></form>');
 const form = $('#claim-review'), record = data;
 form.elements.source.onchange = () => {
  const source = choices.find(file=>file.id===form.elements.source.value), preview = $('#claim-source-preview');
  preview.hidden = !source;
  preview.textContent = source?.text?.slice(0,9000)||'';
 };
 form.onsubmit = async event => {
  event.preventDefault();
  const status = form.querySelector('[role="status"]');
  const values = new FormData(form), claim = values.get('claim').trim(), decision = values.get('decision');
  if (data !== record || activeSpace().id !== workspace || !record.files.includes(draft)) return;
  if (!claim || !['supported','unresolved','rejected'].includes(decision)) return;
  const source = choices.find(file=>file.id===values.get('source'));
  const excerpt = values.get('quote').trim();
  const live = new Map(workspaceSourceFiles().map(file=>[file.id,file]));
  if (decision === 'supported' && (!source || excerpt.length < 12 ||
    !live.get(source.id)?.text?.includes(excerpt) || !researchSourceReady(live.get(source.id),live))) {
   status.textContent = 'Select an eligible connected source and paste at least 12 characters of exact supporting text.';
   return;
  }
  const verified = decision==='supported';
  const button = form.querySelector('button');
  button.disabled = true;
  try {
   const saved = await change(()=>{
    for (const file of reviewed) {
     if (file.research.statement?.toLowerCase()===claim.toLowerCase()) file.research.state='superseded';
    }
    appendResearchNode({
    name:'Claim · '+claim, text:verified?claim+'\n\nSupporting excerpt from '+source.name+':\n'+excerpt:claim,
    state:decision, sources:verified?[source.id]:[], quotes:verified?[{id:source.id,excerpt}]:[],
    step:draft.research.step, draft:draft.id, agent:draft.research.agent, statement:claim, stepTask:draft.research.stepTask
    });
   });
   if (saved && form.isConnected && $('#dialog').open) {
    $('#dialog').close();
    toast('Claim saved to the graph.');
   }
  } finally {button.disabled = false;}
 };
}

function workspaceSourceFiles(){
 const space = activeSpace();
 const members = new Set(space.members);
 const hidden = new Set(space.hidden || []);
 return data.files.filter(file => !hidden.has(file.id) &&
  (space.id === 'home' ? data.profile?.demo || !file.sample : members.has(file.id)));
}
function isPdf(file){
 return file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
}
async function extractSourcePdf(file){
 if (!window.ageneticDesktop?.extractPdf) return {error: 'PDF text extraction is available in the Windows app. You can also attach a local text export.'};
 if (file.size > 24 * 1024 * 1024) return {error: 'This PDF exceeds the 24 MiB indexing limit. Split it into smaller files or attach a text export.'};
 try {
  return await window.ageneticDesktop.extractPdf(new Uint8Array(await file.arrayBuffer()));
 } catch {
  return {error: 'Could not read the saved PDF. Try opening it or adding a text export.'};
 }
}
function applyPdfIndex(file, result){
 if (typeof result?.text === 'string' && result.text.trim()) {
  file.text = result.text;
  file.pdfIndex = {pages: result.pages, indexedPages: result.indexedPages, partial: !!result.partial};
 } else file.pdfIndex = {error: result?.error || 'No readable text was extracted from this PDF.'};
}
let pdfIndexing = false;
async function indexSavedPdfs(files, retry = false){
 if (!window.ageneticDesktop?.extractPdf || pdfIndexing) return [];
 const record = data, workspace = activeSpace().id;
 const updated = [];
 const failures = [];
 pdfIndexing = true;
 try {
  for (const file of files.filter(item => !item.text?.trim() && (!item.pdfIndex?.error || retry))) {
   if (data !== record || activeSpace().id !== workspace) break;
   if (!file.size && !isPdf(file)) continue;
   const original = await blob(file.id);
   if (!original) {
    if (isPdf(file)) failures.push(file.name + ': The original PDF is missing.');
    continue;
   }
   if (!isPdf(file) && !isPdf(original)) continue;
   const result = await extractSourcePdf(original);
   if (data !== record || activeSpace().id !== workspace || !record.files.includes(file) || file.text?.trim()) break;
   updated.push({file, previousText: file.text, previousIndex: file.pdfIndex});
   applyPdfIndex(file, result);
   if (file.pdfIndex.error) failures.push(file.name + ': ' + file.pdfIndex.error);
  }
  if (updated.length) {
   if (data !== record || activeSpace().id !== workspace) throw new Error('Return to this workspace to finish PDF indexing.');
   await save();
  }
  return failures;
 } catch (error) {
  for (const {file, previousText, previousIndex} of updated) {
   file.text = previousText;
   file.pdfIndex = previousIndex;
  }
  throw error;
 } finally {pdfIndexing = false;}
}
function selectedResearchSources(ids){
 const files = new Map(workspaceSourceFiles().map(file=>[file.id,file]));
 return [...new Set(ids)].filter(id=>researchSourceReady(files.get(id),files));
}
function sourcePicker(legend, defaults = []){
 const checked = new Set(defaults);
 const files = workspaceSourceFiles();
 const byId = new Map(files.map(file=>[file.id,file]));
 const readable = files.filter(file => researchSourceReady(file, byId));
 const rejected = files.filter(file => file.pdfIndex?.error);
 return '<fieldset data-readable-picker><legend>'+esc(legend)+'</legend><div data-readable-options>'+
  (readable.map(file => '<label><input type="checkbox" name="sources" value="'+esc(file.id)+'" '+(checked.has(file.id)?'checked':'')+'> '+esc(file.name)+
   (file.pdfIndex?.partial?' · partial PDF text':'')+'</label>').join('')||'<p>No readable sources in this workspace yet.</p>')+
  '</div>'+(files.some(file=>!file.text?.trim()&&file.size)?'<button type="button" data-index-pdfs>Index saved PDFs</button>':'')+
  '<p data-pdf-status role="status">'+esc(rejected.map(file=>file.name+': '+file.pdfIndex.error).slice(0,3).join(' '))+'</p></fieldset>';
}
document.addEventListener('click', async event => {
 const button = event.target.closest('[data-index-pdfs]');
 if (!button) return;
 const host = button.closest('[data-readable-picker]');
 const status = host.querySelector('[data-pdf-status]');
 button.disabled = true;
 status.textContent = 'Reading saved PDFs on this device…';
 try {
  if (!window.ageneticDesktop?.extractPdf) throw new Error('Open the Windows app to index PDFs, or attach a text export in this workspace.');
  const selected = new Set([...host.querySelectorAll('input:checked')].map(input=>input.value));
  const failures = await indexSavedPdfs(workspaceSourceFiles(), true);
  if (!host.isConnected) return;
  const legend = host.querySelector('legend').textContent;
  const replacement = document.createElement('div');
  replacement.innerHTML = sourcePicker(legend);
  const picker = replacement.firstElementChild;
  for (const input of picker.querySelectorAll('input')) input.checked = selected.has(input.value);
  picker.querySelector('[data-pdf-status]').textContent = failures.join(' ') || 'PDF indexing complete. Select from the readable sources above.';
  host.replaceWith(picker);
 } catch (error) {status.textContent = error.message;}
 finally {button.disabled = false;}
});

async function ingest(files,kind){const models=kind==='Models', items=[];let skippedModel=false,pdfFailures=[];const origin=data,space=activeSpace().id;for(const file of files){if(!models&&/\.gguf$/i.test(file.name)){skippedModel=true;continue;}if(models){const bytes=new Uint8Array(await file.slice(0,4).arrayBuffer());if(!/\.gguf$/i.test(file.name)||String.fromCharCode(...bytes)!=='GGUF'){toast('Choose a valid GGUF model file.');continue}}const item={id:crypto.randomUUID(),name:file.name,size:file.size};if(!models&&isPdf(file)){toast('Reading '+file.name+' on this device…');applyPdfIndex(item,await extractSourcePdf(file));if(item.pdfIndex.error)pdfFailures.push(file.name+': '+item.pdfIndex.error);}else if(!models&&file.size<=2e6&&(/\.(txt|md|markdown|csv|tsv|json|jsonl|log|ya?ml|xml|toml|ini|rst)$/i.test(file.name)||file.type.startsWith('text/')))item.text=await file.text();items.push([item,file])}if(!items.length){if(skippedModel)toast('Open Local models and choose Existing GGUF to add model weights.');return;}if(data!==origin||activeSpace().id!==space){toast('Return to the original workspace and import again.');return;}if(await change(()=>{const group=models?data.models:data.files;for(const [item] of items){group.push(item);if(data.spaces&&activeSpace())activeSpace().members.push(item.id);log(item.name,models?'Model registered':'File imported',kind)}},models?[]:items.map(([item,file])=>[item.id,file])))toast(items.length+(items.length===1?' item added':' items added')+' to this workspace.'+(skippedModel?' Open Local models for GGUF files.':'')+(pdfFailures.length?' '+pdfFailures[0]:''))}
function agentForm(a={}){modal(a.id?'Edit agent':'Set up an agent','<form id="agentForm" data-id="'+esc(a.id)+'"><label class="field">Agent name<input name="name" maxlength="60" required value="'+esc(a.name)+'"></label><label class="field">Role<input name="role" maxlength="80" required value="'+esc(a.role)+'" placeholder="Research analyst"></label><label class="field">Default task and instructions<textarea name="task" required maxlength="5000" placeholder="Explain what the agent should do and how to format its output.">'+esc(a.task)+'</textarea></label><label class="field">Local model<select name="model"><option value="">Choose later</option>'+data.models.map(m=>'<option value="'+esc(m.id)+'" '+(m.id===a.model?'selected':'')+'>'+esc(m.name)+'</option>').join('')+'</select></label><fieldset><legend>Knowledge for this agent</legend><small>Selected text is retrieved at run time. Model weights are unchanged.</small>'+data.files.filter(f=>typeof f.text==='string').map(f=>'<label><input type="checkbox" name="files" value="'+esc(f.id)+'" '+(a.files?.includes(f.id)?'checked':'')+'> '+esc(f.name)+'</label>').join('')+'</fieldset><label class="setup-check"><input type="checkbox" name="follow" '+(a.followLinkedNotes?'checked':'')+'> Follow one hop from connected notes by default</label><button class="primary" type="submit">Save agent setup</button></form>')}
function agentSourceScope(agent, step, followLinks){
 const space = activeSpace();
 const members = new Set(space.members);
 const hidden = new Set(space.hidden || []);
 const files = new Map(data.files.filter(file => !hidden.has(file.id) &&
  (space.id === 'home' ? data.profile?.demo || !file.sample : members.has(file.id))).map(file => [file.id, file]));
 const direct = new Set((agent.files || []).filter(id => files.has(id)&&(!step||files.get(id).research?.step!==step.id)));
 if (step) {
  const steps = new Set(data.tasks.filter(item=>!hidden.has(item.id)&&(space.id==='home'?(data.profile?.demo||!item.sample):members.has(item.id))).map(item=>item.id));
  const predecessors = new Set((data.links||[]).filter(edge=>edge.to===step.id && steps.has(edge.from)).map(edge=>edge.from));
  for (const file of files.values()) {
   if (predecessors.has(file.research?.step) && researchSourceReady(file,files)
       && (data.links||[]).some(edge=>edge.from===file.research.step && edge.to===file.id)) direct.add(file.id);
  }
 }
 const targets = new Set([agent.id, step?.id].filter(Boolean));
 const edges = data.links || [];
 for (const {from, to} of edges) {
  if (targets.has(from) && files.has(to) && !files.get(to).research) direct.add(to);
  if (targets.has(to) && files.has(from) && (!step||files.get(from).research?.step!==step.id)) direct.add(from);
 }
 const ids = new Set(direct);
 if (followLinks && direct.size) {
  const names = new Map();
  for (const file of files.values()) {
   const key = fileNameKey(file.name);
   names.set(key, names.has(key) ? null : file.id);
  }
  for (const {from, to} of edges) {
   if (direct.has(from) && files.has(to) && !files.get(to).research) ids.add(to);
   if (direct.has(to) && files.has(from) && !files.get(from).research) ids.add(from);
  }
  for (const id of [...direct].slice(0, 32)) {
   const text = files.get(id)?.text?.slice(0, 32768) || '';
   for (const match of text.matchAll(/\[\[([^\]\n]+)\]\]/g)) {
    const target = names.get(fileNameKey(match[1].split('|')[0].split('#')[0]));
    if (target && !files.get(target).research) ids.add(target);
   }
  }
 }
 return {files: [...ids].filter(id=>!files.get(id)?.text?.trim() || researchSourceReady(files.get(id),files)), workspace: space.id, record: data};
}
function agentResearchHistory(agentId, workspace){
 return (data.evidenceJournal || []).filter(entry => entry.agent === agentId && entry.workspace === workspace);
}
async function saveAgentEvidence(agent, task, selection, scope, step){
 if (!selection.quotes?.length) throw new Error('No matching evidence in the connected readable notes. Attach a relevant source or refine the task.');
 const quotes = selection.quotes.map(({id, name, excerpt}) => ({id, name, excerpt}));
 const inputs = JSON.stringify([agent.role, agent.task, task, [...scope.files].sort(), quotes]);
 const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(inputs));
 const fingerprint = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
 if (data !== scope.record || activeSpace().id !== scope.workspace) throw new Error('Return to the workspace where this run started.');
 const prior = agentResearchHistory(agent.id, scope.workspace)
  .find(entry => entry.fingerprint === fingerprint && entry.step === (step?.id || ''));
 const output = quotes.map(quote => quote.name + '\n“' + quote.excerpt + '”').join('\n\n');
 const space = activeSpace();
 const artifact = prior && data.files.find(file=>file.id===prior.node && file.research?.state==='evidence'
  && !(space.hidden||[]).includes(file.id) && (space.id==='home'||space.members.includes(file.id))
  && (!step || (data.links||[]).some(link=>link.from===step.id&&link.to===file.id)));
 if (artifact && (!step || (step.status === 'complete' && step.output === output))) return {output, reused: true, node:artifact.id};
 const priorNodes = data.files.filter(file=>file.research?.state==='evidence'&&file.research.workspace===scope.workspace&&file.research.agent===agent.id&&(step?file.research.step===step.id:file.research.query===task));
 const previousStates = new Map(priorNodes.map(file=>[file,file.research]));
 const oldFiles = data.files.slice(), oldLinks = (data.links||[]).slice(), oldMembers = space.members.slice();
 const previous = data.evidenceJournal;
 const previousStep = step ? {status: step.status, output: step.output} : null;
 data.links ??= [];
 const node = artifact || appendResearchNode({name:'Evidence · '+(step?.name||task),text:output,state:'evidence',
  sources:quotes.map(quote=>quote.id),quotes,step:step?.id||'',agent:agent.id});
 if (!artifact) {
  node.research.query = task;
  for (const old of priorNodes) if (old!==node) old.research = {...old.research,state:'superseded'};
  const entry = {agent: agent.id, workspace: scope.workspace, step: step?.id || '',
   task: task.slice(0,160), fingerprint, quotes, node:node.id, time: Date.now()};
  data.evidenceJournal = [entry, ...(previous || [])].slice(0, 120);
 }
 if (step) {step.output = output;step.status = 'complete';}
 try {await save();}
 catch (error) {
  scope.record.evidenceJournal = previous;
  scope.record.files = oldFiles;
  scope.record.links = oldLinks;
  space.members = oldMembers;
  for (const [file, research] of previousStates) file.research = research;
  if (step) Object.assign(step, previousStep);
  throw new Error('Could not save this evidence locally.', {cause: error});
 }
 return {output, reused: !!artifact, node:node.id};
}
function showAgent(agent, step = null){
 const model = data.models.find(item => item.id === agent.model);
 const scope = agentSourceScope(agent, step, false);
 const ids = new Set(scope.files);
 const currentSources = new Map(data.files.filter(file => ids.has(file.id)).map(file => [file.id, file]));
 const names = [...currentSources.values()].slice(0,12).map(file => esc(file.name));
 const journal = agentResearchHistory(agent.id, scope.workspace).slice(0, 8);
 const history = journal.map(entry => '<details><summary>'+esc(entry.task)+'</summary><p>Saved evidence from '+esc(new Date(entry.time).toLocaleDateString())+'</p>'+
  entry.quotes.filter(quote => currentSources.get(quote.id)?.text?.includes(quote.excerpt)).map(quote => '<p><strong>'+esc(quote.name)+'</strong></p><blockquote>'+esc(quote.excerpt)+'</blockquote>').join('')+
  (entry.quotes.some(quote => !currentSources.get(quote.id)?.text?.includes(quote.excerpt))?'<p>Some excerpts changed or are outside the current direct connections.</p>':'')+'</details>').join('');
 modal(esc(agent.name), '<p>'+esc(agent.role)+' · '+(model?esc(model.name):'Model not assigned')+'</p>'+
  '<div class="actions">'+btn('edit','Edit setup',agent.id)+btn('deleteAgent','Remove agent',agent.id)+'</div>'+
  '<h3>Connected notes</h3><p>'+(names.join(', ')||'No sources connected in this workspace.')+
  (scope.files.length>12?' · '+scope.files.length+' total':'')+'</p>'+
  '<form id="runForm" data-id="'+esc(agent.id)+'" data-step="'+esc(step?.id||'')+'"><label class="field">Task for this run<textarea name="task" maxlength="5000" required>'+esc(step?.description||agent.task)+'</textarea></label>'+
  '<label class="field">Run mode<select name="mode"><option value="evidence">Evidence only · exact quotes</option><option value="draft" '+(!model?'disabled':'')+'>Model draft · review required</option></select></label>'+
  '<label class="setup-check"><input type="checkbox" name="follow" '+(agent.followLinkedNotes?'checked':'')+'> Follow one hop from connected notes</label>'+
  '<label class="field">Draft performance<select name="profile"><option value="quick">Quick</option><option value="balanced">Balanced</option><option value="extended">Extended</option></select></label>'+
  '<p class="policy-detail">Evidence only saves matching excerpts locally. Model drafts can add unsupported claims. Both use sources from this workspace.</p>'+
  '<div class="actions"><button type="submit" class="primary">Run locally</button><button type="button" data-stop-agent hidden>Stop run</button></div><div id="runProgress" role="status"></div><div id="runOutput"></div></form>'+
  '<h3>Research record</h3>'+(history||'<p>Evidence runs appear here after they finish.</p>')+
  (agent.last?'<details><summary>Last model draft · unverified</summary><pre class="output">'+esc(agent.last)+'</pre></details>':''));
}
function selectContext(agent, task, requireMatch = false){
 const ids = new Set(agent.files);
 if (!ids.size) return {text: '', sources: []};
 const ignored = new Set(['the','and','for','from','with','that','this','what','which','review','research','write','find','summarize','compare','data','document','information','task']);
 const terms = new Set((task.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []).filter(term => !ignored.has(term)).slice(0, 64));
 const best = [], bestByFile = new Map();
 let remaining = 1024 * 1024;
 for (const file of data.files) {
  if (!ids.has(file.id) || !file.text) continue;
  const limit = Math.min(256 * 1024, file.text.length, remaining);
  for (let offset = 0; offset < limit; offset += 800) {
   const excerpt = file.text.slice(offset, Math.min(limit, offset + 1000));
   const words = new Set(excerpt.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []);
   let score = 0;
   for (const term of terms) if (words.has(term)) score++;
   if (requireMatch && score === 0) continue;
   const candidate = {id: file.id, name: file.name, excerpt, score};
   if (score > (bestByFile.get(file.id)?.score || 0)) bestByFile.set(file.id, candidate);
   if (best.length === 4 && score <= best[3].score) continue;
   best.push(candidate);
   best.sort((left, right) => right.score - left.score);
   if (best.length > 4) best.pop();
  }
  remaining -= limit;
  if (!remaining) break;
 }
 const distinct = [...bestByFile.values()].sort((left,right)=>right.score-left.score).slice(0,4);
 const chosen = [...new Set([...distinct, ...best])].slice(0,4);
 return {
  text: chosen.map(file => 'File: ' + file.name + '\n' + file.excerpt).join('\n\n'),
  sources: [...new Set(chosen.map(file => file.id))],
  quotes: chosen
 };
}
function chooseContext(agent, task){return selectContext(agent, task).text}
async function run(agent, task, form){
 const progress = form.querySelector('#runProgress');
 const output = form.querySelector('#runOutput');
 if (running) {progress.textContent = 'A run is already in progress.';return;}
 const mode = form.elements.mode.value;
 const step = form.dataset.step ? data.tasks.find(item => item.id === form.dataset.step && item.agent === agent.id) : null;
 if (form.dataset.step && !step) {progress.textContent = 'This workflow step changed. Open it again.';return;}
 const scope = agentSourceScope(agent, step, form.elements.follow.checked);
 output.textContent = '';
 if (!scope.files.length) {progress.textContent = 'Connect a readable note to this agent in the current workspace.';return;}
 let pdfFailures = [];
 if (window.ageneticDesktop?.extractPdf) {
  running = true;
  progress.textContent = 'Checking connected files for readable text…';
  try {pdfFailures = await indexSavedPdfs(workspaceSourceFiles().filter(file=>scope.files.includes(file.id)));}
  catch (error) {progress.textContent = error.message;return;}
  finally {running = false;}
  if (data !== scope.record || activeSpace().id !== scope.workspace || !form.isConnected) return;
 }
 const context = selectContext(scope, task, mode === 'evidence');
 if (!context.sources.length) {
  const issue = workspaceSourceFiles().find(file=>scope.files.includes(file.id)&&file.pdfIndex?.error);
  progress.textContent = pdfFailures[0] || (issue ? issue.name+': '+issue.pdfIndex.error : 'No matching evidence in the connected readable notes. Attach a source or refine the task.');
  return;
 }
 if (mode === 'evidence') {
  const submit = form.querySelector('[type="submit"]');
  running = true;
  submit.disabled = true;
  try {
   const result = await saveAgentEvidence(agent, task, context, scope, step);
   output.className = 'output';
   output.textContent = result.output;
   progress.textContent = result.reused ? 'Reused existing evidence.' : 'Exact excerpts saved to the research record.';
  } catch (error) {progress.textContent = error.message;}
  finally {running = false;submit.disabled = false;}
  return;
 }
 if (!token) {progress.textContent = 'The local runtime is unavailable. Open Local models to check its status.';return;}
 const model = data.models.find(item => item.id === agent.model);
 if (!model) {progress.textContent = 'Assign a local model to this agent first.';return;}
 const profile = form.elements.profile.value;
 const button = form.querySelector('[type="submit"]');
 const stop = form.querySelector('[data-stop-agent]');
 const sourceProfile = data.profile.id;
 const started = performance.now();
 let requestId;
 let stopping = false;
 let finished = false;
 running = true;
 button.disabled = true;
 output.textContent = '';
 const tick = () => {
  const elapsed = Math.floor((performance.now() - started) / 1000);
  progress.textContent = requestId
   ? (stopping ? 'Stopping' : 'Checking memory, loading model, or generating') + ' · ' + elapsed + 's elapsed'
   : 'Selecting source excerpts…';
 };
 tick();
 const timer = setInterval(tick, 1000);
 stop.onclick = async () => {
  if (!requestId || finished) return;
  stopping = true;
  stop.disabled = true;
  tick();
  try {
   await companionCall('/cancel', {request_id: requestId});
  } catch (error) {
   if (finished) return;
   stopping = false;
   stop.disabled = false;
   progress.textContent = 'Could not stop yet: ' + error.message;
  }
 };
 try {
  const result = await localModelRequest({
   model: model.name, model_id: model.companionId || null, model_source: model.source || null,
   task, role: agent.role, instructions: [
    task.trim() === agent.task.trim() ? '' : agent.task,
    'Write a research note for a colleague. Lead with the finding or the specific evidence gap. Cite the supplied filename beside factual claims. Report whether evidence is direct, mixed, or missing. Use plain language and concrete details. Never imply you read a source or ran a tool beyond what is provided. End with one practical next check when the evidence is incomplete.'
   ].filter(Boolean).join('\n\n').slice(0,5000),
   context: context.text, profile
  }, {
   agent: agent.id, label: agent.name + ' · ' + task.slice(0, 80), sources: context.sources,
   onRequest(id) {
    requestId = id;
    stop.hidden = false;
    stop.disabled = false;
    tick();
   }
  });
  finished = true;
  clearInterval(timer);
  progress.textContent = 'Unverified draft · ' + ((performance.now() - started) / 1000).toFixed(1) + 's';
  output.className = 'output';
  output.textContent = result.output;
  if (data.profile.id === sourceProfile && data.agents.includes(agent)) {
   agent.last = result.output;
   const saveDraft = document.createElement('button');
   saveDraft.type = 'button';
   saveDraft.textContent = 'Save draft to graph for review';
   output.after(saveDraft);
   saveDraft.onclick = async () => {
    if (data!==scope.record || activeSpace().id!==scope.workspace) return;
    saveDraft.disabled = true;
    let draft;
    if (await change(()=>{draft = appendResearchNode({name:'Draft · '+task,text:result.output,
     state:'pending',sources:context.sources,step:step?.id||'',agent:agent.id,stepTask:step?.description||''});})) reviewResearchDraft(draft);
    else saveDraft.disabled = false;
   };
   log(agent.name + ' completed a task', 'Local inference', 'Agents');
   data.logs[0].run = true;
   await save();
  }
 } catch (error) {
  progress.textContent = error instanceof TypeError ? 'Could not reach the local runtime. Check Local models and restart Agenetic if needed.' : error.message;
 } finally {
  finished = true;
  clearInterval(timer);
  running = false;
  button.disabled = false;
  stop.hidden = true;
  stop.onclick = null;
 }
}
async function act(action,id){
 const a=data.agents.find(x=>x.id===id),f=data.files.find(x=>x.id===id),m=data.models.find(x=>x.id===id);
 if(action==='go'){page=id;zoom=1;$('#dialog').close();render();window.scrollTo(0,0);return}
 if(action==='note')return modal('New knowledge note','<form id="noteForm"><label class="field">Title<input name="title" required maxlength="100"></label><label class="field">Note<textarea name="text" required maxlength="50000"></textarea></label><button class="primary">Save note</button></form>');
 if(action==='new')return agentForm();
 if(action==='edit'&&a)return agentForm(a);
 if(action==='agent'&&a)return showAgent(a);
 if(action==='close')return $('#dialog').close();
 if(action==='zoomIn'||action==='zoomOut'||action==='resetZoom'){if(action==='resetZoom'){panX=0;panY=0;}zoom=action==='resetZoom'?1:Math.min(2.6,Math.max(.55,zoom*(action==='zoomIn'?1.22:1/1.22)));return render()}
 if(action==='file'&&f?.research?.state==='pending')return reviewResearchDraft(f);
 if(action==='file'&&f)return modal(esc(f.name),(typeof f.text==='string'?'<pre class="output">'+esc(f.text.slice(0,16000))+'</pre>':'<p>Stored as an original file. This file type or size is unavailable for text retrieval.</p>')+'<div class="actions">'+btn('downloadFile','Download original',id)+btn('deleteFile','Remove file',id)+'</div>');
 if(action==='model'&&m)return modal(esc(m.name),'<p>Registered on this device. Start the runner with this original GGUF to use it with an agent.</p>'+btn('deleteModel','Remove registration',id));
 if(action==='downloadFile'&&f){const item=await blob(id)??f.text;if(item!==undefined)download(item,f.name);else toast('The original is unavailable.');return}
 if(action==='deleteAgent'||action==='deleteFile'||action==='deleteModel'){
  if(!await confirmRemoval('Remove '+(a?.name||f?.name||m?.name||'this item')+'?',action==='deleteFile'?'This removes the saved file and its agent connections from this profile. This cannot be undone.':action==='deleteModel'?'This removes the model registration and unassigns it from agents. The original model on your computer is not deleted.':'This removes the agent and its setup from this profile. This cannot be undone.'))return;
  if(await change(()=>{if(action==='deleteAgent')data.agents=data.agents.filter(x=>x.id!==id);if(action==='deleteFile'){data.files=data.files.filter(x=>x.id!==id);data.agents.forEach(x=>x.files=x.files.filter(k=>k!==id))}if(action==='deleteModel'){data.models=data.models.filter(x=>x.id!==id);data.agents.forEach(x=>{if(x.model===id)x.model=''})}},[],action==='deleteFile'?[id]:[]))$('#dialog').close();return
 }
 if(action==='clearSamples'){if(!await confirmRemoval('Remove sample data?','Example files, agents, and sample activity will be removed from this profile. Your own records remain. This cannot be undone.'))return;await change(()=>{for(const k of ['agents','files'])data[k]=data[k].filter(x=>!x.sample);data.agents.forEach(a=>a.files=a.files.filter(id=>data.files.some(x=>x.id===id)));data.logs=data.logs.filter(x=>x.time)});return}
 if(action==='connect')return modal('Connect local runner','<form id="connectForm"><label class="field">Runner session key<input name="key" type="password" autocomplete="off" required maxlength="256"></label><small>Copy the session key printed in the runner terminal. It stays in memory until this page closes.</small><button class="primary" type="submit">Test connection</button><p id="connection" role="status"></p></form>');
 if(action==='share')return modal('Export snapshot','<form id="shareForm"><label class="field">Public title<input name="title" required maxlength="100"></label><label class="field">Public summary<textarea name="summary" required maxlength="10000"></textarea></label><label><input type="checkbox" required> I reviewed this text for public sharing.</label><button class="primary" type="submit">Download public page</button></form>');
 if(action==='search'){modal('Search workspace','<label class="field">Search agents, files, and models<input id="query" type="search" autofocus></label><div class="list" id="results"></div>');search('');$('#query').focus()}
}
function search(query){const q=query.trim().toLowerCase(),match=(x,...values)=>[x.name,...values].join(' ').toLowerCase().includes(q);$('#results').innerHTML=(data.agents.filter(x=>match(x,x.role)).map(agentRow).join('')+data.files.filter(x=>match(x)).map(x=>fileRow(x)).join('')+data.models.filter(x=>match(x)).map(x=>fileRow(x,'Models')).join(''))||empty('No matching items.')}
function report(e){toast(e?.message||'Something went wrong.')}
document.addEventListener('click',e=>{const target=e.target.closest('[data-act]');if(target)act(target.dataset.act,target.dataset.id).catch(report)});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(data){if(document.body.classList.contains('mindspace'))studioCommand('search').catch(report);else act('search').catch(report)}}if(e.target.closest('.node')&&['Enter',' '].includes(e.key)){e.preventDefault();const n=e.target.closest('.node');act(n.dataset.act,n.dataset.id).catch(report)}});
document.addEventListener('input',e=>{if(e.target.id==='query')search(e.target.value)});
document.addEventListener('change',e=>{const target=e.target.closest('[data-drop]');if(target&&e.target.files)ingest([...e.target.files],target.dataset.drop).catch(report)});
document.addEventListener('dragover',e=>{const target=e.target.closest('[data-drop]');if(target){e.preventDefault();target.classList.add('drag')}});
document.addEventListener('dragleave',e=>e.target.closest('[data-drop]')?.classList.remove('drag'));
document.addEventListener('drop',e=>{if(!e.dataTransfer?.types.includes('Files'))return;e.preventDefault();const target=e.target.closest('[data-drop]');if(target){target.classList.remove('drag');ingest([...e.dataTransfer.files],target.dataset.drop).catch(report)}});
document.addEventListener('submit',async e=>{
 e.preventDefault();
 const form=e.target, values=new FormData(form);
 try{
 if(form.id==='noteForm'){
 const name=values.get('title').trim(),text=values.get('text').trim();
 if(!name||!text)return;
 if(await change(()=>{data.files.push({id:crypto.randomUUID(),name:name+'.md',text,size:new Blob([text]).size});log(name,'Note created','Vault')}))$('#dialog').close();
 }
 if(form.id==='agentForm'){
  const existing=data.agents.find(a=>a.id===form.dataset.id),name=values.get('name').trim(),role=values.get('role').trim(),task=values.get('task').trim();
  if(!name||!role||!task)return toast('Enter a name, role, and task.');
  const details={name,role,task,model:values.get('model'),files:values.getAll('files'),followLinkedNotes:values.has('follow'),sample:false};
  if(await change(()=>{if(existing)Object.assign(existing,details);else data.agents.push({...details,id:crypto.randomUUID()});log(name,existing?'Agent setup updated':'Agent configured','Agents')})){$('#dialog').close();toast('Agent setup saved.')}
 }
 if(form.id==='runForm'){
  const a=data.agents.find(x=>x.id===form.dataset.id),task=values.get('task').trim();if(a&&task)await run(a,task,form);
 }
 if(form.id==='connectForm'){
  const key=values.get('key').trim(),out=$('#connection');out.textContent='Connecting…';
  try{const response=await fetch(companionBase+'/status',{headers:{Authorization:'Bearer '+key},signal:AbortSignal.timeout(7000)});if(!response.ok)throw new Error('The runner rejected the session key.');const r=await response.json();token=key;out.textContent='Connected to '+r.model+'.';form.querySelector('input').value='';if(page==='Models')refreshModels().catch(report)}catch(e){out.textContent=e instanceof TypeError?'Could not reach the runner. Check that it is running and allow local network access if prompted.':e.message}
 }
 if(form.id==='shareForm'){
  const title=esc(values.get('title').trim()),summary=esc(values.get('summary').trim());
  if(!title||!summary)return toast('Enter a title and summary.');
  const content='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>body{font:1.05rem/1.65 Arial,sans-serif;color:#e9e8e3;background:#101113;max-width:760px;margin:4rem auto;padding:0 1.2rem}article{white-space:pre-wrap;overflow-wrap:anywhere}h1{font-family:Georgia,serif;font-weight:400}small{color:#a9abae}</style><small>Agenetic by Groundplanes · Public snapshot</small><h1>'+title+'</h1><article>'+summary+'</article></html>';
  download(content,'agenetic-snapshot.html','text/html');$('#dialog').close();toast('Public page exported. Host the exported HTML to publish it.');
 }
 }catch(e){report(e)}
});
async function start(){await acquireVaultLock();const open=indexedDB.open('neuron-ops',1);open.onupgradeneeded=()=>{open.result.createObjectStore('state');open.result.createObjectStore('blobs')};db=await req(open);data=await req(db.transaction('state').objectStore('state').get('current'))||initial;await bootProfiles();await bootAppearance();await bootIdentity();if(new URLSearchParams(location.search).has('community'))page='Community';render();if(page==='Community')loadCommunity();$('#new').onclick=()=>act('new');$('#search').onclick=()=>act('search');await bootOnboarding()}
window.addEventListener('DOMContentLoaded',()=>start().catch(error=>{console.error('Workspace initialization failed',error);$('#content').textContent=error.message||'The workspace could not be opened. Check browser storage.'}),{once:true});

document.addEventListener('wheel',e=>{
 if(!e.target.closest('.graph'))return;
 e.preventDefault();
 zoom=Math.min(3,Math.max(.35,zoom*(e.deltaY<0?1.08:1/1.08)));
 render();
},{passive:false});

let gesture=null,ignoreClick=false;
document.addEventListener('pointerdown',e=>{
 const graph=e.target.closest('.graph');
 if(!graph||e.target.closest('button')||e.button!==0)return;
 const node=e.target.closest('[data-node]'),svg=graph.querySelector('svg');
 const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());
 gesture={id:node?.dataset.node,x:point.x,y:point.y,startX:e.clientX,startY:e.clientY,panX,panY,origin:node?[Number(node.getAttribute('x')),Number(node.getAttribute('y'))]:null,moved:false};
});
document.addEventListener('pointermove',e=>{
 if(!gesture)return;
 const svg=document.querySelector('.graph svg');if(!svg)return;
 if(Math.hypot(e.clientX-gesture.startX,e.clientY-gesture.startY)<4&&!gesture.moved)return;
 gesture.moved=true;
 const scale=svg.getScreenCTM().a,dx=(e.clientX-gesture.startX)/scale,dy=(e.clientY-gesture.startY)/scale;
 if(gesture.id){data.positions??={};data.positions[gesture.id]=[gesture.origin[0]+dx,gesture.origin[1]+dy];}
 else{panX=gesture.panX+dx;panY=gesture.panY+dy;}
 render();
});
document.addEventListener('pointerup',async()=>{
 if(gesture?.moved){ignoreClick=true;setTimeout(()=>ignoreClick=false,50);if(gesture.id)try{await save()}catch{toast('Layout could not be saved.');}}
 gesture=null;
});
document.addEventListener('click',e=>{if(ignoreClick){e.stopImmediatePropagation();e.preventDefault();}},true);
