import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {compactCycleContext,runResearchCycle} from '../public/research-cycle.mjs';
const section=(file,start,end)=>{const s=readFileSync('public/'+file,'utf8');return s.slice(s.indexOf(start),s.indexOf(end));};

test('synthesis retains every selected source and both long prior passes',()=>{
 const context=Array.from({length:4},(_,i)=>'File: source-'+i+'\n'+String(i).repeat(1000)).join('\n\n');
 const result=compactCycleContext(context,[{stage:'Evidence review',output:'E'.repeat(1000)},{stage:'Critical review',output:'C'.repeat(1000)}]);
 for(let i=0;i<4;i++)assert.ok(result.includes('File: source-'+i));
 assert.match(result,/Evidence review:\nE+/);assert.match(result,/Critical review:\nC+/);
 assert.ok(result.length<2100);
});
test('completed passes remain available when a later request fails',async()=>{
 let partial,calls=0;
 await assert.rejects(runResearchCycle({question:'Compare',context:'source',onResult:r=>partial=r,request:async()=>{
  if(++calls===2)throw Error('Runner stopped');return {output:'First pass retained'};
 }}),/Runner stopped/);
 assert.equal(partial.steps.length,1);assert.equal(partial.steps[0].output,'First pass retained');
});
test('wiki links resolve only unambiguous notes in this workspace',()=>{
 const nodes=[{id:'a',kind:'file',name:'Source',text:'[[Target]]'},{id:'b',kind:'file',name:'Target'}];
 const outside={id:'outside',kind:'file',name:'Target'};
 const data={files:[...nodes,outside]};
 const api=runInNewContext(section('knowledge.js','function fileNameKey','function matchesExplorerQuery')+'\nstudioLinks',{
  data,explicitStudioLinks:()=>[],spaceNodes:()=>nodes,studioNodes:()=>[...nodes,outside]
 });
 assert.equal(api()[0].to,'b');
 nodes.push({id:'duplicate',kind:'file',name:'Target'});
 assert.equal(api().length,0);
});
test('derived wiki link disconnect does not claim to mutate the graph',async()=>{
 let writes=0,message='';
 const unlink=runInNewContext(section('canvas.js','async function unlinkStudio','function fitSpace')+'\nunlinkStudio',{
  commitStudio:async()=>writes++,toast:m=>message=m
 });
 await unlink('a|b|wikilink');assert.equal(writes,0);assert.match(message,/source note/);
});
test('review queue classifies pending and changed evidence without altering records',()=>{
 const files=[{id:'p',research:{state:'pending'}},{id:'e',research:{state:'evidence'}},{id:'c',research:{state:'supported'}},{id:'plain'}];
 const api=runInNewContext(section('research.js','function researchStateLabel','function reviewQueueDialog')+'\nresearchReviewItems',{
  workspaceSourceFiles:()=>files,researchSourceReady:file=>file.id==='c'
 });
 const items=api();assert.equal(items.length,3);assert.equal(items[0].label,'Needs review');
 assert.equal(items[1].stale,true);assert.equal(items[2].stale,false);
 assert.equal(files[1].research.state,'evidence');
});
