import {test} from 'node:test';
import {runInNewContext} from 'node:vm';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

test('an already-imported renamed PDF becomes selectable without changing the graph ID', async () => {
 const source = readFileSync('public/app.js', 'utf8');
 const code = source.slice(source.indexOf('function researchSourceReady'), source.indexOf("document.addEventListener('click', async event"));
 const file = {id:'original-id', name:'Reta Research PDF', size:32};
 const data = {profile:{id:'profile'}, files:[file], links:[{from:file.id,to:'agent'}]};
 let saves = 0;
 const api = runInNewContext(code + '\n({indexSavedPdfs,sourcePicker})', {
  data, activeSpace:()=>({id:'space', members:[file.id]}),
  window:{ageneticDesktop:{extractPdf:async bytes=>{
   assert.equal(bytes.byteLength,32);
   return {text:'[Page 1]\nReta research fixture', pages:1, indexedPages:1};
  }}},
  blob:async()=>new Blob([new Uint8Array(32)],{type:'application/pdf'}),
  save:async()=>{saves++;}, esc:String, Uint8Array,
 });
 assert.match(api.sourcePicker('Sources'),/No readable sources/);
 await api.indexSavedPdfs(data.files);
 assert.match(api.sourcePicker('Sources'),/value="original-id"/);
 assert.equal(data.links[0].from,file.id);
 assert.match(file.text,/Reta research fixture/);
 assert.equal(saves,1);
});
