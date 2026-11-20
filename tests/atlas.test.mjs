import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {test} from 'node:test';
import assert from 'node:assert/strict';

const source=readFileSync('public/graph-atlas.js','utf8');
const api=runInNewContext(source+'\n({atlasCloud,projectedAtlasPositions,flowArrangement,orbitArrangement,clusterArrangement,workspaceGraphLayout,graphCameraKey})');
test('new spaces open in Atlas and existing manual layouts keep their workspace camera',()=>{
  assert.equal(api.workspaceGraphLayout({}), 'atlas');
  assert.equal(api.workspaceGraphLayout({graphPositions:{a:[10,4]}}),'freeform');
  assert.equal(api.workspaceGraphLayout({graphCamera:{scale:.5,x:0,y:0}}),'freeform');
  assert.equal(api.workspaceGraphLayout({graphLayout:'flow',graphPositions:{a:[1,2]}}),'flow');
  assert.equal(new Set(['atlas','clusters','orbit','flow','freeform'].map(api.graphCameraKey)).size,5);
});
test('every record has finite stable coordinates, including unlinked notes and disconnected pairs',()=>{
  const nodes=Array.from({length:1500},(_,i)=>({id:'n'+i,name:'Item '+i,kind:i%11?'file':'agent'}));
  const links=nodes.slice(1,1150).flatMap((n,i)=>i%8?[{from:nodes[i].id,to:n.id}]:[]);
  const {cloud}=api.atlasCloud(nodes,links);
  const again=api.atlasCloud([...nodes].reverse(),[...links].reverse()).cloud;
  assert.deepEqual([...cloud],[...again]);
  for(const angle of [-1,0,2]){
    const positions=api.projectedAtlasPositions(cloud,angle);
    assert.equal(positions.size,nodes.length);
    for(const point of positions.values())assert.ok(point.every(Number.isFinite));
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
