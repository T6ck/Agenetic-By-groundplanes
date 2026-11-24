'use strict';
// Knowledge relationships are derived from the same records used by the canvas.
const canvasRender = render;
const canvasCommand = studioCommand;
const canvasCenterPoint = centerPoint;
const explicitStudioLinks = studioLinks;
const canvasDrawInspector = drawInspector;
const glyphPaths = {
  menu:'M4 6h16M4 12h16M4 18h16',
  research:'M5 3h10l4 4v14H5zM8 11h8M8 15h5',
  history:'M4 5v5h5M4 10a8 8 0 1 1 0 5M12 7v5l3 2',
  trash:'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',
  review:'M5 3h10l4 4v14H5zM8 13l3 3 5-6',
  graph:'M12 12 5 5m7 7 7-7m-7 7-7 7m7-7 7 7M3 3h4v4H3zm14 0h4v4h-4zM3 17h4v4H3zm14 0h4v4h-4zM10 10h4v4h-4z',
  canvas:'M3 3h7v8H3zm11 0h7v5h-7zM3 15h7v6H3zm11-3h7v9h-7z',
  search:'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13m5-1 5 5',
  note:'M5 3h10l4 4v14H5zM15 3v5h4M8 12h8m-8 4h8',
  agent:'M8 3h8l5 9-5 9H8l-5-9zM8 12h8m-4-4v8',
  task:'M5 6h4v4H5zm0 9h4v4H5zm8-7h7m-7 9h7',
  model:'M6 6h12v12H6zM9 2v4m6-4v4m-6 12v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4',
  settings:'M4 6h16M4 12h16M4 18h16M9 3v6m7 0v6m-8 0v6',
  fit:'M3 9V3h6m6 0h6v6m0 6v6h-6m-6 0H3v-6',
  plus:'M12 5v14M5 12h14',
  close:'m6 6 12 12M18 6 6 18',
  folder:'M3 6h7l2 3h9v11H3zM3 6V4h7l2 2h7v3',
  chevron:'m8 10 4 4 4-4',
  arrow:'M5 12h14m-5-5 5 5-5 5',
  home:'M3 11 9-8 9 8M6 9v12h12V9',
  share:'M12 16V3m-4 4 4-4 4 4M4 13v8h16v-8',
  undo:'M8 4 3 9l5 5M3 9h11a6 6 0 0 1 0 12',
  redo:'m16 4 5 5-5 5m5-5H10a6 6 0 0 0 0 12',
  library:'M4 4h4v16H4zm7 0h4v16h-4zm7 0 3 16',
  link:'m8 8 3-3a4 4 0 0 1 6 6l-3 3m2 2-3 3a4 4 0 0 1-6-6l3-3m-1 6 6-6',
  minus:'M5 12h14',
  group:'M3 8V3h5m8 0h5v5m0 8v5h-5m-8 0H3v-5M8 8h8v8H8z'
};
glyphPaths.palette='M12 3a9 9 0 1 0 0 18h1.4a2 2 0 0 0 1.5-3.3 1.4 1.4 0 0 1 1.1-2.3h1A4 4 0 0 0 21 11c0-4.4-4-8-9-8ZM7 10h.01M10 7h.01M15 7h.01M18 10h.01';
Object.assign(glyphPaths,{
 discussion:'M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-6 4V6a2 2 0 0 1 2-2ZM7 9h10M7 13h6',
 showcase:'M6 3h12a2 2 0 0 1 2 2v13H4V5a2 2 0 0 1 2-2ZM8 22l4-4 4 4M8 8h8M8 12h5',
 workshop:'m4 8 8-5 8 5-8 5-8-5Zm0 4 8 5 8-5M4 16l8 5 8-5',
 exchange:'M4 8h15l-4-4M20 16H5l4 4',
 idea:'M8 15a7 7 0 1 1 8 0l-1 3H9l-1-3ZM9 21h6M12 7v5',
 download:'M12 3v12m-4-4 4 4 4-4M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3'
});
function lineIcon(name) {
  return '<svg class="line-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="'+(glyphPaths[name]||glyphPaths.note)+'"/></svg>';
}
function brandMark() {
  return '<svg class="dendral-mark angular-mark" viewBox="0 0 40 40" aria-hidden="true"><path d="M5 12 13 33 31 6 35 27 5 12Z"/></svg>';
}
function orbDefinitions() {
  const materials=themeMaterials();
  return '<defs>'+Object.entries(materials).map(([kind,stops])=>'<radialGradient id="orb-'+kind+'" cx="32%" cy="24%" r="79%"><stop offset="0%" stop-color="'+stops[0]+'"/><stop offset="20%" stop-color="'+stops[1]+'"/><stop offset="52%" stop-color="'+stops[2]+'"/><stop offset="82%" stop-color="'+stops[3]+'"/><stop offset="100%" stop-color="'+stops[4]+'"/></radialGradient>').join('')+'<radialGradient id="orb-reflection" cx="35%" cy="16%" r="56%"><stop offset="0%" stop-color="#ffffff" stop-opacity=".65"/><stop offset="34%" stop-color="#ffffff" stop-opacity=".17"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></radialGradient><linearGradient id="orb-rim" x1="15%" y1="0%" x2="80%" y2="100%"><stop offset="0%" stop-color="#f7f5e8" stop-opacity=".65"/><stop offset="45%" stop-color="#ffffff" stop-opacity=".06"/><stop offset="100%" stop-color="#c1d8b5" stop-opacity=".25"/></linearGradient></defs>';
}

const network = {
  search:'',types:new Set(['file','agent','task','model']),settings:false,
  focus:null,depth:1,labels:'auto',nodeScale:1,edgeOpacity:.35,
  positions:new Map(),signature:'',camera:{x:0,y:0,scale:1},drag:null,
  trail:[],hovered:null,space:null,ignoreClick:false,needFit:true
};
function inNetwork() { return (page==='Overview'||page==='Graph')&&activeSpace().viewMode!=='canvas'; }
function fileNameKey(value) { return value.replace(/\.md$/i,'').trim().toLowerCase(); }
studioLinks=function() {
  const links=explicitStudioLinks();
  const nodes=spaceNodes(),ids=new Set(nodes.map(n=>n.id));
  const names=new Map();
  for(const node of nodes.filter(n=>n.kind==='file')){
    const key=fileNameKey(node.name);
    names.set(key,names.has(key)?null:node.id);
  }
  const targetsBySource = new Map();
  for (const {from,to} of links) {
    if (!targetsBySource.has(from)) targetsBySource.set(from,new Set());
    targetsBySource.get(from).add(to);
  }
  for(const file of data.files) {
    if(!ids.has(file.id)||!file.text)continue;
    const targets=targetsBySource.get(file.id)||new Set();
    for(const match of file.text.matchAll(/\[\[([^\]\n]+)\]\]/g)) {
      const target=names.get(fileNameKey(match[1].split('|')[0].split('#')[0]));
      if(target&&target!==file.id&&!targets.has(target)){targets.add(target);links.push({from:file.id,to:target,kind:'wikilink'});}
    }
  }
  return links;
};
function matchesExplorerQuery(node, query) {
  return !query || [node.name,node.text,node.task,node.description]
    .some(value=>typeof value==='string'&&value.toLowerCase().includes(query));
}
function networkData() {
  let nodes=spaceNodes(),links=studioLinks();
  if(investigationStates.has(activeSpace()))return {nodes,links};
  if(network.focus) {
    const included=new Set([network.focus]);
    for(let depth=0;depth<network.depth;depth++) {
      const frontier=new Set(included);
      for(const l of links)if(frontier.has(l.from)||frontier.has(l.to)){included.add(l.from);included.add(l.to)}
    }
    nodes=nodes.filter(n=>included.has(n.id));
  }
  const query=network.search.trim().toLowerCase();
  nodes=nodes.filter(n=>network.types.has(n.kind)&&matchesExplorerQuery(n,query));
  const ids=new Set(nodes.map(n=>n.id));links=links.filter(l=>ids.has(l.from)&&ids.has(l.to));
  return {nodes,links};
}
function organizedGraphPositions(nodes, links) {
  const compare = (a,b) => a.localeCompare(b,'en');
  const records = new Map(nodes.map(node=>[node.id,node]));
  const neighbors = new Map(nodes.map(node=>[node.id,new Set()]));
  for (const {from,to} of links) {
    if (from===to || !neighbors.has(from) || !neighbors.has(to)) continue;
    neighbors.get(from).add(to);
    neighbors.get(to).add(from);
  }
  const priority = {agent:0,task:1,file:2,model:3};
  const linkedFirst = (a,b) => neighbors.get(b).size-neighbors.get(a).size ||
    (priority[records.get(a).kind]??4)-(priority[records.get(b).kind]??4) ||
    compare(records.get(a).name,records.get(b).name) || compare(a,b);
  const visited = new Set(), components = [], isolated = [];
  for (const id of [...records.keys()].sort(linkedFirst)) {
    if (visited.has(id)) continue;
    if (!neighbors.get(id).size) {
      isolated.push(id);
      visited.add(id);
      continue;
    }
    const group = [id];
    visited.add(id);
    for (let index=0;index<group.length;index++) {
      for (const next of [...neighbors.get(group[index])].sort(linkedFirst)) {
        if (!visited.has(next)) {visited.add(next);group.push(next);}
      }
    }
    components.push(group);
  }
  components.sort((a,b)=>b.length-a.length||linkedFirst(a[0],b[0]));
  if (isolated.length) components.push(isolated);

  const dx=245,dy=105,gap=170;
  const targetWidth=Math.max(900,Math.sqrt(Math.max(1,nodes.length)*dx*dy)*1.5);
  let x=0,y=0,rowHeight=0;
  const positions=new Map();
  for (const group of components) {
    const columns=Math.min(group.length,Math.max(1,Math.ceil(Math.sqrt(group.length*.72))));
    const width=columns*dx;
    const height=Math.ceil(group.length/columns)*dy;
    if (x && x+width>targetWidth) {x=0;y+=rowHeight+gap;rowHeight=0;}
    group.forEach((id,index)=>positions.set(id,[x+(index%columns)*dx,y+Math.floor(index/columns)*dy]));
    x+=width+gap;
    rowHeight=Math.max(rowHeight,height);
  }
  return positions;
}

