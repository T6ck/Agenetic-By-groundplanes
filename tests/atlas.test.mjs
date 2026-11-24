import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {test} from 'node:test';
import assert from 'node:assert/strict';

const source=readFileSync('public/graph-atlas.js','utf8');
const api=runInNewContext(source+'\n({atlasCloud,homeOrientation,savedOrientation,composeRotation,axisRotation,viewMatrix,projectPoint,spatialCloud,flowArrangement,orbitArrangement,clusterArrangement,workspaceGraphLayout,graphCameraKey})');
test('new spaces open in Atlas and existing manual layouts keep their workspace camera',()=>{
  assert.equal(api.workspaceGraphLayout({}), 'signal');
  assert.equal(api.workspaceGraphLayout({graphPositions:{a:[10,4]}}),'freeform');
  assert.equal(api.workspaceGraphLayout({graphCamera:{scale:.5,x:0,y:0}}),'freeform');
  assert.equal(api.workspaceGraphLayout({graphLayout:'flow',graphPositions:{a:[1,2]}}),'flow');
  assert.equal(new Set(['atlas','spatial','clusters','orbit','flow','freeform'].map(api.graphCameraKey)).size,6);
});
test('every record has finite stable coordinates, including unlinked notes and disconnected pairs',()=>{
  const nodes=Array.from({length:1500},(_,i)=>({id:'n'+i,name:'Item '+i,kind:i%11?'file':'agent'}));
  const links=nodes.slice(1,1150).flatMap((n,i)=>i%8?[{from:nodes[i].id,to:n.id}]:[]);
  const {cloud}=api.atlasCloud(nodes,links);
  const again=api.atlasCloud([...nodes].reverse(),[...links].reverse()).cloud;
  assert.deepEqual([...cloud],[...again]);
  for(const angle of [-1,0,2]){
    const matrix=api.viewMatrix(api.homeOrientation(angle));
    for(const point of cloud.values())assert.ok(api.projectPoint(point,matrix).every(Number.isFinite));
  }
  const {positions}=api.flowArrangement(nodes);
  assert.equal(new Set([...positions.values()].map(p=>p.join(','))).size,nodes.length);
});

test('Orbit assigns actual undirected distances, keeps separate components distinct and falls back after deletion',()=>{
  const nodes=['a','b','c','d','e'].map(id=>({id,name:id,kind:'file'}));
  const links=[{from:'b',to:'a'},{from:'c',to:'b'},{from:'d',to:'e'},{from:'a',to:'missing'}];
  const a=api.orbitArrangement(nodes,links,'a');
  assert.equal(a.root,'a');
  assert.deepEqual(Array.from(a.rings,r=>[r.depth,[...r.ids].join('')]),[[1,'b'],[2,'c'],[null,'de']]);
  assert.deepEqual([...a.positions.get('a')],[0,0]);
  assert.equal(api.orbitArrangement(nodes,links,'missing').root,'b');
  assert.equal(api.orbitArrangement([],[],null).positions.size,0);
});
test('Clusters pack all records inside their own non-overlapping regions',()=>{
  const regions=[2,31,5,1].map((n,i)=>({id:'hub:g'+i+'-0',name:'Group '+i,ids:Array.from({length:n},(_,j)=>'g'+i+'-'+j)}));
  const {positions,districts}=api.clusterArrangement(regions);
  assert.equal(positions.size,39);
  for(const d of districts)for(const id of d.ids){
    const [x,y]=positions.get(id);assert.ok(Math.hypot(x-d.x,y-d.y)<d.radius);
  }
  for(const [i,d] of districts.entries())for(const other of districts.slice(i+1))
    assert.ok(Math.hypot(d.x-other.x,d.y-other.y)>d.radius+other.radius);
});

test('pitch crosses the poles, roll turns screen axes, and near points have greater parallax',()=>{
  const {axisRotation,viewMatrix,composeRotation,projectPoint}=api;
  const q=axisRotation(1,0,0,Math.PI/2),p=[0,0,120];
  const pitched=projectPoint(p,viewMatrix(q));
  assert.ok(Math.abs(pitched[1]+120)<1e-8);
  const rolled=projectPoint(p,viewMatrix(composeRotation(axisRotation(0,0,1,Math.PI/2),q)));
  assert.ok(Math.abs(rolled[0]-120)<1e-8);
  let full=[0,0,0,1];
  for(let i=0;i<4;i++)full=composeRotation(q,full);
  assert.ok(Math.abs(Math.abs(full[3])-1)<1e-9);
  assert.ok(projectPoint([100,0,170],viewMatrix(full))[0]>projectPoint([100,0,-170],viewMatrix(full))[0]);
});
test('reads the legacy yaw, normalizes saved orientations, and falls back for broken saves',()=>{
  assert.deepEqual(api.savedOrientation({atlasAngle:1},'atlas'),api.homeOrientation(1));
  assert.deepEqual([...api.savedOrientation({spatialOrientation:[0,0,0,2]},'spatial')],[0,0,0,1]);
  for(const invalid of [[0,0,0,0],[0,NaN,0,1],[1],null]){
    assert.deepEqual(api.savedOrientation({atlasOrientation:invalid},'atlas'),api.homeOrientation());
  }
});
test('Spatial includes isolated records and separates front, interior, and rear records',()=>{
  const nodes=Array.from({length:10},(_,i)=>({id:'n'+i,name:'Item '+i,kind:i?'file':'agent'}));
  const links=nodes.slice(1,9).map(n=>({from:'n0',to:n.id}));
  const cloud=api.spatialCloud(api.atlasCloud(nodes,links).regions);
  assert.equal(cloud.size,10);assert.ok(cloud.has('n9'));
  assert.ok(new Set([...cloud.values()].map(p=>p[2])).size>=7);
});
