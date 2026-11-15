import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {test} from 'node:test';
import assert from 'node:assert/strict';

const extract = (file, from, to) => {
 const source = readFileSync('public/' + file, 'utf8');
 return source.slice(source.indexOf(from), source.indexOf(to));
};
function fixture(){
 const agent = {id:'agent', files:['direct','outside'], role:'Reviewer', task:'Compare temperature'};
 const task = {id:'second', agent:'agent', status:'planned'};
 const data = {
  profile:{id:'profile'},
  files:[
   {id:'direct', name:'Direct.md', text:'Temperature was 18 C. [[Linked]]'},
   {id:'step', name:'Step.md', text:'Temperature was 20 C.'},
   {id:'linked', name:'Linked.md', text:'Temperature was 22 C. [[Far]]'},
   {id:'far', name:'Far.md', text:'Temperature was 24 C.'},
   {id:'outside', name:'Outside.md', text:'Temperature was 999 C.'},
   {id:'hidden', name:'Hidden.md', text:'Temperature was 101 C.'},
  ],
  links:[{from:'step',to:'second'},{from:'first',to:'second'},{from:'direct',to:'hidden'}],
  tasks:[task,{id:'first'},{id:'unrelated'}]
 };
 const space = {id:'space',members:['direct','step','linked','far','hidden','first','second','unrelated'],hidden:['hidden']};
 let writes = 0;
 const code = extract('app.js','function researchSourceReady','function workspaceSourceFiles') + extract('app.js','function agentSourceScope','function showAgent') +
  extract('app.js','function selectContext','async function run(agent') +
  extract('canvas.js','function evidenceWorkflow','async function executeStep');
 const api = runInNewContext(code + '({agentSourceScope,selectContext,saveAgentEvidence,evidenceWorkflow,researchSourceReady,appendResearchNode})', {
  data, activeSpace:()=>space, fileNameKey:value=>value.replace(/\.md$/i,'').toLowerCase(),
  crypto, Blob, TextEncoder, save:async()=>{writes++}
 });
 return {api, data, agent, task, writes:()=>writes};
}
test('source scope follows explicit and opted-in links within a workspace', () => {
 const {api, agent, task} = fixture();
 assert.deepEqual([...api.agentSourceScope(agent, task, false).files], ['direct','step']);
 const scope = api.agentSourceScope(agent, task, true);
 assert.deepEqual([...scope.files], ['direct','step','linked']);
 const result = api.selectContext(scope,'Compare temperatures and temperature',true);
 assert.equal(result.quotes.length,3);
 assert.doesNotMatch(result.text,/999|101|24 C/);
 assert.equal(api.selectContext(scope,'Research mortgages',true).quotes.length,0);
});
test('unchanged evidence is reused and edited source text is recorded again', async () => {
 const {api, data, agent, task, writes} = fixture();
 const query = 'Compare temperature';
 const run = () => {
  const scope = api.agentSourceScope(agent,task,false);
  return api.saveAgentEvidence(agent,query,api.selectContext(scope,query,true),scope,task);
 };
 assert.equal((await run()).reused,false);
 assert.equal(task.status,'complete');
 assert.equal((await run()).reused,true);
 assert.equal(writes(),1);
 data.files[0].text = 'Temperature changed to 30 C.';
 assert.match((await run()).output,/30 C/);
 assert.equal(writes(),2);
});
test('workflow executes only the target dependency branch and detects cycles', () => {
 const {api,data} = fixture();
 assert.deepEqual(Array.from(api.evidenceWorkflow('second'), task=>task.id), ['first','second']);
 data.links.push({from:'second',to:'first'});
 assert.throws(()=>api.evidenceWorkflow('second'),/circular/);
});

test('a step creates a reusable graph result and its dependent sees it without feeding it back to itself', async () => {
 const {api,data,agent,task} = fixture();
 const upstream = data.tasks.find(item=>item.id==='first');
 upstream.agent = agent.id;
 const scope = api.agentSourceScope(agent,upstream,false);
 const read = api.selectContext(scope,'Compare temperature',true);
 const result = await api.saveAgentEvidence(agent,'Compare temperature',read,scope,upstream);
 assert.ok(result.node);
 assert.ok(data.links.some(link=>link.from==='direct'&&link.to===result.node));
 assert.ok(data.links.some(link=>link.from===upstream.id&&link.to===result.node));
 assert.ok(api.agentSourceScope(agent,task,false).files.includes(result.node));
 assert.ok(!api.agentSourceScope(agent,upstream,true).files.includes(result.node));
 data.files[0].text = 'Temperature changed.';
 assert.ok(!api.agentSourceScope(agent,task,false).files.includes(result.node));
});

test('pending, rejected, edited and disconnected claims cannot be handed off', () => {
 const {api,data,agent,task} = fixture();
 const draft = api.appendResearchNode({name:'Draft',text:'A claim was made.',state:'pending',sources:['direct']});
 data.links.push({from:draft.id,to:task.id});
 assert.ok(!api.agentSourceScope(agent,task,false).files.includes(draft.id));
 const evidence = data.files[0].text;
 const claim = api.appendResearchNode({name:'Claim',text:'Teacher recorded 18 C.',state:'supported',sources:['direct'],
  quotes:[{id:'direct',excerpt:evidence}],draft:draft.id});
 data.links.push({from:claim.id,to:task.id});
 assert.ok(api.agentSourceScope(agent,task,false).files.includes(claim.id));
 claim.text += ' Fabrication';
 assert.ok(!api.agentSourceScope(agent,task,false).files.includes(claim.id));
 claim.text = claim.research.reviewedText;
 data.links = data.links.filter(link=>link.from!=='direct'||link.to!==claim.id);
 assert.ok(!api.agentSourceScope(agent,task,false).files.includes(claim.id));
});

test('multiple targets share prerequisites only once', () => {
 const {api,data} = fixture();
 data.links.push({from:'first',to:'unrelated'});
 assert.deepEqual(Array.from(api.evidenceWorkflow(['second','unrelated']),task=>task.id), ['first','second','unrelated']);
});