let arrangingGraph = false;
async function changeGraphArrangement(undo=false){
  if (arrangingGraph || (network.layout && network.layout!=='freeform')) return;
  const workspace=activeSpace();
  const previous={positions:workspace.graphPositions,camera:workspace.graphCamera,undo:workspace.graphArrangeUndo};
  const next=new Map(network.positions);
  if (undo) {
    if (!previous.undo) return;
    workspace.graphPositions={...Object.fromEntries(next),...previous.undo.positions};
    workspace.graphCamera=previous.undo.camera;
    workspace.graphArrangeUndo=null;
  } else {
    const {nodes,links}=networkData();
    if (nodes.length<2) return fitNetwork();
    workspace.graphArrangeUndo={positions:Object.fromEntries(next),camera:{...network.camera}};
    for (const [id,point] of organizedGraphPositions(nodes,links)) next.set(id,point);
    workspace.graphPositions=Object.fromEntries(next);
  }
  arrangingGraph=true;
  try {await save();}
  catch (error) {
    workspace.graphPositions=previous.positions;
    workspace.graphCamera=previous.camera;
    workspace.graphArrangeUndo=previous.undo;
    throw new Error('Could not save the graph layout.',{cause:error});
  } finally {arrangingGraph=false;}
  if (activeSpace()!==workspace) return;
  network.positions=new Map(Object.entries(workspace.graphPositions));
  network.signature='';
  if (undo) network.camera={...workspace.graphCamera};
  network.needFit=!undo;
  render();
  toast(undo?'Previous arrangement restored.':'Visible nodes organized. Drag any node to fine-tune the layout.');
}

function calculateNetwork(force=false) {
  const nodes=spaceNodes(),links=studioLinks();
  const signature=network.layout+'|'+(network.layout==='orbit'?activeSpace().orbitRoot||'':'')+'|'+activeSpace().id+'|'+JSON.stringify(nodes.map(n=>[n.id,n.kind,n.name]))+'|'+links.map(connectionKey).join(',');
  if(signature===network.signature&&!force)return;
  network.signature=signature;
  if(spatialLayout(network.layout)){
    const {cloud,landmarks,regions,ridges}=atlasCloud(nodes,links);
    if(network.layout==='signal'){
      const field=signalField(regions);network.cloud=field.cloud;network.lanes=field.lanes;
    }else network.cloud=network.layout==='atlas'?cloud:spatialCloud(regions);
    network.landmarks=landmarks;network.regions=regions;network.ridges=ridges;network.kinds=new Map(nodes.map(n=>[n.id,n.kind]));
    updateProjection();
    return;
  }
  if(network.layout==='clusters'){
    const {regions}=atlasCloud(nodes,links);
    const {positions,districts}=clusterArrangement(regions);
    network.positions=positions;network.regions=regions;network.districts=districts;
    return;
  }
  if(network.layout==='orbit'){
    network.orbit=orbitArrangement(nodes,links,activeSpace().orbitRoot);
    network.positions=network.orbit.positions;
    return;
  }
  if(network.layout==='flow'){
    const {positions,columns}=flowArrangement(nodes);
    network.positions=positions;network.flowColumns=columns;
    return;
  }
  const saved=activeSpace().graphPositions||{};
  // Keep manual placements for large graphs without running a full force simulation.
  if (nodes.length > 180) {
    const placed=organizedGraphPositions(nodes,links);
    const old=new Map();
    let maximumY=0;
    for (const node of nodes) {
      const point=saved[node.id]||network.positions.get(node.id);
      if (!point) continue;
      old.set(node.id,point);
      maximumY=Math.max(maximumY,point[1]);
    }
    const offset=old.size?maximumY+160:0;
    for (const [id,point] of placed) if (!old.has(id)) old.set(id,[point[0],point[1]+offset]);
    network.positions=old;
    return;
  }
  const degree=new Map(nodes.map(n=>[n.id,0]));
  for(const l of links){degree.set(l.from,degree.get(l.from)+1);degree.set(l.to,degree.get(l.to)+1)}
  const order=[...nodes].sort((a,b)=>degree.get(b.id)-degree.get(a.id));
  const points=order.map((n,i)=>{
    const p=!force&&(saved[n.id]||network.positions.get(n.id));
    const angle=i*2.399963, radius=100+Math.sqrt(i)*90;
    return {id:n.id,x:p?p[0]:Math.cos(angle)*radius,y:p?p[1]:Math.sin(angle)*radius,vx:0,vy:0,pinned:!!p};
  });
  const map=new Map(points.map(p=>[p.id,p]));
  const iterations=points.length>250?90:220;
  for(let iteration=0;iteration<iterations;iteration++) {
    for(let i=0;i<points.length;i++) {
      const a=points[i];
      const stride=points.length>250?Math.ceil(points.length/70):1;
      for(let j=i+1+(iteration%stride);j<points.length;j+=stride) {
        const b=points[j],dx=a.x-b.x,dy=a.y-b.y,dist=Math.max(25,dx*dx+dy*dy);
        const magnitude=13000/Math.max(1,points.length/50)/dist;
        const length=Math.sqrt(dist);
        const fx=dx/length*magnitude,fy=dy/length*magnitude;
        a.vx+=fx;a.vy+=fy;b.vx-=fx;b.vy-=fy;
      }
    }
    for(const l of links) {
      const a=map.get(l.from),b=map.get(l.to);if(!a||!b)continue;
      const dx=b.x-a.x,dy=b.y-a.y,length=Math.max(1,Math.hypot(dx,dy));
      const force=(length-160)*.012;
      a.vx+=dx/length*force;a.vy+=dy/length*force;b.vx-=dx/length*force;b.vy-=dy/length*force;
    }
    for(const p of points) {
      if(p.pinned){p.vx=0;p.vy=0;continue}
      p.vx=(p.vx-p.x*.0008)*.75;p.vy=(p.vy-p.y*.0008)*.75;
      p.x+=Math.max(-8,Math.min(8,p.vx));p.y+=Math.max(-8,Math.min(8,p.vy));
    }
  }
  network.positions=new Map(points.map(p=>[p.id,p.pinned?[p.x,p.y]:[p.x*1.65,p.y*.9]]));
}
function networkButton(action,label,key='',extra='') {
  return '<button type="button" data-network="'+action+'" data-key="'+esc(key)+'" '+extra+'>'+label+'</button>';
}
const graphDegrees = new WeakMap();
function degreeFor(id,links) {
  let counts=graphDegrees.get(links);
  if (!counts) {
    counts=new Map();
    for (const {from,to} of links) {
      counts.set(from,(counts.get(from)||0)+1);
      if (from!==to) counts.set(to,(counts.get(to)||0)+1);
    }
    graphDegrees.set(links,counts);
  }
  return counts.get(id)||0;
}
function networkNode(n,links) {
  const position=network.positions.get(n.id)||[0,0];
  const radius=(9+Math.min(11,Math.sqrt(degreeFor(n.id,links))*2.5))*network.nodeScale;
  return '<g class="knowledge-node '+n.kind+(studio.selected.has(n.id)?' selected':'')+(n.sample?' sample-node':'')+'" data-knowledge-node="'+esc(n.id)+'" transform="translate('+position.join(' ')+')" tabindex="-1" role="button" aria-label="Open '+esc(n.name)+'"><title>'+esc(n.name)+'</title><circle class="node-hit" r="'+Math.max(24,radius+10)+'"/><circle class="node-ring" r="'+(radius+7)+'"/><circle class="orb-body" r="'+radius+'" fill="url(#orb-'+n.kind+')"/><circle class="orb-reflection" r="'+(radius-.5)+'" fill="url(#orb-reflection)"/><circle class="orb-outline" r="'+radius+'" fill="none" stroke="url(#orb-rim)"/>'+nodeSignature(n,radius)+'<text x="'+(radius+13)+'" y="4">'+esc(n.name.replace(/\.md$/,''))+'</text></g>';
}

