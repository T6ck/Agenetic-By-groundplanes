import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newJournal,recoverJournal,queueJob,nextJob,checkpoint,duplicateDrafts,placeGenerated} from '../public/research-journal.mjs';
const task=(id='a',revision='r')=>({id,question:'What supports this claim?',sources:['s'],revision,context:'File: Source\nEvidence',task:'task-'+id});
test('changed input queues once; restart preserves checkpoints without silently resuming',()=>{
 const j=newJournal();j.enabled=true;const job=queueJob(j,task());
 assert.equal(queueJob(j,task()),null);checkpoint(job,'Evidence review','The source says this.');job.status='running';
 recoverJournal(j);assert.equal(j.enabled,false);assert.equal(job.status,'interrupted');assert.equal(job.steps.length,1);
 assert.ok(queueJob(j,task('b','changed')));assert.equal(nextJob(j),null);
});
test('daily cap blocks new jobs but permits a previously started checkpoint',()=>{
 const j=newJournal();j.enabled=true;j.dailyLimit=1;const a=queueJob(j,task());a.startedAt=Date.now();a.status='needs_review';
 const b=queueJob(j,task('b','r2'));assert.equal(nextJob(j),null);a.status='queued';assert.equal(nextJob(j),a);b.status='proposed';assert.equal(nextJob({...j,jobs:[b]}),null);
});
test('checkpoints require the expected stage and readable output',()=>{
 const j=newJournal(),a=queueJob(j,task());assert.throws(()=>checkpoint(a,'Synthesis','premature'));assert.throws(()=>checkpoint(a,'Evidence review',' '));assert.equal(a.steps.length,0);
});
test('duplicate recovery only targets exact unattended drafts with identical provenance',()=>{
 const original={id:'s',text:'same'},draft={id:'a',text:'same',research:{journalJob:'j',state:'pending',sources:['s']}},copy=structuredClone(draft);copy.id='b';
 assert.deepEqual(duplicateDrafts([original,draft,copy]),[{id:'b',canonical:'a'}]);copy.research.sources=['other'];assert.deepEqual(duplicateDrafts([draft,copy]),[]);
 copy.research.sources=['s'];copy.research.noAutoArchive=true;assert.deepEqual(duplicateDrafts([draft,copy]),[]);copy.research.state='supported';assert.deepEqual(duplicateDrafts([draft,copy]),[]);
});
test('automatic placement preserves manual positions and avoids occupied slots',()=>{
 const s={graphPositions:{source:[20,30],manual:[260,30]}};placeGenerated(s,'a','source');assert.deepEqual(s.graphPositions.a,[260,140]);placeGenerated(s,'manual','source');assert.deepEqual(s.graphPositions.manual,[260,30]);
});

test('long journals retain history without blocking new work',()=>{
 const j=newJournal();for(let i=0;i<200;i++){const x=queueJob(j,task(String(i),String(i)));x.status='needs_review';}
 assert.equal(queueJob(j,task('0','0')),null);assert.ok(queueJob(j,task('new','new')));
});
test('twenty unfinished tasks bound the queue and cancelled tasks release capacity',()=>{
 const j=newJournal();for(let i=0;i<20;i++)queueJob(j,task(String(i),String(i)));
 assert.throws(()=>queueJob(j,task('new','new')),/20 unfinished/);j.jobs[0].status='cancelled';assert.ok(queueJob(j,task('new','new')));
});

test('review backlog pauses new requests until a draft review is finished',()=>{
 const j=newJournal();j.enabled=true;for(let i=0;i<5;i++){const job=queueJob(j,task(String(i),String(i)));job.status='needs_review';}
 const queued=queueJob(j,task('next','next'));assert.equal(nextJob(j),null);j.jobs[0].status='completed';assert.equal(nextJob(j),queued);
});
