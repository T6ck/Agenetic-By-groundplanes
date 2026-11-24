import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';

const script=readFileSync(new URL('../public/project-tools.js',import.meta.url),'utf8');
function project(){
 const data={files:[],tasks:[],links:[]};
 const context=vm.createContext({data,crypto:{randomUUID},Blob});
 vm.runInContext(script,context);
 return {...context,data};
}
test('each production starter links only its own notes and tasks',()=>{
 const env=project();
 for(const [key,layout] of Object.entries({network:'signal',edit:'flow',scene:'atlas',model:'clusters'})){
  const space={members:[]},first=env.data.links.length;
  env.populateProject(space,key);
  assert.equal(space.graphLayout,layout);
  assert.equal(new Set(space.members).size,7);
  assert.ok(env.data.links.length-first>=6);
  for(const edge of env.data.links.slice(first))assert.ok(space.members.includes(edge.from)&&space.members.includes(edge.to));
 }
 assert.equal(new Set(env.data.files.map(f=>f.id)).size,16);
});
test('caption reader preserves timecodes and multiline dialogue',()=>{
 const env=project(),cues=env.captionCues('WEBVTT\r\n\r\nboat\r\n00:01.150 --> 00:02.600 align:start\r\nFirst line\r\nSecond line');
 assert.equal(cues.length,1);
 assert.equal(cues[0].start,'00:01.150');
 assert.equal(cues[0].end,'00:02.600');
 assert.equal(cues[0].dialogue,'First line\nSecond line');
});
test('indexes creative file formats while leaving outputs and large files alone',async()=>{
 const env=project();
 const read=(name,body)=>env.productionText(new File([body],name));
 assert.match(await read('stage.obj','o Deck\nv 1 2 3\nf 1 2 3'),/1 vertices/);
 assert.match(await read('pier.gltf','{"asset":{"version":"2.0"},"meshes":[{"name":"Pier"}]}'),/1 meshes\n  Pier/);
 const notebook=await read('eval.ipynb','{"cells":[{"source":["print(1)"],"outputs":["hidden"]}]}');
 assert.match(notebook,/print\(1\)/);
 assert.doesNotMatch(notebook,/hidden/);
 assert.equal(await read('broken.gltf','{'),null);
 assert.equal(await read('cut.edl','TITLE: North Pier'),'TITLE: North Pier');
 assert.equal(await read('eval.jsonl','{"score":0.85}'),'{"score":0.85}');
 assert.equal(await env.productionText({name:'large.obj',size:3000000,text(){throw Error('Unexpected read')}}),null);
});