function renderNetwork() {
  ensureStudio();applyAppearance();
  const space=activeSpace();
  if(network.pull){
    cancelAnimationFrame(network.springFrame);
    network.pull=null;network.signature='';
  }
  const layout=workspaceGraphLayout(space),cameraKey=graphCameraKey(layout);
  space.graphLayout=layout;
  if(network.space!==space.id || network.layout!==layout) {
    if(network.space!==space.id)network.trail=[];
    network.positions.clear();network.signature='';network.space=space.id;network.layout=layout;
    network.camera={...(space[cameraKey]||{x:0,y:0,scale:1})};network.needFit=!space[cameraKey];
    if(spatialLayout(layout))network.orientation=savedOrientation(space,layout);
    const options=space.graphSettings||{};network.labels=options.labels||'auto';network.nodeScale=options.nodeScale||1;network.edgeOpacity=options.edgeOpacity??.35;
  }
  calculateNetwork();
  document.body.classList.add('mindspace','knowledge-mode');document.body.classList.remove('studio','immersive');
  const {nodes,links}=networkData();
  const query=network.search.trim().toLowerCase();
  const explorerNodes=spaceNodes().filter(node=>matchesExplorerQuery(node,query));
  if(network.previousCount===0&&nodes.length)network.needFit=true;network.previousCount=nodes.length;
  const layoutSwitch='<div class="graph-layouts" role="group" aria-label="Graph layout">'+Object.entries(graphLayouts).map(([key,name])=>
    networkButton('layout',name,key,'title="'+esc(graphLayoutHelp[key])+'" aria-pressed="'+(layout===key)+'"')).join('')+'</div>';
  const investigation=investigationStates.get(space);
  const investigateEntry=investigationButton('open','Investigate','','class="invest-entry" aria-controls="investigation-pane" aria-expanded="'+!!(investigation&&(innerWidth>760||investigation.sheet))+'"');
  const angles=[['left','Turn left'],['right','Turn right'],['up','Tilt up'],['down','Tilt down'],['ccw','Roll left'],['cw','Roll right'],['reset','Reset angle']];
  const viewControl=spatialLayout(layout)&&nodes.length?'<select class="graph-angle" aria-label="3D view angle" title="Choose an angle, or Alt-drag to roll"><option selected disabled>View angle</option>'+angles.map(([key,label])=>'<option value="'+key+'">'+label+'</option>').join('')+'</select>':'';
  const layoutTools='<div class="graph-view-tools"><button data-reading="home">Back to files</button>'+layoutSwitch+viewControl+investigateEntry+'</div>';
  const selected=!investigation&&studioNodes().find(n=>n.id===network.focus);
  $('#content').innerHTML='<header class="knowledge-header"><div class="knowledge-brand">'+brandMark()+'<div class="brand-family"><strong>Agenetic</strong><small>by Groundplanes</small></div></div><button data-command="spaces" class="knowledge-space">'+esc(space.name)+lineIcon('chevron')+'</button><div class="view-switch" aria-label="Workspace view">'+networkButton('graph',lineIcon('graph')+'Graph','','class="active" aria-pressed="true"')+networkButton('canvas',lineIcon('canvas')+'Canvas','','aria-pressed="false"')+'</div><div class="knowledge-header-actions"><span class="private-label">'+(space.id===data.exampleSpaceId?'Example data':'Local workspace')+'</span>'+networkButton('appearance',lineIcon('palette')+'Appearance','','aria-label="Appearance"')+''+networkButton('filters',lineIcon('settings'),'','aria-label="Graph settings" aria-expanded="'+network.settings+'"')+studioButton('share',lineIcon('download')+'Export','','aria-label="Export workflow"')+'</div></header>'+
  '<aside id="graph-explorer" class="knowledge-explorer" aria-label="Graph explorer"><div class="explorer-title"><span>EXPLORER</span>'+studioButton('note',lineIcon('plus'),'','aria-label="New note"')+'</div><label class="knowledge-search">'+lineIcon('search')+'<input id="knowledge-query" type="search" value="'+esc(network.search)+'" placeholder="Search this space" aria-label="Search this space"></label><div class="space-navigation">'+networkButton('all',lineIcon('graph')+'All connections','','class="'+(!network.focus?'current':'')+'"')+'</div><div class="knowledge-file-list">'+['file','agent','task','model'].map(kind=>{
    const items=explorerNodes.filter(n=>n.kind===kind);if(!items.length)return '';
    return '<details data-explorer-kind="'+kind+'" '+(space.explorerClosed?.includes(kind)?'':'open')+'><summary>'+({file:'Notes and sources',agent:'Agents',task:'Tasks',model:'Models'}[kind])+'<span>'+items.length+'</span></summary>'+items.map(n=>networkButton('open',lineIcon({file:'note',agent:'agent',task:'task',model:'model'}[kind])+'<span>'+esc(n.name)+'</span>'+(n.research?'<small class="research-state">'+esc(researchStateLabel(n))+'</small>':''),n.id,'class="'+(studio.selected.has(n.id)?'selected':'')+'"')).join('')+'</details>';
  }).join('')+(!explorerNodes.length&&query?'<p role="status">No matching items in this workspace.</p>':'')+'</div><div class="knowledge-explorer-footer">'+studioButton('import',lineIcon('folder')+'Import files')+studioButton('runtime',lineIcon('model')+'Local models')+networkButton('example',lineIcon('graph')+'Explore example space')+'</div></aside>'+
  (investigation?'<aside id="investigation-pane" aria-label="Investigate workspace"></aside>':'')+
  '<main class="network-stage" data-layout="'+layout+'" tabindex="-1" aria-label="Knowledge graph"><div class="grid-field" aria-hidden="true"></div><div class="network-context"><span>'+ (selected?'LOCAL GRAPH':'KNOWLEDGE GRAPH')+'</span><h1>'+esc(selected?selected.name.replace(/\.md$/,''):space.name)+'</h1><p id="graph-count">'+nodes.length+' nodes <span>·</span> '+links.length+' connections'+(nodes.length!==spaceNodes().length?' · '+(spaceNodes().length-nodes.length)+' hidden by this view':'')+'</p>'+layoutTools+'<p class="layout-hint">'+esc(graphLayoutHelp[layout])+'</p>'+(selected?'<div class="depth-control">'+networkButton('depth','1 hop','1','class="'+(network.depth===1?'active':'')+'"')+networkButton('depth','2 hops','2','class="'+(network.depth===2?'active':'')+'"')+networkButton('all','Clear focus')+'</div>':'')+'</div><svg class="knowledge-svg" role="group" aria-label="Workspace graph. Use arrow keys to move between items. Press Enter or Space to open an item.">'+(layout==='freeform'?orbDefinitions():'')+'<g class="network-world">'+graphViewUnderlay(nodes)+'<g class="network-edges">'+links.map(graphLinkMarkup).join('')+'</g>'+(spatialLayout(layout)?'<g class="spatial-signals" aria-hidden="true"></g>':'')+'<g class="network-nodes">'+nodes.map(n=>networkNode(n,links)).join('')+'</g></g></svg>'+
  (!nodes.length?'<div class="graph-empty"><h2>'+ (spaceNodes().length?'Nothing matches this view':'Add your first source')+'</h2><p>'+(spaceNodes().length?'Try another search or restore your filters.':'Drop your files into this space, write a note, or explore the example. Connections appear as you link real material.')+'</p>'+(spaceNodes().length?networkButton('reset','Reset filters'):studioButton('import','Import files')+studioButton('note','Write a note')+networkButton('example','Explore example'))+'</div>':'')+
  '<div class="edge-key" aria-label="Relationship legend"><span><i></i>Reference / wiki link</span><span><i></i>Context / assignment / model</span></div><div class="network-footer"><div class="type-filters" aria-label="Filter node types">'+['file','agent','task','model'].map(kind=>networkButton('type','<i class="type-dot '+kind+'"></i>'+({file:'Notes and sources',agent:'Agents',task:'Tasks',model:'Models'}[kind]),kind,'aria-pressed="'+network.types.has(kind)+'"')).join('')+'</div><div class="graph-navigation">'+networkButton('zoom-out',lineIcon('minus'),'','aria-label="Zoom out"')+'<span id="network-zoom"></span>'+networkButton('zoom-in',lineIcon('plus'),'','aria-label="Zoom in"')+networkButton('fit',lineIcon('fit')+'<span>Center</span>','','title="Center visible nodes · F"')+
  (layout==='freeform'?networkButton('arrange',lineIcon('canvas')+'<span>Organize</span>','','title="Organize visible nodes by connections"'):'')+
  (layout==='freeform'&&space.graphArrangeUndo?networkButton('undo-arrange',lineIcon('undo'),'','aria-label="Undo graph organization" title="Undo organization"'):'')+'</div></div></main><div class="network-add">'+studioButton('note',lineIcon('note')+'Note')+studioButton('agent',lineIcon('agent')+'Agent')+studioButton('task',lineIcon('task')+'Task')+'</div>'+
  '<aside id="space-inspector" hidden></aside><aside id="space-library" hidden></aside>'+
  (network.settings?'<section class="graph-settings"><div class="floating-heading"><h2>Graph settings</h2>'+networkButton('filters',lineIcon('close'),'','aria-label="Close graph settings"')+'</div><label>Labels<select id="graph-labels" aria-label="Graph labels">'+['auto','always','off'].map(v=>'<option value="'+v+'" '+(network.labels===v?'selected':'')+'>'+({auto:'Automatic',always:'Always visible',off:'Selection only'}[v])+'</option>').join('')+'</select></label><label>Node size<input id="graph-size" type="range" min="0.6" max="1.8" step="0.1" value="'+network.nodeScale+'"></label><label>Edge visibility<input id="graph-edges" type="range" min="0.08" max="0.65" step="0.01" value="'+network.edgeOpacity+'"></label><p>'+({signal:graphLayoutHelp.signal,spatial:'Drag a record to pull its linked neighbors. Release to settle them back. Drag empty space to rotate, Shift-drag to pan, or Alt-drag to roll.',atlas:'Nearby records share a hub or component. The fine contours show the surface. Colored marks are records. Drag a record to pull its neighbors. Drag the surface to rotate, Shift-drag to pan, or Alt-drag to roll.',flow:'Columns group records by type. Curves follow saved links. Select a record to see the direction and kind of each connection.',clusters:graphLayoutHelp.clusters,orbit:graphLayoutHelp.orbit,freeform:'Drag a node to place it, or organize the visible nodes by their connections.'}[layout])+'</p>'+(layout==='freeform'?networkButton('arrange','Organize visible nodes'):'')+'</section>':'')+
  appearancePanel()+'<div id="connect-banner" '+(!studio.connecting?'hidden':'')+'>Choose a node to connect'+studioButton('cancel','Cancel')+'</div>';
  network.hovered=null;
  if(investigation)renderInvestigation(investigation,nodes,links);
  if(spatialLayout(layout))orderSpatialNodes($('.knowledge-svg'));
  observeGraphViewport(space);drawInspector();applyNetworkCamera();highlightNetwork();
  if(network.needFit){network.needFit=false;requestAnimationFrame(()=>{if(activeSpace()===space&&network.layout===layout&&inNetwork())fitNetwork()})}
}
render=function() {
  ensureStudio();
  if(inNetwork()){renderNetwork();return}
  document.body.classList.remove('knowledge-mode');canvasRender();
  if(page==='Overview'||page==='Graph') {
    $('.space-header').insertAdjacentHTML('beforeend','<div class="view-switch canvas-view-switch">'+networkButton('graph',lineIcon('graph')+'Graph')+networkButton('canvas',lineIcon('canvas')+'Canvas','','class="active"')+'</div>');
  }
  normalizeIcons();applyAppearance();
};
let graphResizeObserver;
function observeGraphViewport(space){
  graphResizeObserver?.disconnect();
  const svg=$('.knowledge-svg');
  if(!svg||typeof ResizeObserver!=='function')return;
  function resize(){
    if(!svg.isConnected||activeSpace()!==space)return;
    const {width,height}=svg.getBoundingClientRect();
    if(!width||!height)return;
    const old=space.graphViewport;
    space.graphViewport={width,height};
    if(!old||!Number.isFinite(old.width)||!Number.isFinite(old.height)||network.needFit)return;
    if(width===old.width&&height===old.height)return;
    network.camera={...network.camera,x:network.camera.x+(width-old.width)/2,y:network.camera.y+(height-old.height)/2};
    space[graphCameraKey(network.layout)]={...network.camera};
    moveGraphCamera();
  }
  resize();
  graphResizeObserver=new ResizeObserver(resize);
  graphResizeObserver.observe(svg);
}
let graphPaintFrame = 0;
function moveGraphCamera() {
  const world = $('.network-world');
  if (!world) return;
  const {x, y, scale} = network.camera;
  world.setAttribute('transform', 'translate('+x+' '+y+') scale('+scale+')');
  world.style.setProperty('--label-scale', 1 / scale);
  $('#network-zoom').textContent = Math.round(scale * 100) + '%';
}
function scheduleGraphPaint() {
  if (graphPaintFrame) return;
  graphPaintFrame = requestAnimationFrame(() => {
    graphPaintFrame = 0;
    moveGraphCamera();
  });
}
function applyNetworkCamera() {
  const world=$('.network-world');if(!world)return;
  const c=network.camera;moveGraphCamera();
  $('.knowledge-svg').dataset.labels=network.labels;
  $('.network-edges').style.opacity=Math.min(.9,network.edgeOpacity*(spatialLayout(network.layout)?2.15:1.45));
  $('.network-stage').style.setProperty('--grid-x',(c.x*.12)+'px');$('.network-stage').style.setProperty('--grid-y',(c.y*.12)+'px');
  const stage=$('.network-stage');
  stage.dataset.overview=String((network.layout==='signal'||network.layout==='atlas'||network.layout==='spatial'&&network.positions.size>80)&&c.scale<1.6);
  placeNetworkLabels();
}
const graphLabelMetrics=new WeakMap();
const graphLabelSlots=new WeakMap();
function placeNetworkLabels() {
  const {scale,x:panX,y:panY}=network.camera;
  const groups=[...document.querySelectorAll('[data-knowledge-node]')];
  const overview=(network.layout==='signal'||network.layout==='atlas'||network.layout==='spatial'&&network.positions.size>80)&&scale<1.6&&network.labels==='auto';
  const viewport = $('.network-stage').getBoundingClientRect();
  const heading = document.querySelector('.network-context')?.getBoundingClientRect();
  const headingBoxes = heading ? [{
    x: heading.left - viewport.left,
    y: heading.top - viewport.top,
    width: heading.width,
    height: heading.height
  }] : [];
  // Labels, collision tiles and UI obstacles all use viewport pixels.
  const cell=128, tiles=new Map();
  function visit(box,fn){
    const right=Math.floor((box.x+box.width)/cell),bottom=Math.floor((box.y+box.height)/cell);
    for(let x=Math.floor(box.x/cell);x<=right;x++)
      for(let y=Math.floor(box.y/cell);y<=bottom;y++)fn(x+','+y);
  }
  function insert(box){
    visit(box,key=>{let tile=tiles.get(key);if(!tile){tile=[];tiles.set(key,tile);}tile.push(box);});
  }
  headingBoxes.forEach(insert);
  for(const guide of document.querySelectorAll('.orbit-guides text,.cluster-guides text')){
    const box=guide.getBBox();
    insert({x:panX+box.x*scale-4,y:panY+box.y*scale-3,width:box.width*scale+8,height:box.height*scale+6});
  }
  for(const group of groups){
    const id=group.dataset.knowledgeNode,point=network.positions.get(id),r=Number(group.querySelector('.orb-body').getAttribute('r'))*(network.depths&&spatialLayout(network.layout)?network.depths.get(id)?.scale??1:1);
    insert({id,x:(point[0]-r)*scale+panX,y:(point[1]-r)*scale+panY,width:r*2*scale,height:r*2*scale});
  }
  const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
  const focused=document.activeElement?.closest('[data-knowledge-node]')?.dataset.knowledgeNode;
  // In an overview only landmarks, query hits and active labels can be visible.
  // Keep all marker obstacles, but avoid measuring and positioning hidden text.
  const labels=overview?groups.filter(g=>g.matches('.landmark,.invest-hit,.selected')||
    g.dataset.knowledgeNode===focused||g.dataset.knowledgeNode===network.hovered):groups;
  if(overview||network.layout==='orbit'||$('.knowledge-svg').classList.contains('has-investigation')){
    const priority=g=>g.classList.contains('orbit-center')?4:g.classList.contains('invest-endpoint')?3:g.classList.contains('invest-hit')?2:Number(g.classList.contains('landmark'));
    labels.sort((a,b)=>priority(b)-priority(a));
  }
  // SVG text measurements can flush layout. Read all missing metrics before writes.
  const full=scale>=.8&&!['signal','atlas','spatial','orbit','clusters'].includes(network.layout),fontStatus=document.fonts?.status;
  for(const group of labels){
    const text=group.querySelector('text'),state=full&&text.querySelector('.node-state-label');
    const metric=graphLabelMetrics.get(text);
    if(metric&&metric.full===!!state&&metric.fontStatus===fontStatus)continue;
    const length=text.firstChild?.textContent.length||0;
    graphLabelMetrics.set(text,{full:!!state,fontStatus,width:Math.max(length?text.getSubStringLength(0,length):0,state?state.getComputedTextLength():0)});
  }
  for(const group of labels) {
    const id=group.dataset.knowledgeNode,[worldX,worldY]=network.positions.get(id),text=group.querySelector('text');
    const r=Number(group.querySelector('.orb-body').getAttribute('r'))*(network.depths&&spatialLayout(network.layout)?network.depths.get(id)?.scale??1:1)*scale,gap=12;
    const x=worldX*scale+panX,y=worldY*scale+panY;
    if(x < -96 || y < -64 || x > viewport.width+96 || y > viewport.height+64){
      group.classList.add('label-collision');continue;
    }
    const state = text.querySelector('.node-state-label');
    const metric=graphLabelMetrics.get(text);
    const width=metric.width,height=metric.full?32:16;
    const extraSlots=network.layout==='atlas'?[]:[-2,2,-3,3,-4,4,-5,5,-6,6];
    const candidates=[{x:r+gap,y:4},{x:-width/2,y:-r-gap},{x:-width/2,y:r+gap+height/2},{x:-r-gap-width,y:4},...extraSlots.map(step=>({x:r+gap,y:step*height}))];
    const cost=candidate=>{
      const box={x:x+candidate.x-3,y:y+candidate.y-13,width:width+6,height};
      const outside=box.x<16||box.x+box.width>viewport.width-16||box.y<16||box.y+box.height>viewport.height-100;
      let hits=outside?10:0;
      const checked=new Set();
      visit(box,key=>{
        for(const other of tiles.get(key)||[]){
          if(other.id===id||checked.has(other))continue;
          checked.add(other);
          if(overlap(box,other))hits+=other.id?2:1;
        }
      });
      return {box,hits};
    };
    let slot=graphLabelSlots.get(group) ?? 0;
    let best=cost(candidates[slot]);
    for(let i=0;best.hits && i<candidates.length;i++){
      if(i===slot)continue;
      const result=cost(candidates[i]);
      if(result.hits<best.hits){slot=i;best=result;}
    }
    graphLabelSlots.set(group,slot);
    const selected=candidates[slot];
    text.setAttribute('x',selected.x);text.setAttribute('y',selected.y);
    if (state) {
      state.setAttribute('x', selected.x);
      state.setAttribute('dy', 15);
    }
    if(!best.hits&&(!overview||group.matches('.landmark,.invest-hit')))insert(best.box);
    const tether=group.querySelector('.node-tether');if(tether){const tx=selected.x<0?selected.x+width/2:selected.x-4,ty=selected.y-4,d=Math.hypot(tx,ty)||1;tether.setAttribute('x1',tx/d*(r+4));tether.setAttribute('y1',ty/d*(r+4));tether.setAttribute('x2',tx);tether.setAttribute('y2',ty)}
    group.classList.toggle('label-collision',best.hits>0);
  }
}
function persistNetwork() {
  activeSpace()[graphCameraKey(network.layout)]={...network.camera};
  activeSpace().graphSettings={labels:network.labels,nodeScale:network.nodeScale,edgeOpacity:network.edgeOpacity};
  save().catch(report);
}
function fitNetwork(onlyIds) {
  const stage=$('.network-stage');if(!stage)return;
  const visible=networkData().nodes,nodes=onlyIds instanceof Set?visible.filter(n=>onlyIds.has(n.id)):visible,bounds=stage.getBoundingClientRect();
  if(!nodes.length)return;
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for (const node of nodes) {
    const point=network.positions.get(node.id);
    if (!point || !point.every(Number.isFinite)) continue;
    const [x,y]=point;
    minX=Math.min(minX,x-35);maxX=Math.max(maxX,x+190);
    minY=Math.min(minY,y-35);maxY=Math.max(maxY,y+35);
  }
  if (!Number.isFinite(minX)) return;
  if(!onlyIds&&network.layout==='atlas'&&!network.focus&&!network.search&&network.types.size===4){
    // Frame the full relief, including its outer contours.
    const paths=stage.querySelector('.atlas-surface');
    const box=paths?.getBBox();
    if(box?.width&&box.height){minX=box.x-16;maxX=box.x+box.width+16;minY=box.y-16;maxY=box.y+box.height+16;}
  }
  if(!onlyIds&&nodes.length===network.positions.size){
    if(network.layout==='orbit'&&network.orbit.rings.length){
      const r=network.orbit.rings.at(-1).radius+26;minX=-r-26;maxX=r+46;minY=-r-20;maxY=r+20;
    }else if(network.layout==='clusters'){
      for(const g of network.districts){
        minX=Math.min(minX,g.x-g.radius-10);maxX=Math.max(maxX,g.x+g.radius+10);
        minY=Math.min(minY,g.y-g.radius-32);maxY=Math.max(maxY,g.y+g.radius+10);
      }
    }
  }
  if(network.layout==='flow')minY-=30;
  const heading=stage.querySelector('.network-context')?.getBoundingClientRect();
  const top=Math.min(bounds.height*.42,Math.max(120,(heading?.bottom??bounds.top)-bounds.top+22)),bottom=Math.min(80,bounds.height*.18);
  const availableWidth=Math.max(1,bounds.width-48),availableHeight=Math.max(1,bounds.height-top-bottom);
  const scale=Math.max(.04,Math.min(1.4,availableWidth/(maxX-minX),availableHeight/(maxY-minY)));
  network.camera={
    x:bounds.width/2-(minX+maxX)*scale/2,
    y:top+availableHeight/2-(minY+maxY)*scale/2,
    scale
  };
  applyNetworkCamera();persistNetwork();
}
function zoomNetwork(factor,x,y,continuous=false) {
  const c=network.camera,scale=Math.max(.04,Math.min(3,c.scale*factor));
  network.camera={x:x-(x-c.x)*scale/c.scale,y:y-(y-c.y)*scale/c.scale,scale};if(continuous)scheduleGraphPaint();else applyNetworkCamera();
}
// Index only the visible projection. Graph gestures never need to parse source notes.
let graphElements;
function indexedGraph(svg) {
  const first=svg.querySelector('.network-nodes')?.firstElementChild;
  if (graphElements?.svg===svg && graphElements.first===first) return graphElements;
  const nodes=new Map(), edges=new Map();
  for (const node of svg.querySelectorAll('[data-knowledge-node]')) {
    nodes.set(node.dataset.knowledgeNode,node);
    edges.set(node.dataset.knowledgeNode,[]);
  }
  const links=Array.from(svg.querySelectorAll('.knowledge-edge'));
  for (const edge of links) {
    const {source,target}=edge.dataset;
    edges.get(source)?.push(edge);
    if(source!==target) edges.get(target)?.push(edge);
  }
  const tabId=[...studio.selected].find(key=>nodes.has(key))||(nodes.has(graphElements?.tabId)?graphElements.tabId:nodes.keys().next().value);
  for(const [key,node] of nodes){
    node.setAttribute('tabindex',key===tabId?'0':'-1');
    node.setAttribute('aria-pressed',String(studio.selected.has(key)));
  }
  graphElements={svg,first,nodes,edges,links,tabId,lit:new Set(),selected:new Set(studio.selected),id:null};
  return graphElements;
}
function highlightNetwork() {
  const svg=$('.knowledge-svg');
  if(!svg)return;
  const graph=indexedGraph(svg);
  const focused=document.activeElement?.closest('[data-knowledge-node]')?.dataset.knowledgeNode;
  const inspected=studio.inspector?[...studio.selected][0]:null;
  const keyboard=document.activeElement?.matches(':focus-visible')?focused:null;
  const id=[network.drag?.moved&&network.drag.pullId,keyboard,inspected,network.hovered,focused,...studio.selected].find(id=>graph.nodes.has(id))||null;
  const tabId=focused||inspected;
  if(tabId&&graph.nodes.has(tabId)&&tabId!==graph.tabId){
    graph.nodes.get(graph.tabId)?.setAttribute('tabindex','-1');
    graph.nodes.get(tabId).setAttribute('tabindex','0');graph.tabId=tabId;
  }
  for(const key of graph.selected)if(!studio.selected.has(key)){const el=graph.nodes.get(key);el?.classList.remove('selected');el?.setAttribute('aria-pressed','false');}
  for(const key of studio.selected)if(!graph.selected.has(key)){const el=graph.nodes.get(key);el?.classList.add('selected');el?.setAttribute('aria-pressed','true');}
  graph.selected=new Set(studio.selected);
  svg.classList.toggle('has-node-highlight',!!id);
  if(graph.id===id)return;
  for(const element of graph.lit)element.classList.remove('graph-neighbor','related');
  graph.lit.clear();
  if(id){
    for(const edge of graph.edges.get(id)){
      const other=graph.nodes.get(edge.dataset.source===id?edge.dataset.target:edge.dataset.source);
      if(other)graph.lit.add(other);
      edge.classList.add('related');
    }
    graph.lit.add(graph.nodes.get(id));
    for(const node of graph.lit)node.classList.add('graph-neighbor');
    for(const edge of graph.edges.get(id))graph.lit.add(edge);
  }
  if(spatialLayout(network.layout))traceSpatialLinks(svg,id?graph.edges.get(id):[]);
  graph.id=id;
}
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>{
  const svg=$('.knowledge-svg');
  if(!svg||!spatialLayout(network.layout))return;
  const graph=indexedGraph(svg);
  traceSpatialLinks(svg,graph.id?graph.edges.get(graph.id)||[]:[]);
});
async function openNetworkNode(id,goingBack=false) {
  if(!await saveEditor())return;
  const node=spaceNodes().find(node=>node.id===id);
  if(!node){toast('This item is not in the current workspace.');return;}
  if(studio.connecting){await connectStudio(id);return}
  const previous=studio.inspector?[...studio.selected][0]:null;
  if(!previous)network.trail=[];
  else if(!goingBack&&previous!==id)network.trail=[...network.trail.slice(-31),previous];
  if(goingBack)network.trail.pop();
  studio.selected=new Set([id]);studio.inspector=true;network.settings=false;
  if(node.kind==='file'){const state=activeSpace().reading??={};state.primary=id;if(state.beside===id)state.beside='';await save();}
  const graph=$('.knowledge-svg');
  if(graph&&!indexedGraph(graph).nodes.has(id)){
    network.types.add(node.kind);
    if(!matchesExplorerQuery(node,network.search.trim().toLowerCase()))network.search='';
    if(!networkData().nodes.some(n=>n.id===id))network.focus=null;
    render();
  }
  for(const row of document.querySelectorAll('.knowledge-explorer [data-network="open"]')){
    const current=row.dataset.key===id;
    row.classList.toggle('selected',current);
    if(current)row.setAttribute('aria-current','true');else row.removeAttribute('aria-current');
  }
  drawInspector();highlightNetwork();
  const svg=$('.knowledge-svg'),panel=$('#space-inspector'),point=network.positions.get(id);
  const animate=appearance().motion!==false&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(animate&&panel&&previous!==id)panel.animate([{opacity:.55,translate:'10px 0'},{opacity:1,translate:'0 0'}],{duration:230,easing:'ease-out'});
  if(svg&&panel&&point){
    const box=svg.getBoundingClientRect(),inspector=panel.getBoundingClientRect();
    const right=inspector.left>box.left+120?Math.min(box.width,inspector.left-box.left):box.width;
    const c=network.camera,px=point[0]*c.scale+c.x,py=point[1]*c.scale+c.y;
    if(px<24||px>right-24||py<24||py>box.height-72){
      network.camera={...c,x:c.x+right/2-px,y:c.y+box.height/2-py};applyNetworkCamera();persistNetwork();
      if(animate){
        const world=svg.querySelector('.network-world');
        const transform=v=>'translate('+v.x+'px,'+v.y+'px) scale('+v.scale+')';
        world.getAnimations().forEach(a=>a.cancel());
        world.animate([{transform:transform(c)},{transform:transform(network.camera)}],{duration:330,easing:'cubic-bezier(.2,.72,.2,1)'});
      }
    }
  }
}
function addNetworkInspectorTools() {
  const el=$('#space-inspector');if(!el||el.hidden)return;
  const id=[...studio.selected][0];
  if(inNetwork()&&network.trail.length)el.querySelector('.floating-heading')?.insertAdjacentHTML('afterbegin',networkButton('back','Back','','class="graph-back" aria-label="Back to previous record"'));
  if(inNetwork()&&id&&network.layout==='orbit'&&network.orbit.root!==id)el.insertAdjacentHTML('beforeend','<div class="inspector-actions">'+networkButton('orbit-root','Center Orbit here',id)+'</div>');
  if(inNetwork()&&id)el.insertAdjacentHTML('beforeend','<div class="inspector-actions">'+networkButton('focus',lineIcon('graph')+'Explore connections',id)+'</div>');
  const node=studioNodes().find(n=>n.id===id);
  if(node&&inNetwork())el.insertAdjacentHTML('beforeend','<div class="inspector-actions">'+investigationButton('start','Trace from here',id)+(investigationStates.get(activeSpace())?.tab==='paths'?investigationButton('end','Trace to here',id):'')+(node.kind==='file'?investigationButton('source','Check source impact',id):'')+(node.research?investigationButton('claim','Inspect evidence',id):'')+'</div>');
  if(node){
    const count=degreeFor(node.id,studioLinks());
    const detail=node.kind==='agent'?(node.model?'Model assigned':'No model assigned'):node.kind==='task'?(node.status||'planned'):node.kind==='model'?'Registered local model':(node.text?node.text.trim().split(/\s+/).length+' words':node.text===''?'Empty note':'Original file');
    el.insertAdjacentHTML('afterbegin','<div class="record-provenance"><span>'+(node.sample?'EXAMPLE RECORD':'YOUR LOCAL RECORD')+'</span><p>'+esc(detail)+' · '+count+' connections</p></div>');
  }
  if(node?.kind==='file') {
    el.querySelector('#studio-editor')?.insertAdjacentHTML('beforeend','<p class="wiki-hint">Link a note with <code>[[Note title]]</code>. Its connection appears in the graph.</p>');
  }
}
drawInspector=function(){canvasDrawInspector();addNetworkInspectorTools();normalizeIcons()};
centerPoint=function(){if(inNetwork())return [100+spaceNodes().length%4*310,130+Math.floor(spaceNodes().length/4)*270];return canvasCenterPoint()};
studioCommand=async function(action,id) {
  if(inNetwork()) {
    if(action==='focus'){await openNetworkNode(id);return}
    if(action==='search'||action==='library'){
      if(appearance().explorerCollapsed && !await setExplorerCollapsed(false))return;
      $('#knowledge-query')?.focus();
      return;
    }
    if(action==='fit'){fitNetwork();return}
    if(action==='switch-space'){network.focus=null;network.search='';network.positions.clear();network.signature='';network.needFit=true}
  }
  await canvasCommand(action,id);
};
function normalizeIcons() {
  const map={note:'note',agent:'agent',task:'task',library:'library',group:'group',fit:'fit',share:'download',search:'search',undo:'undo',redo:'redo',zoomin:'plus',zoomout:'minus',connect:'link',import:'folder',runtime:'model'};
  for(const button of document.querySelectorAll('[data-command]')) {
    const action=button.dataset.command;
    if(button.querySelector('svg'))continue;
    if(map[action]) {
      const label=button.textContent.replace(/[▥▤◈↗⊞⌗↥⌕↶↷＋−×⋈→]/g,'').trim();
      button.innerHTML=lineIcon(map[action])+(label?'<span>'+esc(label)+'</span>':'');
    }
  }
  for(const el of document.querySelectorAll('.card-symbol')) {
    const card=el.closest('[data-card]'),node=studioNodes().find(n=>n.id===card?.dataset.card);
    el.innerHTML=lineIcon(node?.kind==='file'?'note':node?.kind||'note');
  }
  for(const el of document.querySelectorAll('.brand-orbit,.knowledge-brand'))el.innerHTML=brandMark()+'<div class="brand-family"><strong>Agenetic</strong><small>by Groundplanes</small></div>';
  for(const el of document.querySelectorAll('.inspector-type')) {
    const n=studioNodes().find(n=>n.id===[...studio.selected][0]);if(n)el.innerHTML=lineIcon(n.kind==='file'?'note':n.kind)+' '+esc(n.kind);
  }
  for(const el of document.querySelectorAll('.connection-port'))el.innerHTML=lineIcon('plus');
}
async function networkAction(action,key) {
  // Camera controls do not change the editor or require a valid note.
  if(action==='fit'){fitNetwork();return}
  if(action==='turn'&&spatialLayout(network.layout)){
    const axes={left:[0,-1,0],right:[0,1,0],up:[1,0,0],down:[-1,0,0],ccw:[0,0,-1],cw:[0,0,1]};
    if(key!=='reset'&&!Object.hasOwn(axes,key))return;
    network.orientation=key==='reset'?homeOrientation():composeRotation(axisRotation(...axes[key],Math.PI/6),network.orientation);
    paintSpatialGraph($('.knowledge-svg'));activeSpace()[network.layout+'Orientation']=network.orientation;
    applyNetworkCamera();persistNetwork();return;
  }
  if(action==='zoom-in'||action==='zoom-out'){
    const stage=$('.network-stage');if(!stage)return;
    const bounds=stage.getBoundingClientRect();
    zoomNetwork(action==='zoom-in'?1.2:1/1.2,bounds.width/2,bounds.height/2);
    persistNetwork();
    return;
  }
  if(!await saveEditor())return;
  if(action==='graph'||action==='canvas') {
    if(activeSpace().viewMode===action)return;
    activeSpace().viewMode=action;network.needFit=action==='graph'&&!activeSpace()[graphCameraKey(workspaceGraphLayout(activeSpace()))];studio.inspector=false;studio.selected.clear();await save();
    render();return;
  }
  if(action==='orbit-root'&&network.layout==='orbit'&&spaceNodes().some(n=>n.id===key)){
    const space=activeSpace(),previous=space.orbitRoot;space.orbitRoot=key;
    try{await save();}catch(error){space.orbitRoot=previous;throw error;}
    if(activeSpace()!==space)return;
    studio.inspector=false;studio.selected.clear();network.needFit=true;render();return;
  }
  if(action==='layout' && Object.hasOwn(graphLayouts,key)){
    const space=activeSpace(),previous=space.graphLayout;
    if(network.layout===key)return;
    space.graphLayout=key;
    try{await save();}catch(error){space.graphLayout=previous;throw error;}
    if(space!==activeSpace())return;
    render();document.querySelector('.graph-layouts [aria-pressed="true"]')?.focus({preventScroll:true});return;
  }
  if(action==='appearance'){appearanceOpen=!appearanceOpen;network.settings=false;studio.inspector=false;render();return}
  if(action==='example')return openExampleSpace();
  if(action==='open')return openNetworkNode(key);
  if(action==='back'){
    const available=new Set(spaceNodes().map(n=>n.id));
    network.trail=network.trail.filter(id=>available.has(id));
    if(network.trail.length)return openNetworkNode(network.trail.at(-1),true);
    drawInspector();return;
  }
  if(['focus','all','reset','type','filters'].includes(action))investigationStates.delete(activeSpace());
  if(action==='focus'){network.search='';network.types=new Set(['file','agent','task','model']);network.focus=key;network.depth=1;studio.inspector=false;network.needFit=true;render();return}
  if(action==='all'||action==='reset'){network.focus=null;studio.selected.clear();studio.inspector=false;network.search='';network.types=new Set(['file','agent','task','model']);network.needFit=true;render();return}
  if(action==='depth'){network.depth=Number(key);network.needFit=true;render();return}
  if(action==='type'){if(network.types.has(key))network.types.delete(key);else network.types.add(key);render();return}
  if(action==='filters'){network.settings=!network.settings;if(network.settings)studio.inspector=false;render();return}
  if(action==='arrange'||action==='undo-arrange')return changeGraphArrangement(action==='undo-arrange');
}
document.addEventListener('click',e=>{
  const action=e.target.closest('[data-network]');if(action){networkAction(action.dataset.network,action.dataset.key).catch(report);return}
  const node=e.target.closest('[data-knowledge-node]');if(node&&!network.ignoreClick)openNetworkNode(node.dataset.knowledgeNode).catch(report);
});
document.addEventListener('input',async e=>{
  if(e.target.id==='knowledge-query') {
    const original=e.target,value=original.value;
    const start=original.selectionStart,end=original.selectionEnd;
    if(studio.dirty&&!await saveEditor())return;
    if(!original.isConnected||original.value!==value)return;
    network.search=value;
    render();
    const input=$('#knowledge-query');
    if(input){input.focus({preventScroll:true});input.setSelectionRange(start,end);}
    return;
  }
  if(e.target.id==='graph-size'){network.nodeScale=Number(e.target.value);const {nodes,links}=networkData();$('.network-nodes').innerHTML=nodes.map(n=>networkNode(n,links)).join('');if(spatialLayout(network.layout))orderSpatialNodes($('.knowledge-svg'));applyNetworkCamera();highlightNetwork();persistNetwork()}
  if(e.target.id==='graph-edges'){network.edgeOpacity=Number(e.target.value);applyNetworkCamera();persistNetwork()}
});
document.addEventListener('change',e=>{if(e.target.matches('.graph-angle')){networkAction('turn',e.target.value).catch(report);e.target.selectedIndex=0;}if(e.target.id==='graph-labels'){network.labels=e.target.value;applyNetworkCamera();persistNetwork()}});
document.addEventListener('pointerover',e=>{const node=e.target.closest('[data-knowledge-node]');if(node&&network.hovered!==node.dataset.knowledgeNode){network.hovered=node.dataset.knowledgeNode;highlightNetwork()}});
document.addEventListener('pointerout',e=>{const node=e.target.closest('[data-knowledge-node]');if(node&&!node.contains(e.relatedTarget)){network.hovered=null;highlightNetwork()}});
document.addEventListener('pointerdown',e=>{
  const svg=e.target.closest('.knowledge-svg');
  if(!svg||e.button!==0||!e.isPrimary||studio.connecting)return;
  const node=e.target.closest('[data-knowledge-node]'),id=node?.dataset.knowledgeNode;
  const region=id?svg.querySelector('.neural-region[data-region-node="'+CSS.escape(id)+'"]'):null;
  const spatial=spatialLayout(network.layout);
  if(network.pull){cancelAnimationFrame(network.springFrame);network.pull=null;paintSpatialGraph(svg);}
  const pullId=spatial&&id&&!e.shiftKey&&!e.altKey?id:null;
  network.drag={id:network.layout==='freeform'?id:null,pullId,orbit:spatial&&!e.shiftKey&&!pullId,roll:e.altKey,
    svg,region,pointerId:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,
    camera:{...network.camera},position:id?[...network.positions.get(id)]:null,moved:false};
});
function neighborWeights(graph,id) {
  const weights=new Map([[id,1]]),queue=[id];
  for(let i=0;i<queue.length;i++){
    const key=queue[i],weight=weights.get(key);
    if(weight<.4)continue;
    for(const edge of graph.edges.get(key)||[]){
      const other=edge.dataset.source===key?edge.dataset.target:edge.dataset.source;
      if(!weights.has(other)){weights.set(other,weight===1?.42:.14);queue.push(other);}
    }
  }
  return weights;
}
function updateSpatialDrag(d,x,y){
  if(d.pullId){
    if(!network.pull)network.pull={weights:neighborWeights(indexedGraph(d.svg),d.pullId),delta:[0,0,0]};
    const scale=d.camera.scale*network.depths.get(d.pullId).scale,m=network.matrix;
    const dx=(x-d.x)/scale,dy=(y-d.y)/scale;
    network.pull.delta=[m[0]*dx+m[3]*dy,m[1]*dx+m[4]*dy,m[2]*dx+m[5]*dy];
  }else{
    const dx=x-d.lastX,dy=y-d.lastY;
    const radians=2*Math.PI/Math.max(480,Math.min(d.svg.clientWidth,d.svg.clientHeight)*1.3);
    const q=d.roll?axisRotation(0,0,1,dx*radians):axisRotation(-dy,dx,0,Math.hypot(dx,dy)*radians);
    network.orientation=composeRotation(q,network.orientation);
  }
  d.lastX=x;d.lastY=y;
}
function settleSpatialPull(svg){
  const pull=network.pull;
  if(!pull)return;
  const paintEnd=()=>{network.pull=null;paintSpatialGraph(svg);applyNetworkCamera();};
  if(appearance().motion===false||matchMedia('(prefers-reduced-motion: reduce)').matches){paintEnd();return;}
  const original=pull.delta,start=performance.now();
  function spring(time){
    if(network.pull!==pull)return;
    if(!svg.isConnected){network.pull=null;network.signature='';return;}
    const t=Math.max(0,(time-start)/1000);
    if(t>=.52||matchMedia('(prefers-reduced-motion: reduce)').matches){paintEnd();return;}
    // Critically damped return, independent of the display's refresh rate.
    const fraction=(1+16*t)*Math.exp(-16*t);
    pull.delta=original.map(v=>v*fraction);
    paintSpatialGraph(svg,true);network.springFrame=requestAnimationFrame(spring);
  }
  network.springFrame=requestAnimationFrame(spring);
}
document.addEventListener('pointermove',e=>{
  const d=network.drag;if(!d||d.pointerId!==e.pointerId)return;
  if(!d.svg.isConnected){network.drag=null;return}
  const dx=e.clientX-d.x,dy=e.clientY-d.y;if(!d.moved&&Math.hypot(dx,dy)<4)return;
  if(!d.moved){d.moved=true;if(d.pullId)highlightNetwork();if(d.svg.hasPointerCapture&&d.svg.isConnected&&e.buttons===1)d.svg.setPointerCapture(e.pointerId)}
  if(d.orbit||d.pullId){
    updateSpatialDrag(d,e.clientX,e.clientY);
    if(!d.frame)d.frame=requestAnimationFrame(()=>{
      d.frame=0;if(network.drag===d&&d.svg.isConnected)paintSpatialGraph(d.svg,true);
    });
  } else if(d.id) {
    const p=[d.position[0]+dx/d.camera.scale,d.position[1]+dy/d.camera.scale];network.positions.set(d.id,p);
    const graph=indexedGraph(d.svg);
    if(d.region){d.region.setAttribute('cx',p[0]);d.region.setAttribute('cy',p[1])}
    graph.nodes.get(d.id)?.setAttribute('transform','translate('+p.join(' ')+')');
    for(const edge of graph.edges.get(d.id)||[]) {
      if(edge.dataset.source===d.id){edge.setAttribute('x1',p[0]);edge.setAttribute('y1',p[1])}
      if(edge.dataset.target===d.id){edge.setAttribute('x2',p[0]);edge.setAttribute('y2',p[1])}
    }
  } else {network.camera.x=d.camera.x+dx;network.camera.y=d.camera.y+dy;scheduleGraphPaint()}
});
function endGraphGesture(event){
  const d=network.drag;if(!d||d.pointerId!==event.pointerId)return;
  network.drag=null;if(!d.moved||!d.svg.isConnected)return;
  network.ignoreClick=true;setTimeout(()=>network.ignoreClick=false,100);
  if(d.orbit||d.pullId){
    cancelAnimationFrame(d.frame);
    if(event.type==='pointerup')updateSpatialDrag(d,event.clientX,event.clientY);
    paintSpatialGraph(d.svg);
    if(d.pullId){settleSpatialPull(d.svg);highlightNetwork();}
    else activeSpace()[network.layout+'Orientation']=network.orientation;
  }
  if(d.id)activeSpace().graphPositions=Object.fromEntries(network.positions);
  applyNetworkCamera();persistNetwork();
}
for(const type of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(type,endGraphGesture);
document.addEventListener('wheel',e=>{
  const svg=e.target.closest('.knowledge-svg');
  if(!svg || !e.deltaY)return;
  e.preventDefault();
  const b=svg.getBoundingClientRect();
  const unit=e.deltaMode===1?16:e.deltaMode===2?b.height:1;
  const pixels=Math.max(-320,Math.min(320,e.deltaY*unit));
  zoomNetwork(Math.exp(-pixels*.001),e.clientX-b.left,e.clientY-b.top,true);
  // Navigation may replace the workspace before the throttled disk write.
  activeSpace()[graphCameraKey(network.layout)]={...network.camera};
  clearTimeout(network.cameraTimer);
  network.cameraTimer=setTimeout(()=>{
    if(svg.isConnected)applyNetworkCamera();
    save().catch(report);
  },150);
},{passive:false});
function moveGraphFocus(node,key){
  const graph=indexedGraph(node.closest('.knowledge-svg'));
  const id=node.dataset.knowledgeNode,[x,y]=network.positions.get(id);
  let target;
  if(key==='Home')target=node.parentElement.firstElementChild.dataset.knowledgeNode;
  else if(key==='End')target=node.parentElement.lastElementChild.dataset.knowledgeNode;
  else{
    const [horizontal,vertical]={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[key];
    let best=Infinity;
    for(const id of graph.nodes.keys()){
      const point=network.positions.get(id);if(!point)continue;
      const dx=point[0]-x,dy=point[1]-y;
      const along=dx*horizontal+dy*vertical,across=Math.abs(dx*vertical-dy*horizontal);
      if(along<=0)continue;
      const score=Math.hypot(dx,dy)+2*across;
      if(score<best){best=score;target=id}
    }
  }
  if(!target)return;
  const next=graph.nodes.get(target);
  next.focus({preventScroll:true});
  // Keep the keyboard cursor visible without disturbing scale or saved node positions.
  const [tx,ty]=network.positions.get(target),c=network.camera,box=graph.svg.getBoundingClientRect();
  const px=tx*c.scale+c.x,py=ty*c.scale+c.y;
  const margin=32;
  if(px<margin||py<margin||px>box.width-margin||py>box.height-margin){
    c.x+=box.width/2-px;c.y+=box.height/2-py;applyNetworkCamera();persistNetwork();
  }
}
document.addEventListener('keydown',e=>{
  if(!document.body.classList.contains('knowledge-mode')||document.querySelector('dialog[open]'))return;
  if(e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,textarea,select,[contenteditable=true]'))return;
  if(e.key==='f'||e.key==='F'){e.preventDefault();e.stopImmediatePropagation();fitNetwork()}
  const node=e.target.closest('[data-knowledge-node]');
  if(node&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)){
    e.preventDefault();e.stopImmediatePropagation();moveGraphFocus(node,e.key);return;
  }
  if(node&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)openNetworkNode(node.dataset.knowledgeNode).catch(report);}
},true);


async function openExampleSpace() {
  const existing=data.spaces.find(s=>s.id===data.exampleSpaceId);
  if(existing){await studioCommand('switch-space',existing.id);return}
  const specifications=[
    ['Workspace brief','Agenetic brings notes, local agents, and specific tasks into one connected workspace. People own their files and choose which information each agent can use. Start with [[File ownership]], define [[Agent context]], and review the [[Release checklist]].'],
    ['File ownership','Knowledge files are stored on the current device. Keep originals available for download and make exports deliberate. [[Public snapshots]] controls what leaves the workspace. [[Local inference]] explains where model execution happens.'],
    ['Agent context','An agent receives its role, instructions, and the knowledge explicitly connected to it. Use [[Knowledge links]] to explore related notes. Attach the smallest useful set of sources, then define an actionable step using [[Task handoffs]].'],
    ['Local inference','Register a GGUF model and start the local runner with that file. Connect using the session key displayed by the runner. Check [[Runtime verification]] before relying on outputs. The model runs on the device with the selected [[Agent context]].'],
    ['Runtime verification','Verify the model name, an authenticated connection, and one complete inference response. Inspect error handling when the runner is unavailable. Record the result in the [[Release checklist]].'],
    ['Task handoffs','Each workflow step needs a clear request, an assigned agent, and an expected result. Review output before using it in a later step. [[Research review]] defines the quality check; [[Output provenance]] records where information came from.'],
    ['Research review','Check that findings cite connected filenames and separate observations from assumptions. Preserve unanswered questions. Use [[Output provenance]] to keep a result traceable to its sources.'],
    ['Output provenance','Retain the task, agent, source filenames, and generated text together. A saved result should be reviewable after the run. [[Public snapshots]] requires a deliberate selection of material for sharing.'],
    ['Knowledge links','Write a link using double brackets around a note title. Connections show which ideas inform each other. [[Agent context]] describes the separate, explicit assignment of sources to an agent.'],
    ['Public snapshots','Enter the exact title and summary intended for public readers, review that text, then export the page. [[File ownership]] keeps the rest of the workspace local. Complete [[Research review]] before sharing generated claims.'],
    ['Design language','Use restrained typography, thin edges, and semantic color. Let the graph show relationships and reveal detail when selected. [[Knowledge links]] supports exploration; [[Task handoffs]] supports doing the work.'],
    ['Release checklist','Verify note editing, saved layouts, graph filtering, source assignment, and local execution. Complete [[Runtime verification]], review [[File ownership]], and inspect [[Design language]] before release.']
  ];
  await commitStudio(()=>{
    const files=specifications.map(([name,text])=>({id:crypto.randomUUID(),name,text,size:new Blob([text]).size,sample:true}));
    const byName=new Map(files.map(f=>[f.name,f.id]));data.files.push(...files);
    const agents=[
      {id:crypto.randomUUID(),name:'Research agent',role:'Research reviewer',task:'Review the connected workspace notes. List supported findings, cite filenames, and retain open questions.',files:['Workspace brief','Agent context','Research review','Output provenance'].map(n=>byName.get(n)),model:'',sample:true},
      {id:crypto.randomUUID(),name:'Runtime agent',role:'Runtime documentation reviewer',task:'Create a verification plan from the connected runtime notes. Identify checks that still need a real model run.',files:['Local inference','Runtime verification','Release checklist'].map(n=>byName.get(n)),model:'',sample:true},
      {id:crypto.randomUUID(),name:'Publishing agent',role:'Publication editor',task:'Draft a concise release summary from reviewed source material. Mark claims that need verification before public sharing.',files:['Public snapshots','File ownership','Design language','Research review'].map(n=>byName.get(n)),model:'',sample:true}
    ];data.agents.push(...agents);
    const tasks=agents.map((a,i)=>({id:crypto.randomUUID(),name:['Review source quality','Plan local verification','Draft release summary'][i],description:['Identify supported findings and open questions across the connected notes.','Write the checks needed to verify one local model run.','Draft a public summary using the connected notes and flag unverified claims.'][i],agent:a.id,status:'planned',sample:true}));data.tasks.push(...tasks);
    const id=crypto.randomUUID();data.spaces.push({id,name:'Agenetic · Example',members:[...files,...agents,...tasks].map(n=>n.id),positions:{},groups:[],viewMode:'graph'});
    data.exampleSpaceId=id;data.activeSpace=id;network.space=null;network.positions.clear();network.signature='';network.needFit=true;network.focus=null;studio.selected.clear();studio.inspector=false;
  });
}


const unlinkExplicit=unlinkStudio;
unlinkStudio=async function(key) {
  const [from,to,kind]=key.split('|');
  if(kind!=='wikilink')return unlinkExplicit(key);
  const source=data.files.find(f=>f.id===from),target=studioNodes().find(n=>n.id===to);
  if(!source||!target)return;
  await commitStudio(()=>{
    source.text=source.text.replace(/\[\[([^\]\n]+)\]\]/g,(full,reference)=>{
      const [name,label]=reference.split('|');
      return fileNameKey(name.split('#')[0])===fileNameKey(target.name)?(label||name):full;
    });
    source.size=new Blob([source.text]).size;
  });
};
if(typeof data!=='undefined'&&data)render();

document.fonts.ready.then(()=>{if(document.querySelector('.knowledge-svg'))applyNetworkCamera()});

// Keyboard focus uses the same visual neighborhood as pointer hover.
document.addEventListener('focusin',e=>{if(e.target.closest('[data-knowledge-node]'))highlightNetwork()});
document.addEventListener('focusout',e=>{if(e.target.closest('[data-knowledge-node]'))requestAnimationFrame(highlightNetwork)});

// Preserve explorer disclosure across re-renders without coupling it to appearance.
document.addEventListener('toggle',event=>{
 const item=event.target;
 if(!item.matches?.('details[data-explorer-kind]')||!item.isConnected||!inNetwork())return;
 const closed=new Set(activeSpace().explorerClosed||[]),kind=item.dataset.explorerKind;
 if(closed.has(kind)===!item.open)return;
 if(item.open)closed.delete(kind);else closed.add(kind);
 activeSpace().explorerClosed=[...closed];save().catch(report);
},true);
