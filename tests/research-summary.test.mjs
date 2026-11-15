import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {test} from 'node:test';
import assert from 'node:assert/strict';

const script = readFileSync('public/research.js','utf8');
const code = script.slice(script.indexOf('function researchInputSources'),script.indexOf('function researchSourceDefaults'));
test('only complete follow-up questions with a supplied source tag are retained', () => {
 const parse = runInNewContext(code+'\nparseResearchQuestions',{});
 const result = parse('S1 | What evidence confirms the finding?\nS9 | What is the invented source?\nS2 | What did the other',[
  {label:'S1',id:'first'},{label:'S2',id:'second'}
 ]);
 assert.equal(result.length,1);
 assert.equal(result[0].source.id,'first');
 assert.equal(parse('[{"title":"truncated',[]).length,0);
 assert.equal(parse('',[]).length,0);
});
test('input includes a bounded excerpt for each selected section and stable source tags', () => {
 const inputs=[{id:'first',name:'Same title',text:'a'.repeat(1200)},{id:'second',name:'Same title',text:'😺'.repeat(300)}];
 const run = runInNewContext(code+'\n({researchInputSources,sourcePrompt})',{
  workspaceSourceFiles:()=>inputs,selectedResearchSources:ids=>ids,
  selectContext:scope=>({quotes:[{excerpt:inputs.find(input=>input.id===scope.files[0]).text}]}),
  TextEncoder,TextDecoder
 });
 const sources=run.researchInputSources(['first','second'],'Compare evidence');
 assert.equal(sources.length,2);
 assert.equal(sources[0].label,'S1');
 assert.equal(sources[1].label,'S2');
 assert.equal(new TextEncoder().encode(sources[1].excerpt).length,900);
 assert.match(run.sourcePrompt(sources),/\[S1\] Same title[\s\S]+\[S2\] Same title/);
});
