'use strict';

function workspaceFiles(){
 return spaceNodes().filter(n=>n.kind==='file');
}
function workspaceReading(){
 const space=activeSpace(),files=workspaceFiles();
 const state=space.reading??={};
 const primary=files.find(f=>f.id===state.primary)||files[0];
 const beside=files.find(f=>f.id===state.beside&&f.id!==primary?.id);
 return {files,state,primary,beside};
}
function sessionPosition(file){
 return 'agenetic:reading:'+JSON.stringify([data.profile?.id,activeSpace().id,file.id]);
}
function tabularPreview(file){
 if(!/\.(csv|tsv)$/i.test(file.name)||!file.text||file.text.includes('"'))return '';
 const delimiter=/\.tsv$/i.test(file.name)?'\t':',';
 const rows=file.text.trimEnd().split(/\r?\n/).map(row=>row.split(delimiter));
 if(rows.length<2||rows[0].length<2||rows[0].length>16||rows.some(row=>row.length!==rows[0].length))return '';
 const cells=(row,tag)=>'<tr>'+row.map(value=>'<'+tag+'>'+esc(value)+'</'+tag+'>').join('')+'</tr>';
 return '<div class="reading-table"><table><thead>'+cells(rows[0],'th')+'</thead><tbody>'+rows.slice(1,61).map(row=>cells(row,'td')).join('')+'</tbody></table></div>'+
 (rows.length>61?'<details><summary>Read all '+(rows.length-1)+' rows</summary><pre>'+esc(file.text)+'</pre></details>':'');
}
function sourcePage(file,secondary,links,files){
 const related=new Set(links.flatMap(l=>l.from===file.id?[l.to]:l.to===file.id?[l.from]:[]));
 const references=files.filter(f=>related.has(f.id)&&f.id!==file.id);
 let draft=false;try{draft=!!localStorage.getItem(sessionPosition(file)+':draft');}catch{}
 const text=file.text||'',words=text.trim()?text.trim().split(/\s+/).length:0;
 const table=tabularPreview(file);
 const measure=table?(text.trimEnd().split('\n').length-1)+' rows':words.toLocaleString()+' words';
 const label=(table?'Table':'')||productionRole(file.name)||(file.research?'Research note':file.pdfIndex?'PDF':'Document');
 return '<article class="reading-page" data-source-id="'+esc(file.id)+'"><header><small>'+esc(label)+'</small>'+
 (secondary?'<button data-reading="unpin">Close comparison</button>':'<span></span>')+'</header>'+
 '<h1>'+esc(file.name)+'</h1><div class="reading-meta">'+measure+(secondary?' · Comparison':'')+'</div>'+
 '<div class="reading-text">'+(text?table||readerPassageHtml(file,true):file.size?'Original file available below.':'This note is empty.')+'</div>'+
 '<div class="reading-actions">'+(!secondary&&typeof file.text==='string'&&!file.research?'<button data-reading="edit">'+(draft?'Continue draft':'Edit text')+'</button>':'')+
 '<button data-reader-original="'+esc(file.id)+'">Download source</button></div>'+
 (references.length?'<section class="reading-related"><h2>Connected files</h2>'+references.map(f=>'<button data-reading="beside" data-id="'+esc(f.id)+'">'+esc(f.name)+'</button>').join('')+'</section>':'')+'</article>';
}
function renderSourceWorkspace(){
 ensureStudio();applyAppearance();
 const {files,primary,beside}=workspaceReading(),space=activeSpace(),host=$('#content');
 document.body.classList.remove('mindspace','knowledge-mode','studio','immersive','model-library-page');
 const links=studioLinks();
 const options=(omit)=>files.filter(f=>f.id!==omit).map(f=>'<option value="'+esc(f.id)+'">'+esc(f.name)+'</option>').join('');
 host.innerHTML='<main class="reading-workspace"><header class="reading-bar"><b>'+brandMark()+' Agenetic</b><button data-command="spaces">'+esc(space.name)+' ▾</button><nav><button data-reading="import">Import</button><button data-reading="map">Map</button><button data-global-appearance>Appearance</button><button data-navigate>Navigate</button><button data-profiles>Profiles</button></nav></header>'+
 '<div class="reading-layout"><aside class="reading-library"><header><h2>Files</h2><small>'+files.length+'</small></header><input type="search" id="reading-search" aria-label="Find a file" placeholder="Find a file">'+
 '<div class="reading-list">'+files.map(f=>'<button data-reading="open" data-id="'+esc(f.id)+'" aria-current="'+(f.id===primary?.id)+'">'+esc(f.name)+'</button>').join('')+'</div><button data-reading="note">Write a note</button></aside>'+
 '<section class="reading-desk"><div class="reading-toolbar"><label>Open file <select id="reading-primary">'+options()+'</select></label>'+
 (files.length>1?'<label>Read alongside <select id="reading-beside"><option value="">Choose a file</option>'+options(primary?.id)+'</select></label>':'')+
 (primary?'<button data-reading="finding">Add linked note</button>':'')+'</div><div class="reading-pages" data-split="'+!!beside+'">'+
 (primary?sourcePage(primary,false,links,files):'<section class="reading-empty"><h1>'+esc(space.name)+'</h1><p>Open a file or start with a note.</p><button data-reading="import">Import files</button> <button data-reading="note">Write a note</button></section>')+
 (beside?sourcePage(beside,true,links,files):'')+'</div></section></div>'+appearancePanel()+'</main>';
 if(primary)$('#reading-primary').value=primary.id;
 if(beside)$('#reading-beside').value=beside.id;
 for(const article of host.querySelectorAll('.reading-page')){
  const key=sessionPosition({id:article.dataset.sourceId});
  try{article.scrollTop=Number(localStorage.getItem(key))||0;}catch{}
  article.addEventListener('scroll',()=>{try{localStorage.setItem(key,String(article.scrollTop));}catch{}},{passive:true});
 }
}
const otherWorkspaceRender=render;
render=function(){
 if(page==='Workspace'){renderSourceWorkspace();return;}
 otherWorkspaceRender();
};
async function readingAction(action,id){
 if(!await saveEditor())return;
 const {files,state,primary,beside}=workspaceReading();
 if(action==='map'){page='Graph';activeSpace().viewMode='graph';studio.inspector=false;studio.selected.clear();render();return;}
 if(action==='import'){workflowFilePicker();return;}
 if(action==='home'){page='Workspace';render();return;}
 if(action==='open'||action==='beside'||action==='unpin'){
  if(id&&!files.some(f=>f.id===id))return;
  const before={...state};
  if(action==='open'){
   if(id===beside?.id)state.beside=primary.id;
   state.primary=id;
  }else state.beside=id||'';
  try{await save();}catch(error){activeSpace().reading=before;throw error;}
  render();return;
 }
 if(action==='edit'&&primary&&typeof primary.text==='string'&&!primary.research){
  modal(primary.name,'<form id="reading-editor"><label class="field">Title<input name="name" required maxlength="120"></label><label class="field">Text<textarea name="text" rows="14"></textarea></label><p role="status"></p><button class="primary">Save and return</button></form>');
  const form=$('#reading-editor'),key=sessionPosition(primary)+':draft';
  let draft;try{draft=JSON.parse(localStorage.getItem(key));}catch{}
  form.elements.name.value=draft?.name??primary.name;form.elements.text.value=draft?.text??primary.text;
  form.oninput=()=>{try{localStorage.setItem(key,JSON.stringify(Object.fromEntries(new FormData(form))));form.querySelector('p').textContent='Draft saved on this device';}catch{form.querySelector('p').textContent='Draft storage is full. Use Save and return.';}};
  form.onsubmit=async e=>{e.preventDefault();const name=form.elements.name.value.trim();if(!name)return;
   const target=data.files.find(f=>f.id===primary.id);
   if(!target||target.research)return;
   const values={name,text:form.elements.text.value};values.size=new Blob([values.text]).size;
   if(await change(()=>Object.assign(target,values))){try{localStorage.removeItem(key);}catch{}$('#dialog').close();}
  };return;
 }
 if(action==='note'||action==='finding'){
  const selectedText=String(window.getSelection()||'').trim();
  modal(action==='finding'?'Linked note':'New note','<form id="reading-note"><label class="field">Title<input name="name" maxlength="120" required autofocus></label><label class="field">Note<textarea name="text" rows="7"></textarea></label><button class="primary">Save note</button></form>');
  const form=$('#reading-note');if(selectedText)form.elements.text.value=selectedText;
  form.onsubmit=async e=>{e.preventDefault();const name=form.elements.name.value.trim();if(!name)return;
   const text=form.elements.text.value,id=crypto.randomUUID();
   if(await change(()=>{data.files.push({id,name,text,size:new Blob([text]).size});activeSpace().members.push(id);const current=activeSpace().reading;current.primary=id;
    current.beside=action==='finding'?primary?.id:'';
    if(action==='finding')for(const source of [primary,beside].filter(Boolean))data.links.push({from:source.id,to:id});
   }))$('#dialog').close();
  };
 }
}
document.addEventListener('click',event=>{
 const b=event.target.closest('[data-reading]');
 if(b)readingAction(b.dataset.reading,b.dataset.id).catch(report);

});
document.addEventListener('change',event=>{
 if(event.target.id==='reading-primary'||event.target.id==='reading-beside')readingAction(event.target.id==='reading-primary'?'open':'beside',event.target.value).catch(report);
});
document.addEventListener('input',event=>{
 if(event.target.id==='reading-search')for(const b of document.querySelectorAll('.reading-list button'))b.hidden=!b.textContent.toLowerCase().includes(event.target.value.toLowerCase());
});
