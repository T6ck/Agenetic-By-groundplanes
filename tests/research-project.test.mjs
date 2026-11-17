import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ensureProject,createPassageIndex,proposeBrief,applyBrief,historyPage} from '../public/research-project.mjs';
test('retrieval finds late evidence, preserves source identity and reports unreadable inputs',()=>{
 const index=createPassageIndex(),text='Boilerplate text. '.repeat(20000)+'A controlled study found contradictory outcomes in subgroup participants.';
 const result=index.select([{id:'a',name:'Same title',text},{id:'b',name:'Same title',text:'Subgroup participants had different outcomes.'},{id:'c',name:'Scan',text:''}],'subgroup participants');
 assert.ok(result.quotes[0].start>256*1024);assert.equal(result.quotes.length,2);assert.notEqual(result.quotes[0].id,result.quotes[1].id);assert.equal(result.sources[2].readable,false);
 const updated=index.select([{id:'a',name:'Same title',text:'Replaced source content.'}],'subgroup');assert.equal(updated.quotes[0].matched,false);assert.equal(updated.quotes[0].excerpt,'Replaced source content.');
});
test('coverage is explicit for oversized sources and does not silently imply full review',()=>{
 const result=createPassageIndex().select([{id:'a',name:'Large',text:'x'.repeat(2*1024*1024+10)}],'evidence');assert.equal(result.sources[0].partial,true);assert.equal(result.sources[0].scanned,2*1024*1024);
});
const claim=()=>({id:'c',text:'Claim with supporting quote',research:{state:'supported',statement:'Evidence supports this limited observation.',quotes:[{id:'s',excerpt:'Exact source passage.'}]}});
test('brief proposal preserves edits, validates current evidence and supports version recovery',()=>{
 const p=ensureProject({}),c=claim();p.brief.text='Human writing';const proposal=proposeBrief([c],p);assert.equal(p.brief.text,'Human writing');
 p.brief.text='New human writing';assert.throws(()=>applyBrief(p,proposal,[c],()=>true),/changed/);p.brief.text='Human writing';
 assert.throws(()=>applyBrief(p,proposal,[c],()=>false),/Evidence changed/);applyBrief(p,proposal,[c],()=>true);
 assert.equal(p.brief.text,c.research.statement);assert.equal(p.brief.versions[0].text,'Human writing');assert.equal(p.brief.citations[0].claim,'c');
});
test('history pagination retains all jobs and new project metadata leaves existing journal intact',()=>{
 const j={jobs:Array.from({length:245},(_,id)=>({id}))};ensureProject(j);assert.equal(j.jobs.length,245);assert.equal(historyPage(j,0)[0].id,244);assert.equal(historyPage(j,12).length,5);assert.equal(historyPage(j,13).length,0);
});
