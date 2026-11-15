'use strict';
// Knowledge relationships are derived from the same records used by the canvas.
const canvasRender = render;
const canvasCommand = studioCommand;
const canvasCenterPoint = centerPoint;
const explicitStudioLinks = studioLinks;
const canvasDrawInspector = drawInspector;
const glyphPaths = {
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
  hovered:null,space:null,ignoreClick:false,needFit:true
};
function inNetwork() { return (page==='Overview'||page==='Graph')&&activeSpace().viewMode!=='canvas'; }
function fileNameKey(value) { return value.replace(/\.md$/i,'').trim().toLowerCase(); }
studioLinks=function() {
  const links=explicitStudioLinks();
  const nodes=spaceNodes(),ids=new Set(nodes.map(n=>n.id));
  const names=new Map(studioNodes().map(n=>[fileNameKey(n.name),n.id]));
  for(const file of data.files) {
    if(!ids.has(file.id)||!file.text)continue;
    for(const match of file.text.matchAll(/\[\[([^\]\n]+)\]\]/g)) {
      const target=names.get(fileNameKey(match[1].split('|')[0].split('#')[0]));
      if(target&&target!==file.id&&ids.has(target)&&!links.some(l=>l.from===file.id&&l.to===target))links.push({from:file.id,to:target,kind:'wikilink'});
    }
  }
  return links;
};
function networkData() {
  let nodes=spaceNodes(),links=studioLinks();
  if(network.focus) {
    const included=new Set([network.focus]);
    for(let depth=0;depth<network.depth;depth++) {
      const frontier=new Set(included);
      for(const l of links)if(frontier.has(l.from)||frontier.has(l.to)){included.add(l.from);included.add(l.to)}
    }
    nodes=nodes.filter(n=>included.has(n.id));
  }
  const query=network.search.trim().toLowerCase();
  nodes=nodes.filter(n=>network.types.has(n.kind)&&(!query||[n.name,n.text,n.task,n.description].join(' ').toLowerCase().includes(query)));
  const ids=new Set(nodes.map(n=>n.id));links=links.filter(l=>ids.has(l.from)&&ids.has(l.to));
  return {nodes,links};
}
function calculateNetwork(force=false) {
  const nodes=spaceNodes(),links=studioLinks();
  const signature=activeSpace().id+'|'+nodes.map(n=>n.id).join(',')+'|'+links.map(connectionKey).join(',');
  if(signature===network.signature&&!force)return;
  network.signature=signature;
  const saved=activeSpace().graphPositions||{};
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
function degreeFor(id,links) { return links.filter(l=>l.from===id||l.to===id).length; }
function networkNode(n,links) {
  const position=network.positions.get(n.id)||[0,0];
  const radius=(9+Math.min(11,Math.sqrt(degreeFor(n.id,links))*2.5))*network.nodeScale;
  return '<g class="knowledge-node '+n.kind+(studio.selected.has(n.id)?' selected':'')+(n.sample?' sample-node':'')+'" data-knowledge-node="'+esc(n.id)+'" transform="translate('+position.join(' ')+')" tabindex="0" role="button" aria-label="Open '+esc(n.name)+'"><title>'+esc(n.name)+'</title><circle class="node-hit" r="'+Math.max(24,radius+10)+'"/><circle class="node-ring" r="'+(radius+7)+'"/><circle class="orb-body" r="'+radius+'" fill="url(#orb-'+n.kind+')"/><circle class="orb-reflection" r="'+(radius-.5)+'" fill="url(#orb-reflection)"/><circle class="orb-outline" r="'+radius+'" fill="none" stroke="url(#orb-rim)"/>'+nodeSignature(n,radius)+'<text x="'+(radius+13)+'" y="4">'+esc(n.name.replace(/\.md$/,''))+'</text></g>';
}

function renderNetwork() {
  ensureStudio();applyAppearance();calculateNetwork();
  const space=activeSpace();
  if(!space.graphLayoutVersion&&!Object.keys(space.graphPositions||{}).length){delete space.graphCamera;space.graphLayoutVersion=2;network.needFit=true}
  if(network.space!==space.id) {
    network.space=space.id;network.camera=space.graphCamera||{x:0,y:0,scale:1};network.needFit=!space.graphCamera;
    const options=space.graphSettings||{};network.labels=options.labels||'auto';network.nodeScale=options.nodeScale||1;network.edgeOpacity=options.edgeOpacity??.35;
  }
  document.body.classList.add('mindspace','knowledge-mode');document.body.classList.remove('studio','immersive');
  const {nodes,links}=networkData();
  if(network.previousCount===0&&nodes.length)network.needFit=true;network.previousCount=nodes.length;
  const selected=studioNodes().find(n=>n.id===network.focus);
  $('#content').innerHTML='<header class="knowledge-header"><div class="knowledge-brand">'+brandMark()+'<div class="brand-family"><strong>Agenetic</strong><small>by Groundplanes</small></div></div><button data-command="spaces" class="knowledge-space">'+esc(space.name)+lineIcon('chevron')+'</button><div class="view-switch" aria-label="Workspace view">'+networkButton('graph',lineIcon('graph')+'Graph','','class="active" aria-pressed="true"')+networkButton('canvas',lineIcon('canvas')+'Canvas','','aria-pressed="false"')+'</div><div class="knowledge-header-actions"><span class="private-label">'+(space.id===data.exampleSpaceId?'Example data':'Local workspace')+'</span>'+networkButton('appearance',lineIcon('palette')+'Appearance','','aria-label="Appearance"')+''+networkButton('filters',lineIcon('settings'),'','aria-label="Graph settings" aria-expanded="'+network.settings+'"')+studioButton('share',lineIcon('download')+'Export','','aria-label="Export workflow"')+'</div></header>'+
  '<aside class="knowledge-explorer"><div class="explorer-title"><span>EXPLORER</span>'+studioButton('note',lineIcon('plus'),'','aria-label="New note"')+'</div><label class="knowledge-search">'+lineIcon('search')+'<input id="knowledge-query" type="search" value="'+esc(network.search)+'" placeholder="Search this space" aria-label="Search this space"></label><div class="space-navigation">'+networkButton('all',lineIcon('graph')+'All connections','','class="'+(!network.focus?'current':'')+'"')+'</div><div class="knowledge-file-list">'+['file','agent','task','model'].map(kind=>{
    const items=spaceNodes().filter(n=>n.kind===kind);if(!items.length)return '';
    return '<details open><summary>'+({file:'Knowledge',agent:'Agents',task:'Workflow',model:'Models'}[kind])+'<span>'+items.length+'</span></summary>'+items.map(n=>networkButton('open',lineIcon({file:'note',agent:'agent',task:'task',model:'model'}[kind])+'<span>'+esc(n.name)+'</span>',n.id,'class="'+(studio.selected.has(n.id)?'selected':'')+'"')).join('')+'</details>';
  }).join('')+'</div><div class="knowledge-explorer-footer">'+studioButton('import',lineIcon('folder')+'Import files')+studioButton('runtime',lineIcon('model')+'Local models')+networkButton('example',lineIcon('graph')+'Explore example space')+'</div></aside>'+
  '<main class="network-stage" tabindex="-1" aria-label="Knowledge graph"><div class="grid-field" aria-hidden="true"></div><div class="network-context"><span>'+ (selected?'LOCAL GRAPH':'KNOWLEDGE GRAPH')+'</span><h1>'+esc(selected?selected.name.replace(/\.md$/,''):space.name)+'</h1><p id="graph-count">'+nodes.length+' nodes <span>·</span> '+links.length+' connections</p>'+(selected?'<div class="depth-control">'+networkButton('depth','1 hop','1','class="'+(network.depth===1?'active':'')+'"')+networkButton('depth','2 hops','2','class="'+(network.depth===2?'active':'')+'"')+networkButton('all','Clear focus')+'</div>':'')+'</div><svg class="knowledge-svg" aria-label="Notes, agents, and workflow relationships">'+orbDefinitions()+'<g class="network-world"><g class="network-edges">'+links.map(l=>{const a=network.positions.get(l.from),b=network.positions.get(l.to);return '<line class="knowledge-edge '+l.kind+'" data-source="'+esc(l.from)+'" data-target="'+esc(l.to)+'" x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+'"/>'}).join('')+'</g><g class="network-nodes">'+nodes.map(n=>networkNode(n,links)).join('')+'</g></g></svg>'+
  (!nodes.length?'<div class="graph-empty"><h2>'+ (spaceNodes().length?'Nothing matches this view':'Your ideas start here')+'</h2><p>'+(spaceNodes().length?'Try another search or restore your filters.':'Drop your files into this space, write a note, or explore the example. Connections appear as you link real material.')+'</p>'+(spaceNodes().length?networkButton('reset','Reset filters'):studioButton('import','Import files')+studioButton('note','Write a note')+networkButton('example','Explore example'))+'</div>':'')+
  '<div class="edge-key" aria-label="Relationship legend"><span><i></i>Reference / wiki link</span><span><i></i>Context / assignment / model</span></div><div class="network-footer"><div class="type-filters" aria-label="Filter node types">'+['file','agent','task','model'].map(kind=>networkButton('type','<i class="type-dot '+kind+'"></i>'+({file:'Knowledge',agent:'Agents',task:'Workflow',model:'Models'}[kind]),kind,'aria-pressed="'+network.types.has(kind)+'"')).join('')+'</div><div class="graph-navigation">'+networkButton('zoom-out',lineIcon('minus'),'','aria-label="Zoom out"')+'<span id="network-zoom"></span>'+networkButton('zoom-in',lineIcon('plus'),'','aria-label="Zoom in"')+networkButton('fit',lineIcon('fit'),'','aria-label="Fit graph"')+'</div></div></main><div class="network-add">'+studioButton('note',lineIcon('note')+'Note')+studioButton('agent',lineIcon('agent')+'Agent')+studioButton('task',lineIcon('task')+'Step')+'</div>'+
  '<aside id="space-inspector" hidden></aside><aside id="space-library" hidden></aside>'+
  (network.settings?'<section class="graph-settings"><div class="floating-heading"><h2>Graph settings</h2>'+networkButton('filters',lineIcon('close'),'','aria-label="Close graph settings"')+'</div><label>Labels<select id="graph-labels" aria-label="Graph labels">'+['auto','always','off'].map(v=>'<option value="'+v+'" '+(network.labels===v?'selected':'')+'>'+({auto:'Visible by default',always:'Always visible',off:'Selection only'}[v])+'</option>').join('')+'</select></label><label>Node size<input id="graph-size" type="range" min="0.6" max="1.8" step="0.1" value="'+network.nodeScale+'"></label><label>Edge visibility<input id="graph-edges" type="range" min="0.08" max="0.65" step="0.01" value="'+network.edgeOpacity+'"></label><p>Node size reflects the number of connections. Drag a node to place it.</p>'+networkButton('arrange','Arrange by relationships')+'</section>':'')+
  appearancePanel()+'<div id="connect-banner" '+(!studio.connecting?'hidden':'')+'>Choose a node to connect'+studioButton('cancel','Cancel')+'</div>';
  drawInspector();applyNetworkCamera();highlightNetwork();
  if(network.needFit){network.needFit=false;requestAnimationFrame(fitNetwork)}
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
function applyNetworkCamera() {
  const world=$('.network-world');if(!world)return;
  const c=network.camera;world.setAttribute('transform','translate('+c.x+' '+c.y+') scale('+c.scale+')');
  $('#network-zoom').textContent=Math.round(c.scale*100)+'%';
  $('.knowledge-svg').dataset.labels=network.labels!=='off'?'visible':'hidden';
  $('.network-edges').style.opacity=Math.min(.9,network.edgeOpacity*1.45);
  for(const label of document.querySelectorAll('.knowledge-node text'))label.style.fontSize=(12/c.scale)+'px';
  $('.network-stage').style.setProperty('--grid-x',(c.x*.12)+'px');$('.network-stage').style.setProperty('--grid-y',(c.y*.12)+'px');
  placeNetworkLabels();
}
function placeNetworkLabels() {
  const scale=network.camera.scale;
  const groups=[...document.querySelectorAll('[data-knowledge-node]')];
  const occupied=[];
  const orbBounds=groups.map(group=>{
    const id=group.dataset.knowledgeNode,point=network.positions.get(id),r=Number(group.querySelector('.orb-body').getAttribute('r'));
    return {id,x:point[0]-r,y:point[1]-r,width:r*2,height:r*2};
  });
  const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
  for(const group of groups) {
    const id=group.dataset.knowledgeNode,[x,y]=network.positions.get(id),text=group.querySelector('text');
    const r=Number(group.querySelector('.orb-body').getAttribute('r')),width=text.getComputedTextLength(),height=16/scale,gap=12/scale;
    const candidates=[{x:r+gap,y:4/scale},{x:-width/2,y:-r-gap},{x:-width/2,y:r+gap+height/2},{x:-r-gap-width,y:4/scale},...[-2,2,-3,3,-4,4,-5,5,-6,6].map(step=>({x:r+gap,y:step*height}))];
    const cost=candidate=>{
      const box={x:x+candidate.x-3/scale,y:y+candidate.y-height*.8,width:width+6/scale,height};
      const viewport=$('.network-stage').getBoundingClientRect(),c=network.camera;const outside=box.x*c.scale+c.x<16||(box.x+box.width)*c.scale+c.x>viewport.width-16||box.y*c.scale+c.y<16||(box.y+box.height)*c.scale+c.y>viewport.height-100;
      return {box,hits:(outside?10:0)+occupied.filter(b=>overlap(box,b)).length+orbBounds.filter(b=>b.id!==id&&overlap(box,b)).length*2};
    };
    let selected=candidates[0],best=cost(selected);
    for(const candidate of candidates.slice(1)){const result=cost(candidate);if(result.hits<best.hits){selected=candidate;best=result}if(!best.hits)break}
    text.setAttribute('x',selected.x);text.setAttribute('y',selected.y);occupied.push(best.box);
    const tether=group.querySelector('.node-tether');if(tether){const tx=selected.x<0?selected.x+width/2:selected.x-4/scale,ty=selected.y-4/scale,d=Math.hypot(tx,ty)||1;tether.setAttribute('x1',tx/d*(r+4));tether.setAttribute('y1',ty/d*(r+4));tether.setAttribute('x2',tx);tether.setAttribute('y2',ty)}
    group.classList.remove('label-collision');
  }
}
function persistNetwork() {
  activeSpace().graphCamera={...network.camera};
  activeSpace().graphSettings={labels:network.labels,nodeScale:network.nodeScale,edgeOpacity:network.edgeOpacity};
  save().catch(report);
}
function fitNetwork() {
  const stage=$('.network-stage');if(!stage)return;
  const {nodes}=networkData(),bounds=stage.getBoundingClientRect();
  if(!nodes.length)return;
  const points=nodes.map(n=>network.positions.get(n.id));
  const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0]));
  const minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]));
  const labelRoom=220;
  const width=Math.max(300,maxX-minX+labelRoom),height=Math.max(230,maxY-minY+140);
  const scale=Math.max(.1,Math.min(1.5,(bounds.width-260)/width,(bounds.height-280)/height));
  network.camera={x:bounds.width/2-(minX+maxX+80)/2*scale,y:145+(bounds.height-240)/2-(minY+maxY)/2*scale,scale};
  applyNetworkCamera();persistNetwork();
}
function zoomNetwork(factor,x,y) {
  const c=network.camera,scale=Math.max(.08,Math.min(3,c.scale*factor));
  network.camera={x:x-(x-c.x)*scale/c.scale,y:y-(y-c.y)*scale/c.scale,scale};applyNetworkCamera();
}
function highlightNetwork() {
  const id=network.hovered||document.activeElement?.closest('[data-knowledge-node]')?.dataset.knowledgeNode||[...studio.selected][0];
  const connected=new Set([id]);
  for(const l of studioLinks())if(l.from===id||l.to===id){connected.add(l.from);connected.add(l.to)}
  for(const node of document.querySelectorAll('[data-knowledge-node]')) {
    node.classList.toggle('dimmed',!!id&&!connected.has(node.dataset.knowledgeNode));
    node.classList.toggle('selected',studio.selected.has(node.dataset.knowledgeNode));
  }
  for(const edge of document.querySelectorAll('.knowledge-edge'))edge.classList.toggle('related',!!id&&(edge.dataset.source===id||edge.dataset.target===id));
}
async function openNetworkNode(id) {
  if(!await saveEditor())return;
  if(studio.connecting){await connectStudio(id);return}
  studio.selected=new Set([id]);studio.inspector=true;network.settings=false;drawInspector();highlightNetwork();
}
function addNetworkInspectorTools() {
  const el=$('#space-inspector');if(!el||el.hidden)return;
  const id=[...studio.selected][0];
  if(inNetwork()&&id)el.insertAdjacentHTML('beforeend','<div class="inspector-actions">'+networkButton('focus',lineIcon('graph')+'Explore connections',id)+'</div>');
  const node=studioNodes().find(n=>n.id===id);
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
    if(action==='search'||action==='library'){$('#knowledge-query').focus();return}
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
  if(!await saveEditor())return;
  if(action==='graph'||action==='canvas') {
    activeSpace().viewMode=action;network.needFit=action==='graph'&&!activeSpace().graphCamera;studio.inspector=false;studio.selected.clear();await save();render();return;
  }
  if(action==='appearance'){appearanceOpen=!appearanceOpen;network.settings=false;studio.inspector=false;render();return}
  if(action==='example')return openExampleSpace();
  if(action==='open')return openNetworkNode(key);
  if(action==='focus'){network.focus=key;network.depth=1;studio.inspector=false;network.needFit=true;render();return}
  if(action==='all'||action==='reset'){network.focus=null;studio.selected.clear();studio.inspector=false;network.search='';network.types=new Set(['file','agent','task','model']);network.needFit=true;render();return}
  if(action==='depth'){network.depth=Number(key);network.needFit=true;render();return}
  if(action==='type'){if(network.types.has(key))network.types.delete(key);else network.types.add(key);render();return}
  if(action==='filters'){network.settings=!network.settings;if(network.settings)studio.inspector=false;render();return}
  if(action==='fit'){fitNetwork();return}
  if(action==='arrange'){network.positions.clear();calculateNetwork(true);activeSpace().graphPositions=Object.fromEntries(network.positions);await save();network.needFit=true;render();return}
  if(action==='zoom-in'||action==='zoom-out'){const b=$('.network-stage').getBoundingClientRect();zoomNetwork(action==='zoom-in'?1.2:1/1.2,b.width/2,b.height/2);persistNetwork()}
}
document.addEventListener('click',e=>{
  const action=e.target.closest('[data-network]');if(action){networkAction(action.dataset.network,action.dataset.key).catch(report);return}
  const node=e.target.closest('[data-knowledge-node]');if(node&&!network.ignoreClick)openNetworkNode(node.dataset.knowledgeNode).catch(report);
});
document.addEventListener('input',async e=>{
  if(e.target.id==='knowledge-query') {
    const value=e.target.value;network.search=value;
    if(studio.dirty&&!await saveEditor())return;
    renderNetwork();const input=$('#knowledge-query');input.focus();
  }
  if(e.target.id==='graph-size'){network.nodeScale=Number(e.target.value);const {nodes,links}=networkData();$('.network-nodes').innerHTML=nodes.map(n=>networkNode(n,links)).join('');applyNetworkCamera();highlightNetwork();persistNetwork()}
  if(e.target.id==='graph-edges'){network.edgeOpacity=Number(e.target.value);applyNetworkCamera();persistNetwork()}
});
document.addEventListener('change',e=>{if(e.target.id==='graph-labels'){network.labels=e.target.value;applyNetworkCamera();persistNetwork()}});
document.addEventListener('pointerover',e=>{const node=e.target.closest('[data-knowledge-node]');if(node){network.hovered=node.dataset.knowledgeNode;highlightNetwork()}});
document.addEventListener('pointerout',e=>{const node=e.target.closest('[data-knowledge-node]');if(node&&!node.contains(e.relatedTarget)){network.hovered=null;highlightNetwork()}});
document.addEventListener('pointerdown',e=>{
  if(!e.target.closest('.knowledge-svg')||e.button!==0||studio.connecting)return;
  const node=e.target.closest('[data-knowledge-node]'),id=node?.dataset.knowledgeNode;
  network.drag={id,x:e.clientX,y:e.clientY,camera:{...network.camera},position:id?[...network.positions.get(id)]:null,moved:false};
});
document.addEventListener('pointermove',e=>{
  const d=network.drag;if(!d)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(!d.moved&&Math.hypot(dx,dy)<4)return;d.moved=true;
  if(d.id) {
    const p=[d.position[0]+dx/d.camera.scale,d.position[1]+dy/d.camera.scale];network.positions.set(d.id,p);
    for(const node of document.querySelectorAll('[data-knowledge-node]'))if(node.dataset.knowledgeNode===d.id)node.setAttribute('transform','translate('+p.join(' ')+')');
    for(const edge of document.querySelectorAll('.knowledge-edge')) {
      if(edge.dataset.source===d.id){edge.setAttribute('x1',p[0]);edge.setAttribute('y1',p[1])}
      if(edge.dataset.target===d.id){edge.setAttribute('x2',p[0]);edge.setAttribute('y2',p[1])}
    }
  $('.network-stage').style.setProperty('--grid-x',(c.x*.12)+'px');$('.network-stage').style.setProperty('--grid-y',(c.y*.12)+'px');
  placeNetworkLabels();
  } else {network.camera.x=d.camera.x+dx;network.camera.y=d.camera.y+dy;applyNetworkCamera()}
});
document.addEventListener('pointerup',()=>{
  const d=network.drag;network.drag=null;if(!d?.moved)return;
  network.ignoreClick=true;setTimeout(()=>network.ignoreClick=false,100);
  if(d.id)activeSpace().graphPositions=Object.fromEntries(network.positions);
  persistNetwork();
});
document.addEventListener('wheel',e=>{
  if(!e.target.closest('.knowledge-svg'))return;e.preventDefault();const b=$('.network-stage').getBoundingClientRect();
  zoomNetwork(Math.exp(-e.deltaY*.001),e.clientX-b.left,e.clientY-b.top);
  clearTimeout(network.cameraTimer);network.cameraTimer=setTimeout(persistNetwork,200);
},{passive:false});
document.addEventListener('keydown',e=>{
  if(!document.body.classList.contains('knowledge-mode')||$('#dialog').open)return;
  if(e.target.closest('input,textarea,select'))return;
  if(e.key==='f'||e.key==='F'){e.preventDefault();e.stopImmediatePropagation();fitNetwork()}
  if(e.key==='Enter'&&e.target.closest('[data-knowledge-node]'))openNetworkNode(e.target.closest('[data-knowledge-node]').dataset.knowledgeNode).catch(report);
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
