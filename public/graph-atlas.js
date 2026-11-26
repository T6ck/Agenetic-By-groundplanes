'use strict';

// The atlas surface supplies orientation. Only workspace records and saved links
// participate in selection, counts, search, and traversal.
const graphLayouts = {signal:'Trace map',atlas:'Relief map',spatial:'Spatial view',clusters:'Clusters',orbit:'Orbit',flow:'Flow',freeform:'Freeform'};
const graphLayoutHelp = {
  signal:'Saved links form the trace. Select a record to isolate its immediate evidence.',
  atlas:'Connected records share a relief. Drag the surface to inspect depth.',
  spatial:'Drag empty space to turn. Drag a record to pull its linked evidence forward.',
  clusters:'Compare connected groups and open a record to inspect the source.',
  orbit:'Read outward from a selected record. Open another record to recenter.',
  flow:'Read saved links across the work sequence.',
  freeform:'Arrange records yourself, then save the workspace.'
};
const atlasHomeAngle = -.28;
function workspaceGraphLayout(space) {
  if (Object.hasOwn(graphLayouts,space.graphLayout)) return space.graphLayout;
  return Object.keys(space.graphPositions||{}).length || space.graphCamera ? 'freeform' : 'signal';
}
function graphCameraKey(layout) {
  return layout==='freeform'||!Object.hasOwn(graphLayouts,layout)?'graphCamera':layout+'Camera';
}
// Each connected region gets a stack of elevation contours. The outer
// contour is its footprint and the hub sits at the summit.
function ridgePoint(ridge,r,angle) {
  const ripple=1+.14*Math.sin(3*angle+ridge.phase)+.075*Math.cos(2*angle-ridge.phase);
  const x=ridge.x+Math.cos(angle)*ridge.width*r*ripple;
  const y=ridge.y+Math.sin(angle)*ridge.width*.72*r*ripple;
  const h=ridge.height*(1-r*r);
  return [x,y*.86-h*.53,h*.85+y*.5];
}
function spatialLayout(layout) {
  return layout==='signal'||layout==='atlas'||layout==='spatial';
}
// Unit quaternions keep rotations continuous through both poles. Compose each
// gesture about the viewer's axes so dragging right always turns toward the right.
function axisRotation(x,y,z,angle) {
  const factor=Math.sin(angle/2)/(Math.hypot(x,y,z)||1);
  return [x*factor,y*factor,z*factor,Math.cos(angle/2)];
}
function composeRotation([a,b,c,d],[x,y,z,w]) {
  const q=[d*x+a*w+b*z-c*y,d*y-a*z+b*w+c*x,d*z+a*y-b*x+c*w,d*w-a*x-b*y-c*z];
  const length=Math.hypot(...q);
  return q.map(v=>v/length);
}
function homeOrientation(yaw=atlasHomeAngle) {
  return composeRotation(axisRotation(1,0,0,.22),axisRotation(0,1,0,yaw));
}
function savedOrientation(space,layout) {
  const q=space[layout+'Orientation'];
  if(Array.isArray(q)&&q.length===4&&q.every(Number.isFinite)){
    const norm=Math.hypot(...q);
    if(Number.isFinite(norm)&&norm>.0001)return q.map(v=>v/norm);
  }
  return homeOrientation(layout==='atlas'&&Number.isFinite(space.atlasAngle)?space.atlasAngle:atlasHomeAngle);
}
function viewMatrix([x,y,z,w]) {
  return [1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w),
    2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w),
    2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)];
}
const graphLens=950;
function projectPoint([x,y,z],m) {
  const depth=m[6]*x+m[7]*y+m[8]*z,scale=graphLens/(graphLens-depth);
  return [(m[0]*x+m[1]*y+m[2]*z)*scale,(m[3]*x+m[4]*y+m[5]*z)*scale,depth,scale];
}
const reliefCache=new WeakMap();
function atlasSurfacePaths(orientation,duringOrbit,ridges) {
  let cached=reliefCache.get(ridges);
  if(!cached){cached=new Map();reliefCache.set(ridges,cached);}
  if(cached.get(duringOrbit)?.orientation===orientation)return cached.get(duringOrbit).paths;
  const matrix=viewMatrix(orientation),bands=Array.from({length:8},()=>[]);
  for(const ridge of ridges.slice(0,48)){
    const steps=duringOrbit?20:64;
    for(let level=1;level<=14;level+=duringOrbit?3:1){
      const ring=[],r=Math.sqrt(level/14);
      for(let i=0;i<steps;i++){
        const [x,y]=projectPoint(ridgePoint(ridge,r,i*2*Math.PI/steps),matrix);
        ring.push(x.toFixed(1)+' '+y.toFixed(1));
      }
      bands[ridge.zone+(level%4===1?4:0)].push('M'+ring.join('L')+'Z');
    }
  }
  const paths=bands.map(b=>b.join(''));
  cached.set(duringOrbit,{orientation,paths});return paths;
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
  const ridges=[];
  clusters.forEach((group,index)=>{
    const angle=index*2.399963,spread=Math.sqrt(index/Math.max(1,clusters.length-1));
    const width=Math.min(224,240/Math.sqrt(clusters.length))*(.84+.16*Math.min(1,group.length/8));
    const ridge={x:Math.cos(angle)*spread*258,y:Math.sin(angle)*spread*173,
      width,height:group===loose?18:42+Math.min(63,Math.sqrt(group.length)*11),
      phase:index*1.71,zone:index%4};
    ridges.push(ridge);
    group.forEach((n,j)=>{
      const r=j===0?0:Math.sqrt(j/group.length)*.97,theta=j*2.399963+index;
      cloud.set(n.id,ridgePoint(ridge,r,theta));
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
  return {cloud,landmarks,regions,ridges};
}
// A strand is a guide for one group; the selectable edges remain saved relationships.
function signalPoint(lane,t,phase,radius){
  const fan=t*t*(3-2*t),wave=Math.sin(t*Math.PI);
  const twist=phase+4.8*t+lane.index*.46;
  const width=radius*(3+24*wave+9*t);
  return [-330+660*t, lane.y*fan+Math.sin(t*6+lane.index*.35)*wave*32+Math.sin(twist)*width,
    lane.z*fan+Math.sin(t*4)*44+Math.cos(twist)*width];
}
function signalField(regions){
  const cloud=new Map(),lanes=[];
  regions.forEach((region,index)=>{
    const y=regions.length===1?0:(index/(regions.length-1)-.5)*375;
    const lane={index,y,z:Math.sin(index*2.4)*82,loose:region.id==='isolated'};
    lanes.push(lane);
    region.ids.forEach((id,j)=>{
      // The hub ends its strand. Stagger attachments along the approach.
      const t=j===0?.97:.12+.78*(j-.5)/Math.max(1,region.ids.length-1);
      cloud.set(id,signalPoint(lane,t,j*2.39996,j===0?0:.75));
    });
  });
  return {lanes,cloud};
}
function signalPaths(lanes,matrix,coarse){
  const bands=Array.from({length:4},()=>[]);
  for(const lane of lanes.slice(0,32)){
    if(lane.loose)continue;
    const steps=coarse?12:44;
    for(let j=0;j<9;j+=coarse?3:1){
      const points=[];
      for(let n=0;n<=steps;n++){
        const p=projectPoint(signalPoint(lane,n/steps,j*.735,(.36+.64*(j*13%29)/29)),matrix);
        points.push(p[0].toFixed(1)+' '+p[1].toFixed(1));
      }
      bands[lane.index%4].push('M'+points.join('L'));
    }
  }
  return bands.map(paths=>paths.join(''));
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
    return '<g class="district-'+i%4+'"><rect class="district-frame" x="'+(g.x-g.radius)+'" y="'+(g.y-g.radius)+'" width="'+g.radius*2+'" height="'+g.radius*2+'" rx="18"/><text text-anchor="middle" x="'+g.x+'" y="'+(g.y-g.radius-9)+'">'+esc(g.name.length>26?g.name.slice(0,25)+'…':g.name)+'</text></g>';
  }).join('')+'</g>';
}
// Spread each connected region around its hub. In contrast to the Atlas shell,
// each record here can sit inside the volume. Equal-area directions avoid poles.
function spatialCloud(regions) {
  const points=new Map(),golden=Math.PI*(3-Math.sqrt(5));
  const sphere=(i,count)=>{
    const y=1-2*(i+.5)/count,r=Math.sqrt(1-y*y),a=i*golden;
    return [Math.cos(a)*r,y,Math.sin(a)*r];
  };
  regions.forEach((region,i)=>{
    const total=regions.length;
    const direction=sphere(i,total);
    const center=direction.map((v,k)=>total===1?0:v*[212,142,170][k]);
    const hub=region.id.startsWith('hub:')?region.id.slice(4):null;
    const members=region.ids.filter(id=>id!==hub);
    if(hub)points.set(hub,center);
    members.forEach((id,j)=>{
      const dir=sphere(j,members.length);
      const radius=(total===1?185:62+Math.min(44,5*Math.sqrt(members.length)))*(.73+.27*((j*.618)%1));
      points.set(id,dir.map((v,k)=>center[k]+v*radius*(k===0?1.24:1)));
    });
  });
  return points;
}
function updateProjection(ids) {
  if(!ids){
    network.matrix=viewMatrix(network.orientation);
    network.positions=new Map();network.depths=new Map();network.worldPoints=new Map();
  }
  for(const id of ids||network.cloud.keys()){
    let point=network.cloud.get(id);
    const weight=network.pull?.weights.get(id);
    if(weight)point=point.map((v,k)=>v+weight*network.pull.delta[k]);
    network.worldPoints.set(id,point);
    const [x,y,depth,scale]=projectPoint(point,network.matrix);
    network.positions.set(id,[x,y]);network.depths.set(id,{depth,scale});
  }
}
function linkMidpoint(a,b) {
  const mid=a.map((v,k)=>(v+b[k])/2);
  const lift=Math.min(42,Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])*.13);
  const length=Math.max(1,Math.hypot(...mid));
  return mid.map(v=>v+v/length*lift);
}
// Project a point on the world-space curve along with its ends so a link can
// turn edge-on. Keeping SVG coordinates short reduces work on dense graphs.
function spatialLinkPath(source,target,midpoint) {
  const pa=network.positions.get(source),pb=network.positions.get(target);
  const start='M'+pa[0].toFixed(2)+' '+pa[1].toFixed(2),end=pb[0].toFixed(2)+' '+pb[1].toFixed(2);
  if(source===target){
    const a=network.worldPoints.get(source);
    const c=projectPoint([a[0]-25,a[1]-35,a[2]+12],network.matrix);
    const d=projectPoint([a[0]+25,a[1]-35,a[2]-12],network.matrix);
    return start+'C'+c[0]+' '+c[1]+' '+d[0]+' '+d[1]+' '+end;
  }
  if(!midpoint)midpoint=linkMidpoint(network.worldPoints.get(source),network.worldPoints.get(target));
  const [x,y]=projectPoint(midpoint,network.matrix);
  return start+'Q'+(2*x-(pa[0]+pb[0])/2).toFixed(2)+' '+(2*y-(pa[1]+pb[1])/2).toFixed(2)+' '+end;
}
function spatialEdgeInk(source,target){
  const a=network.depths.get(source).depth,b=network.depths.get(target).depth;
  return Math.min(1,Math.max(.3,.73+(a+b)/950)).toFixed(2);
}
function glyphDepthInk(depth){
  return Math.max(.42,Math.min(1,.78+depth/540)).toFixed(2);
}
// Four shared meshes keep the type marks dimensional without multiplying the
// number of SVG faces by the size of the workspace.
function prismMesh(sides) {
  const vertices=[];
  for(const z of [-.65,.65])for(let i=0;i<sides;i++){
    const a=2*Math.PI*(i+.5)/sides;
    vertices.push([Math.cos(a),Math.sin(a),z]);
  }
  const ring=Array.from({length:sides},(_,i)=>i);
  return {vertices,faces:[ring,ring.map(i=>i+sides),...ring.map(i=>{
    const j=(i+1)%sides;return [i,j,j+sides,i+sides];
  })]};
}
function plateMesh(outline,depth){
  const count=outline.length;
  const vertices=[-depth,depth].flatMap(z=>outline.map(([x,y])=>[x,y,z]));
  const face=outline.map((_,i)=>i);
  return {vertices,faces:[face,face.map(i=>i+count),...face.map(i=>{
    const next=(i+1)%count;
    return [i,next,next+count,i+count];
  })]};
}
const spatialMeshes={
  file:plateMesh([[-.80,-1],[.32,-1],[.85,-.47],[.85,1],[-.80,1]],.21),
  agent:plateMesh([[-1,-.52],[-.54,-.92],[1,-.92],[1,.52],[.54,.92],[-1,.92]],.42),
  task:plateMesh([[-1,-.75],[.36,-.75],[1,0],[.36,.75],[-1,.75]],.31),
  model:prismMesh(6)
};
function solidFaces(mesh,matrix) {
  const vertices=mesh.vertices.map(([x,y,z])=>[
    matrix[0]*x+matrix[1]*y+matrix[2]*z,matrix[3]*x+matrix[4]*y+matrix[5]*z,matrix[6]*x+matrix[7]*y+matrix[8]*z]);
  const shades=['','','',''];
  for(const indices of mesh.faces){
    const points=indices.map(i=>vertices[i]),[a,b,c]=points;
    const u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]);
    let nx=u[1]*v[2]-u[2]*v[1],ny=u[2]*v[0]-u[0]*v[2],nz=u[0]*v[1]-u[1]*v[0];
    if(nx*a[0]+ny*a[1]+nz*a[2]<0){nx=-nx;ny=-ny;nz=-nz;}
    if(nz<=0)continue;
    const light=(-.49*nx-.65*ny+.58*nz)/Math.hypot(nx,ny,nz);
    const tone=light>.72?0:light>.28?1:light>-.15?2:3;
    shades[tone]+='M'+points.map(p=>p[0].toFixed(3)+' '+p[1].toFixed(3)).join('L')+'Z';
  }
  return shades;
}
function spatialDefinitions(){
  return '<defs>'+Object.entries(spatialMeshes).map(([kind,mesh])=>'<g id="solid-'+kind+'">'+
    solidFaces(mesh,network.matrix).map((d,i)=>'<path class="solid-face tone-'+i+'" d="'+d+'"/>').join('')+'</g>').join('')+'</defs>';
}
function graphViewUnderlay(nodes) {
  if(!nodes.length)return '';
  if(network.layout==='clusters'||network.layout==='orbit')return layoutGuides(nodes);
  if(network.layout==='flow'){
    const visible=new Set(nodes.map(n=>n.kind));
    return '<g class="flow-columns" aria-hidden="true">'+network.flowColumns.filter(c=>visible.has(c.kind)).map(c=>
      '<g class="flow-lane lane-'+c.kind+'"><path d="M'+(c.x-17)+' '+(c.y+12)+'h102 M'+(c.x-17)+' '+(c.y+12)+'v8"/><text x="'+(c.x-17)+'" y="'+c.y+'">'+esc(c.label)+'</text></g>').join('')+'</g>';
  }
  if(network.layout==='signal')return spatialDefinitions()+'<g class="signal-field" aria-hidden="true">'+signalPaths(network.lanes,network.matrix,false).map((d,i)=>'<path class="signal-band band-'+i+'" d="'+d+'"/>').join('')+'</g>';
  if(network.layout==='spatial')return spatialDefinitions();
  if(network.layout!=='atlas')return '';
  const paths=atlasSurfacePaths(network.orientation,false,network.ridges);
  return spatialDefinitions()+'<g class="atlas-surface" aria-hidden="true">'+paths.map((d,i)=>
    '<g class="zone-'+(i%4)+(i<4?' far':' near')+'"><path id="atlas-fiber-'+i+'" class="atlas-fiber" d="'+d+'"/>'+
    '</g>').join('')+'</g>';
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
  if(spatialLayout(network.layout))return '<path '+attrs+'data-source-kind="'+esc(network.kinds.get(link.from))+'" style="--link-depth:'+spatialEdgeInk(link.from,link.to)+'" fill="none" d="'+spatialLinkPath(link.from,link.to)+'"/>';
  return '<path '+attrs+'fill="none" d="'+graphLinkPath(a,b,network.layout)+'"/>';
}
function atlasNode(n,links) {
  const [x,y]=network.positions.get(n.id),degree=degreeFor(n.id,links);
  const spatial=spatialLayout(network.layout);
  const radius=(4.3+Math.min(6,Math.sqrt(degree)*1.4))*network.nodeScale*(network.layout==='signal'?.79:spatial?1.22:1);
  const shape={file:'M-.8 -1H.32L.86 -.45V1H-.8Z',agent:'M-.98 -.58L-.56 -.96H.98V.58L.56 .96H-.98Z',task:'M-.95 -.8H.4L1 0 .4 .8H-.95Z',model:'M-.5 -.9H.5L1 0 .5 .9H-.5L-1 0Z'};
  const name=n.name.replace(/\.md$/i,''),label=objectLabel(n);
  const landmark=!spatialLayout(network.layout)||network.landmarks.has(n.id);
  const scale=spatial?network.depths.get(n.id).scale:1;
  return '<g class="knowledge-node signal-node atlas-record '+n.kind+' subtype-'+nodeState(n)+(landmark?' landmark':'')+(network.layout==='orbit'&&network.orbit.root===n.id?' orbit-center':'')+
    (studio.selected.has(n.id)?' selected':'')+'" data-knowledge-node="'+esc(n.id)+'" transform="translate('+x+' '+y+')" tabindex="-1" role="button" aria-label="Open '+esc(n.name)+' · '+esc(label)+'">'+
    '<title>'+esc(n.name)+' · '+esc(label)+' · '+degree+' connections</title><circle class="node-hit" r="'+Math.max(15,radius+7)+'"/>'+
    '<g class="depth-glyph" transform="scale('+scale+')" opacity="'+(spatial?glyphDepthInk(network.depths.get(n.id).depth):1)+'"><circle class="orb-body geometry-measure" r="'+radius+'"/><circle class="atlas-halo" r="'+(radius+5)+'"/>'+
    (spatial?'<use class="spatial-solid" href="#solid-'+n.kind+'" transform="scale('+radius+')"/>':'')+'<path class="atlas-mark'+(spatial?' compact-mark':'')+'" d="'+shape[n.kind]+'" transform="scale('+radius+')"/>'+'</g><line class="node-tether"/>'+
    '<text x="12" y="4">'+esc(name.length>40?name.slice(0,37)+'…':name)+'<tspan class="node-state-label" x="12" dy="15">'+esc(label)+'</tspan></text></g>';
}
function paintSpatialGraph(svg,duringGesture=false) {
  const graph=indexedGraph(svg);
  const affected=graph.orientation===network.orientation&&(network.pull?.weights||graph.pulled);
  updateProjection(affected?affected.keys():null);
  const rotating=duringGesture&&!network.pull;
  if(!graph.glyphs){
    graph.glyphs=new Map(Array.from(graph.nodes,([id,el])=>[id,{el,mark:el.querySelector('.depth-glyph')}]));
    graph.fibers=svg.querySelectorAll('.atlas-fiber');
    graph.bands=svg.querySelectorAll('.signal-band');
    graph.solids=Object.entries(spatialMeshes).map(([kind,mesh])=>({mesh,faces:svg.querySelectorAll('#solid-'+kind+' path')}));
    graph.curves=new Map(graph.links.map(el=>{
      const {source,target}=el.dataset;
      return [el,{source,target,mid:linkMidpoint(network.cloud.get(source),network.cloud.get(target))}];
    }));
  }
  if(graph.orientation!==network.orientation){
    for(const {mesh,faces} of graph.solids)solidFaces(mesh,network.matrix).forEach((d,i)=>faces[i]?.setAttribute('d',d));
  }
  if(graph.bands.length&&(graph.orientation!==network.orientation||graph.rotating!==rotating)){
    signalPaths(network.lanes,network.matrix,rotating).forEach((d,i)=>graph.bands[i].setAttribute('d',d));
  }
  if(graph.fibers.length&&(graph.orientation!==network.orientation||graph.rotating!==rotating)){
    atlasSurfacePaths(network.orientation,rotating,network.ridges).forEach((d,i)=>graph.fibers[i].setAttribute('d',d));
  }
  for(const id of affected?affected.keys():graph.nodes.keys()){
    const glyph=graph.glyphs.get(id);
    if(!glyph)continue;
    const [x,y]=network.positions.get(id);
    glyph.el.setAttribute('transform','translate('+x.toFixed(3)+' '+y.toFixed(3)+')');
    const {depth,scale}=network.depths.get(id);
    const size=duringGesture?Math.round(scale*48)/48:scale,ink=glyphDepthInk(depth);
    if(size!==glyph.size){glyph.mark.setAttribute('transform','scale('+size.toFixed(3)+')');glyph.size=size;}
    if(ink!==glyph.ink){glyph.mark.setAttribute('opacity',ink);glyph.ink=ink;}
  }
  const edges=affected?new Set(Array.from(affected.keys()).flatMap(id=>graph.edges.get(id)||[])):graph.links;
  for(const el of edges){
    const curve=graph.curves.get(el),{source,target}=curve;
    el.setAttribute('d',spatialLinkPath(source,target,network.pull?null:curve.mid));
    const ink=spatialEdgeInk(source,target);
    if(ink!==curve.ink){el.style.setProperty('--link-depth',ink);curve.ink=ink;}
  }
  if(!affected&&(!duringGesture||graph.nodes.size<150))orderSpatialNodes(svg);
  graph.orientation=network.orientation;graph.pulled=network.pull?.weights;graph.rotating=rotating;
  paintInvestigationTerritory(svg);
}
let spatialTraceId=0;
function traceSpatialLinks(svg,edges){
  const layer=svg.querySelector('.spatial-signals');
  if(!layer)return;
  layer.replaceChildren();
  if(appearance().motion===false||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  // Follow the actual SVG path, including its updates during a gesture.
  layer.innerHTML=edges.slice(0,4).map((edge,i)=>{
    if(!edge.id)edge.id='spatial-trace-'+(++spatialTraceId);
    return '<circle r="2.7"><animateMotion dur="3.4s" begin="-'+(i*.8)+'s" repeatCount="indefinite"><mpath href="#'+edge.id+'"/></animateMotion></circle>';
  }).join('');
}
function orderSpatialNodes(svg){
  // Reorder from back to front while keeping a keyboard-focused record attached.
  const graph=indexedGraph(svg),layer=svg.querySelector('.network-nodes'),focused=document.activeElement;
  const sorted=Array.from(layer.children).sort((a,b)=>network.depths.get(a.dataset.knowledgeNode).depth-network.depths.get(b.dataset.knowledgeNode).depth);
  let next=null;
  for(let i=sorted.length-1;i>=0;i--){
    const node=sorted[i];
    if(node!==focused&&node.nextElementSibling!==next)layer.insertBefore(node,next);
    next=node;
  }
  graph.first=layer.firstElementChild;
}
