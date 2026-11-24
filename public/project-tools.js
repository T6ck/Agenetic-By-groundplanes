'use strict';

// Starter records are ordinary notes and tasks. The same editor, links,
// import controls, exports, and undo history work in every kind of project.
const projectStarters={
 edit:{name:'Video edit',layout:'flow',notes:[
  ['Cut brief','What should the audience take away? Record the delivery format, target duration, and review date.'],
  ['Selects log','Log each take with its source filename, in and out timecodes, and the reason to keep it. Import SRT or VTT captions to read the timed dialogue beside this log.'],
  ['Sound notes','Mark room tone, music clearance, and dialogue that needs another pass.'],
  ['Delivery sheet','List each master, caption file, aspect ratio, and delivery destination.']],
  tasks:[['Assemble the rough cut','Build a first cut from the marked selects.',[0,1]],['Check dialogue and captions','Check the timing and spelling against picture lock.',[1,2]],['Review the master','Watch the export against the delivery sheet.',[0,3]]]},
 scene:{name:'3D production',layout:'atlas',notes:[
  ['Scene brief','Record the camera, units, frame range, and intended shot.'],
  ['Asset register','Import a glTF scene or OBJ mesh to inspect its contents. List the source version and owner for each asset.'],
  ['Look development','Collect material references and note which lighting conditions each surface needs to hold up under.'],
  ['Render handoff','Record the renderer, output passes, color space, and delivery naming.']],
  tasks:[['Check scene scale','Compare imported geometry with the scene units.',[0,1]],['Review materials','Check material assignments under the shot lighting.',[1,2]],['Render a test frame','Inspect the output passes before rendering the sequence.',[2,3]]]},
 model:{name:'Model evaluation',layout:'clusters',notes:[
  ['Evaluation brief','Define the behavior to measure, the baseline, and what would count as a regression.'],
  ['Dataset notes','Import a JSONL evaluation set. Record its provenance, split, and known gaps.'],
  ['Run configuration','Track the model revision, prompt, sampling settings, and seed. Import a notebook to inspect its cells.'],
  ['Failure review','Record a failing input, expected behavior, observed output, and next experiment.']],
  tasks:[['Freeze the baseline','Record the configuration and dataset revision together.',[0,1,2]],['Compare the candidate','Review changed outputs against the same inputs.',[1,2,3]],['Decide on the release','Summarize regressions and the cases that support the decision.',[0,3]]]}
};
function populateProject(space,key){
 const starter=projectStarters[key];
 if(!starter)return;
 space.graphLayout=starter.layout;space.viewMode='graph';
 const files=starter.notes.map(([name,text])=>({id:crypto.randomUUID(),name:name+'.md',text,size:new Blob([text]).size}));
 data.files.push(...files);space.members.push(...files.map(f=>f.id));
 for(const [name,description,inputs] of starter.tasks){
  const id=crypto.randomUUID();
  data.tasks.push({id,name,description,status:'planned',agent:''});space.members.push(id);
  for(const index of inputs)data.links.push({from:files[index].id,to:id});
 }
}
const productionFormats={srt:'Captions',vtt:'Captions',edl:'Edit list',obj:'Mesh',gltf:'Scene',ipynb:'Notebook',jsonl:'Dataset'};
async function productionText(file){
 const ext=file.name.split('.').pop().toLowerCase();
 if(!Object.hasOwn(productionFormats,ext)||file.size>2000000)return null;
 const raw=await file.text();
 if(['srt','vtt','edl','jsonl'].includes(ext))return raw;
 if(ext==='obj'){
  const lines=raw.split(/\r?\n/),count=prefix=>lines.filter(l=>l.trimStart().startsWith(prefix)).length;
  const names=lines.map(l=>l.trim()).filter(l=>/^(o|g|usemtl)\s/.test(l)).slice(0,60);
  return [count('v ')+' vertices',count('f ')+' faces',...names].join('\n');
 }
 try{
  const doc=JSON.parse(raw);
  if(ext==='gltf'&&doc?.asset?.version){
   const rows=['glTF '+doc.asset.version];
   for(const key of ['scenes','meshes','materials','animations']){
    const items=Array.isArray(doc[key])?doc[key]:[];
    rows.push(items.length+' '+key,...items.slice(0,40).map((v,i)=>'  '+(v?.name||key+' '+(i+1))));
   }
   return rows.join('\n');
  }
  if(ext==='ipynb'&&Array.isArray(doc?.cells)){
   return doc.cells.map((c,i)=>'Cell '+(i+1)+' · '+String(c?.cell_type||'raw')+'\n'+(Array.isArray(c?.source)?c.source.join(''):String(c?.source||''))).join('\n\n');
  }
 }catch{/* Keep the original even when the document cannot be indexed. */}
 return null;
}
function productionRole(name){
 return productionFormats[String(name||'').split('.').pop().toLowerCase()]||'';
}

function captionCues(text){
 const cues=[];
 for(const block of text.trim().split(/\r?\n[ \t]*\r?\n/)){
  const lines=block.split(/\r?\n/);
  const index=lines.findIndex(line=>/^\s*(?:\d+:)?\d{2}:\d{2}[,.]\d{3}\s+-->/.test(line));
  if(index<0)continue;
  const [start,end]=lines[index].trim().split(/\s+-->\s+/);
  cues.push({start,end:end.split(/\s+/)[0],dialogue:lines.slice(index+1).join('\n')});
 }
 return cues;
}
