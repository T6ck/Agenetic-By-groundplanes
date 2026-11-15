import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {test} from 'node:test';
import assert from 'node:assert/strict';

const script=readFileSync('public/knowledge.js','utf8');
const part=(start,end)=>script.slice(script.indexOf(start),script.indexOf(end));
const layout=part('function organizedGraphPositions','let arrangingGraph');
test('organization groups related nodes and remains stable on a large graph',()=>{
 const organize=runInNewContext(layout+'\norganizedGraphPositions',{});
 const nodes=Array.from({length:1500},(_,index)=>({id:String(index),name:'Note '+index,kind:'file'}));
 const edges=nodes.slice(1,1400).flatMap((node,index)=>index%10===9?[]:[{from:String(index),to:node.id}]);
 const ordered=organize(nodes,edges);
 const reversed=organize([...nodes].reverse(),[...edges].reverse());
 assert.equal(ordered.size,1500);
 assert.equal(new Set([...ordered.values()].map(point=>point.join(','))).size,1500);
 assert.deepEqual([...ordered],[...reversed]);
 for(const {from,to} of edges.slice(0,8)) {
  const [x,y]=ordered.get(from),[a,b]=ordered.get(to);
  assert.ok(Math.hypot(x-a,y-b)<850);
 }
});
test('organize only moves visible nodes, and undo restores the hand-placed layout and camera',async()=>{
 const nodes=[{id:'a',name:'Source',kind:'file'},{id:'b',name:'Step',kind:'task'}];
 const original={a:[20,60],b:[25,60],hidden:[550,700]};
 const network={positions:new Map(Object.entries(original)),camera:{x:40,y:25,scale:.7}};
 const space={id:'space',graphPositions:original,graphCamera:network.camera};
 const api=runInNewContext(part('function organizedGraphPositions','function calculateNetwork')+'\nchangeGraphArrangement',{
  network,activeSpace:()=>space,networkData:()=>({nodes,links:[{from:'a',to:'b'}]}),
  render(){},save:async()=>{},toast(){}
 });
 await api();
 assert.notDeepEqual(network.positions.get('a'),network.positions.get('b'));
 assert.deepEqual(network.positions.get('hidden'),original.hidden);
 await api(true);
 for(const [id,point] of Object.entries(original)) assert.deepEqual(network.positions.get(id),point);
 assert.deepEqual({...network.camera},{x:40,y:25,scale:.7});
});
