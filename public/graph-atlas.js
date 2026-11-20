'use strict';

// The atlas surface supplies orientation. Only workspace records and saved links
// participate in selection, counts, search, and traversal.
const graphLayouts = {atlas:'Atlas',clusters:'Clusters',orbit:'Orbit',flow:'Flow',freeform:'Freeform'};
const graphLayoutHelp = {
  atlas:'Rotate to explore connected regions.',
  clusters:'Follow links between groups of related records.',
  orbit:'Each ring adds a link from the center. Open a record to recenter.',
  flow:'Read across the columns to follow a workflow.',
  freeform:'Drag records to arrange your own map.'
};
const atlasHomeAngle = -.28;
function workspaceGraphLayout(space) {
  if (Object.hasOwn(graphLayouts,space.graphLayout)) return space.graphLayout;
  return Object.keys(space.graphPositions||{}).length || space.graphCamera ? 'freeform' : 'atlas';
}
function graphCameraKey(layout) {
  return layout==='freeform'||!Object.hasOwn(graphLayouts,layout)?'graphCamera':layout+'Camera';
}
function atlasSurface(u,v) {
  const s=Math.sin(u), c=Math.cos(u), side=Math.sin(v), up=Math.cos(v);
  const seam=1-.095*Math.exp(-32*side*side);
  const fold=1+.021*Math.sin(14*u+2.7*Math.sin(5*v))+.012*Math.cos(9*v-5*u);
  const temporal=up<0 ? 34*Math.exp(-Math.pow((u-1.28)/.34,2))*up*up : 0;
  return [-310*c, -174*s*up*seam*fold - 17*c + temporal - 23*c*c,
    132*s*side*fold*(1+.12*c)];
}
function atlasProject(point,angle) {
  const [x,y,z]=point,cos=Math.cos(angle),sin=Math.sin(angle);
  const depth=z*cos-x*sin;
  return [x*cos+z*sin,y*.975-depth*.22,depth];
}
// Geometry is generated once. Each pass batches many fibers in one SVG path.
let atlasFibers,orbitFibers;
const previousSurface=new Map();
function atlasSurfacePaths(angle,duringOrbit=false) {
  const cached=previousSurface.get(duringOrbit);
  if(cached?.angle===angle)return cached.paths;
  if (!atlasFibers) {
    atlasFibers=[];
    for(let band=0;band<88;band++) {
      const v=band*Math.PI*2/88;
      const points=[];
      for(let k=0;k<=85;k++) {
        const u=.08+k*(Math.PI-.16)/85;
        const winding=.12*Math.sin(10*u+1.8*Math.sin(3*v))+.075*Math.sin(18*u-4*v);
        points.push(atlasSurface(u,v+winding*Math.sin(u)));
      }
      atlasFibers.push(points);
    }
    // Cross-sections define the hemisphere cleft and the contours at either pole.
    for(let k=1;k<30;k++) {
      const u=k*Math.PI/30,points=[];
      for(let i=0;i<=86;i++){
        const v=i*Math.PI*2/86;
        points.push(atlasSurface(u+.045*Math.sin(5*v+u*9)*Math.sin(u),v));
      }
      atlasFibers.push(points);
    }
    // A smaller folded posterior lobe and tapering stem orient the lateral view.
    for(let k=1;k<27;k++){
      const u=k*Math.PI/27,points=[];
      for(let i=0;i<=60;i++){
        const v=i*Math.PI*2/60,ring=Math.sin(u);
        points.push([120+96*ring*Math.cos(v),123-57*Math.cos(u)-15*ring*Math.cos(v),79*ring*Math.sin(v)]);
      }
      atlasFibers.push(points);
    }
    for(let k=0;k<24;k++){
      const v=k*Math.PI/12,points=[];
      for(let i=0;i<=20;i++){
        const f=i/20,r=33-20*f;
        points.push([57+43*f+r*Math.cos(v),118+102*f, r*Math.sin(v)]);
      }
      atlasFibers.push(points);
    }
  }
  // During a drag, sample the decorative surface more sparsely. Every record
  // and every data edge still moves on every update. Release restores detail.
  if(duringOrbit&&!orbitFibers){
    orbitFibers=atlasFibers.filter((_,i)=>i%3===0).map(curve=>curve.filter((_,i)=>i%3===0||i===curve.length-1));
  }
  const bands=Array.from({length:8},()=>[]);
  for(const curve of duringOrbit?orbitFibers:atlasFibers){
    let last=-1,previous='';
    for(const p of curve){
      const [x,y,z]=atlasProject(p,angle);
      const region=p[1]>103?3:p[0]<-100?0:p[0]>95?2:1;
      const band=region+(z>0?4:0);
      const coord=x.toFixed(1)+' '+y.toFixed(1);
      bands[band].push(last===band?'L'+coord:'M'+(previous?previous+'L':'')+coord);
      previous=coord;last=band;
    }
  }
  const paths=bands.map(b=>b.join(''));
  previousSurface.set(duringOrbit,{angle,paths});return paths;
}
function atlasCloud(nodes,links) {
  const adjacent=new Map(nodes.map(n=>[n.id,new Set()]));
  for(const {from,to} of links) {
    if(from===to||!adjacent.has(from)||!adjacent.has(to))continue;
    adjacent.get(from).add(to); adjacent.get(to).add(from);
  }
  const order=[...nodes].sort((a,b)=>adjacent.get(b.id).size-adjacent.get(a.id).size||
    a.name.localeCompare(b.name,'en')||a.id.localeCompare(b.id,'en'));
  const linked=order.filter(n=>adjacent.get(n.id).size);
  const anchors=linked.filter(n=>n.kind==='agent').slice(0,6);
  const target=Math.min(6,Math.ceil(Math.sqrt(linked.length)/1.7));
  for(const n of linked){
    if(anchors.length>=target)break;
    if(!anchors.some(a=>a.id===n.id||adjacent.get(a.id).has(n.id)))anchors.push(n);
  }
  const clusters=anchors.map(()=>[]),owners=new Map(),queue=[];
  anchors.forEach((n,i)=>{owners.set(n.id,i);queue.push(n.id)});
  for(let i=0;i<queue.length;i++){
    const id=queue[i];
    for(const other of [...adjacent.get(id)].sort()){
      if(!owners.has(other)){owners.set(other,owners.get(id));queue.push(other);}
    }
  }
  // Disconnected components get their own region, including unlinked records.
  for(const n of order){
    if(owners.has(n.id)||!adjacent.get(n.id).size)continue;
    const group=clusters.length,component=[n.id];clusters.push([]);owners.set(n.id,group);
    for(let j=0;j<component.length;j++)for(const other of adjacent.get(component[j])){
      if(!owners.has(other)){owners.set(other,group);component.push(other);}
    }
  }
  const loose=[];
  for(const n of order)(owners.has(n.id)?clusters[owners.get(n.id)]:loose).push(n);
  if(loose.length)clusters.push(loose);
  const cloud=new Map(),landmarks=new Set();
  clusters.forEach((group,index)=>{
    const count=clusters.length,longitude=(index+.5)/count;
    const u0=Math.acos(1-2*longitude);
    const v0=count>10?index*2.399963:1.1+(index%2)*1.03;
    const span=Math.min(1.14,1.45/Math.sqrt(count));
    group.forEach((n,j)=>{
      const radius=Math.sqrt((j+.18)/group.length),theta=j*2.399963;
      const u=Math.max(.13,Math.min(Math.PI-.13,u0+span*radius*Math.cos(theta)));
      const v=v0+radius*Math.sin(theta)*Math.min(2.9,2.6/Math.sqrt(count)+.6);
      cloud.set(n.id,atlasSurface(u,v));
      if((j===0||j<3&&group.length>=12)&&landmarks.size<12)landmarks.add(n.id);
    });
  });
  const regions=clusters.map((group,i)=>{
    const hub=anchors[i]||group[0];
    return {id:group===loose?'isolated':'hub:'+hub.id,name:group===loose?'Unlinked records':hub.name,
      ids:group.map(n=>n.id),boundary:0};
  });
  for(const {from,to} of links){
    const a=owners.get(from),b=owners.get(to);
    if(a!==undefined&&b!==undefined&&a!==b){regions[a].boundary++;regions[b].boundary++;}
  }
  return {cloud,landmarks,regions};
}
function flowArrangement(nodes) {
  const positions=new Map(),columns=[];
  let left=0;
  for(const [kind,label] of [['model','Models'],['file','Notes and sources'],['agent','Agents'],['task','Tasks']]){
    const items=nodes.filter(n=>n.kind===kind).sort((a,b)=>a.name.localeCompare(b.name,'en')||a.id.localeCompare(b.id,'en'));
    if(!items.length)continue;
    const rows=Math.ceil(Math.sqrt(items.length*2.4)),width=Math.ceil(items.length/rows)*168;
    columns.push({kind,label,x:left,y:-44});
    items.forEach((n,i)=>positions.set(n.id,[left+Math.floor(i/rows)*168,(i%rows)*55]));
    left+=width+94;
  }
  return {positions,columns};
}
function orbitArrangement(nodes,links,preferred){
  const positions=new Map(),rings=[],neighbors=new Map(nodes.map(n=>[n.id,new Set()]));
  for(const {from,to} of links){
    if(from===to||!neighbors.has(from)||!neighbors.has(to))continue;
    neighbors.get(from).add(to);neighbors.get(to).add(from);
  }
  const order=[...nodes].sort((a,b)=>neighbors.get(b.id).size-neighbors.get(a.id).size||
    a.name.localeCompare(b.name,'en')||a.id.localeCompare(b.id,'en'));
  const root=neighbors.has(preferred)?preferred:order[0]?.id;
  if(!root)return {positions,rings,root};
  const distance=new Map([[root,0]]),queue=[root];
  for(let i=0;i<queue.length;i++)for(const id of neighbors.get(queue[i])){
    if(!distance.has(id)){distance.set(id,distance.get(queue[i])+1);queue.push(id);}
  }
  positions.set(root,[0,0]);
  const layers=new Map(),separate=[];
  for(const n of order){
    if(n.id===root)continue;
    const depth=distance.get(n.id);
    if(depth===undefined){separate.push(n.id);continue;}
    if(!layers.has(depth))layers.set(depth,[]);
    layers.get(depth).push(n.id);
  }
  let radius=0;
  const bands=[...layers].sort(([a],[b])=>a-b);
  if(separate.length)bands.push([null,separate]);
  for(const [depth,ids] of bands){
    radius=Math.max(radius+(depth===null?116:92),ids.length*33/(2*Math.PI));
    const spacing=2*Math.PI/ids.length,first=.25*spacing+(depth||0)*.61;
    // Put the ring's caption between records, on its upper half.
    const captionAngle=first+(Math.round((-Math.PI*.72-first)/spacing-.5)+.5)*spacing;
    rings.push({radius,depth,ids,labelX:Math.cos(captionAngle)*(radius+9),labelY:Math.sin(captionAngle)*(radius+9)});
    ids.forEach((id,i)=>{
      const angle=(i+.25)*2*Math.PI/ids.length+(depth||0)*.61;
      positions.set(id,[radius*Math.cos(angle),radius*Math.sin(angle)]);
    });
  }
  return {positions,rings,root};
}
function clusterArrangement(regions){
  const positions=new Map(),districts=[];
  const columns=Math.max(1,Math.ceil(Math.sqrt(regions.length)));
  const sizes=regions.map(r=>Math.max(69,38+26*Math.sqrt(r.ids.length)));
  let top=0;
  for(let row=0;row<regions.length;row+=columns){
    const tallest=Math.max(...sizes.slice(row,row+columns));
    let left=0;
    for(let i=row;i<Math.min(row+columns,regions.length);i++){
      const region=regions[i],radius=sizes[i],x=left+radius,y=top+tallest;
      districts.push({...region,x,y,radius});
      const seed=region.id.startsWith('hub:')?region.id.slice(4):region.ids[0];
      const members=[seed,...region.ids.filter(id=>id!==seed)];
      members.forEach((id,j)=>{
        const r=(radius-20)*Math.sqrt(j/Math.max(1,members.length-1)),a=j*2.399963;
        positions.set(id,[x+r*Math.cos(a),y+r*Math.sin(a)]);
      });
      left+=radius*2+58;
    }
    top+=tallest*2+70;
  }
  return {positions,districts};
}
function layoutGuides(nodes){
  const ids=new Set(nodes.map(n=>n.id));
  if(network.layout==='orbit'){
    if(!ids.has(network.orbit.root))return '';
    return '<g class="orbit-guides" aria-hidden="true">'+network.orbit.rings.filter(r=>r.ids.some(id=>ids.has(id))).map(r=>{
      const label=r.depth===null?'Separate records':r.depth+(r.depth===1?' link':' links');
      return '<g'+(r.depth===null?' class="orbit-separate"':'')+'><circle r="'+r.radius+'"/><text text-anchor="middle" x="'+r.labelX+'" y="'+r.labelY+'">'+label+'</text></g>';
    }).join('')+'</g>';
  }
  return '<g class="cluster-guides" aria-hidden="true">'+network.districts.map((g,i)=>{
    if(!g.ids.some(id=>ids.has(id)))return '';
    return '<g class="district-'+i%4+'"><circle cx="'+g.x+'" cy="'+g.y+'" r="'+g.radius+'"/><text text-anchor="middle" x="'+g.x+'" y="'+(g.y-g.radius-9)+'">'+esc(g.name.length>26?g.name.slice(0,25)+'…':g.name)+'</text></g>';
  }).join('')+'</g>';
}
function projectedAtlasPositions(cloud,angle) {
  return new Map(Array.from(cloud,([id,point])=>[id,atlasProject(point,angle).slice(0,2)]));
}
function graphViewUnderlay(nodes) {
  if(!nodes.length)return '';
  if(network.layout==='clusters'||network.layout==='orbit')return layoutGuides(nodes);
  if(network.layout==='flow'){
    const visible=new Set(nodes.map(n=>n.kind));
    return '<g class="flow-columns" aria-hidden="true">'+network.flowColumns.filter(c=>visible.has(c.kind)).map(c=>
      '<text x="'+c.x+'" y="'+c.y+'">'+esc(c.label)+'</text>').join('')+'</g>';
  }
  if(network.layout!=='atlas')return '';
  const paths=atlasSurfacePaths(network.angle);
  return '<g class="atlas-surface" aria-hidden="true">'+paths.map((d,i)=>
    '<g class="zone-'+(i%4)+(i<4?' far':' near')+'"><path id="atlas-fiber-'+i+'" class="atlas-fiber" d="'+d+'"/>'+
    '<use href="#atlas-fiber-'+i+'" class="atlas-grain"/></g>').join('')+'</g>';
}
function graphLinkPath(a,b,layout) {
  const [x,y]=a,[tx,ty]=b;
  if(x===tx&&y===ty)return 'M'+x+' '+y+'c-26 -34 26 -34 0 0';
  if(layout==='flow'){
    const bend=x===tx?Math.min(72,Math.abs(ty-y)*.36+18):(tx-x)*.49;
    return 'M'+x+' '+y+'C'+(x+bend)+' '+y+' '+(x===tx?tx+bend:tx-bend)+' '+ty+' '+tx+' '+ty;
  }
  const lift=Math.min(56,Math.hypot(tx-x,ty-y)*.18);
  return 'M'+x+' '+y+'Q'+((x+tx)/2)+' '+((y+ty)/2-lift)+' '+tx+' '+ty;
}
function graphLinkMarkup(link) {
  const a=network.positions.get(link.from),b=network.positions.get(link.to);
  const attrs='class="knowledge-edge '+esc(link.kind)+'" data-kind="'+esc(link.kind)+'" data-source="'+esc(link.from)+'" data-target="'+esc(link.to)+'" ';
  if(network.layout==='freeform')return '<line '+attrs+'x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+'"/>';
  return '<path '+attrs+'fill="none" d="'+graphLinkPath(a,b,network.layout)+'"/>';
}
function atlasNode(n,links) {
  const [x,y]=network.positions.get(n.id),degree=degreeFor(n.id,links);
  const radius=(4.3+Math.min(6,Math.sqrt(degree)*1.4))*network.nodeScale;
  const shape={file:'M0 -1 1 0 0 1 -1 0Z',agent:'M-.85 -.85H.85V.85H-.85Z',task:'M0 -1 1 .8H-1Z',model:'M-.5 -.9H.5L1 0 .5 .9H-.5L-1 0Z'};
  const name=n.name.replace(/\.md$/i,''),label=objectLabel(n);
  const landmark=network.layout!=='atlas'||network.landmarks.has(n.id);
  return '<g class="knowledge-node signal-node atlas-record '+n.kind+' subtype-'+nodeState(n)+(landmark?' landmark':'')+(network.layout==='orbit'&&network.orbit.root===n.id?' orbit-center':'')+
    (studio.selected.has(n.id)?' selected':'')+'" data-knowledge-node="'+esc(n.id)+'" transform="translate('+x+' '+y+')" tabindex="-1" role="button" aria-label="Open '+esc(n.name)+' · '+esc(label)+'">'+
    '<title>'+esc(n.name)+' · '+esc(label)+' · '+degree+' connections</title><circle class="node-hit" r="'+Math.max(15,radius+7)+'"/>'+
    '<circle class="orb-body geometry-measure" r="'+radius+'"/><circle class="atlas-halo" r="'+(radius+5)+'"/>'+
    '<path class="atlas-mark" d="'+shape[n.kind]+'" transform="scale('+radius+')"/><line class="node-tether"/>'+
    '<text x="12" y="4">'+esc(name.length>40?name.slice(0,37)+'…':name)+'<tspan class="node-state-label" x="12" dy="15">'+esc(label)+'</tspan></text></g>';
}
function rotateGraphAtlas(angle,svg,duringOrbit=false) {
  network.angle=angle%(2*Math.PI);
  network.positions=projectedAtlasPositions(network.cloud,network.angle);
  const paths=svg.querySelectorAll('.atlas-fiber');
  if(paths.length)atlasSurfacePaths(network.angle,duringOrbit).forEach((d,i)=>paths[i].setAttribute('d',d));
  const graph=indexedGraph(svg);
  for(const [id,el] of graph.nodes)el.setAttribute('transform','translate('+network.positions.get(id).join(' ')+')');
  paintInvestigationTerritory(svg);
  for(const p of svg.querySelectorAll('.knowledge-edge')){
    p.setAttribute('d',graphLinkPath(network.positions.get(p.dataset.source),network.positions.get(p.dataset.target),'atlas'));
  }
}
