import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validatePackage} from '../public/exchange-schema.mjs';
const base={format:'agenetic/1',name:'Evidence kit',version:'1.0.0',description:'A useful research package.'};
test('accepts declarative templates and instruction plugins',()=>{
for(const p of [{kind:'template',payload:{notes:[{name:'Question',text:'What evidence would change this conclusion?'}],tasks:[]}},{kind:'plugin',payload:{role:'Reviewer',instructions:'Cite the assigned sources.'}}]) assert.equal(validatePackage({...base,...p}).kind,p.kind);
});
test('rejects executable fields and credentials in MCP presets',()=>{
assert.throws(()=>validatePackage({...base,kind:'plugin',payload:{role:'Reviewer',instructions:'Check evidence.',script:'alert(1)'}}));
for(const endpoint of ['https://user:secret@example.com/mcp','https://example.com/mcp?token=secret','https://127.0.0.1/mcp'])assert.throws(()=>validatePackage({...base,kind:'mcp',payload:{transport:'streamable-http',endpoint,auth:'oauth'}}));
assert.doesNotThrow(()=>validatePackage({...base,kind:'mcp',payload:{transport:'streamable-http',endpoint:'https://example.com/mcp',auth:'oauth'}}));
});
test('rejects low contrast and CSS injection in themes',()=>{
const p={...base,kind:'theme',payload:{scheme:'dark',bg:'#111111',panel:'#161616',raised:'#202020',ink:'#ffffff',muted:'#cccccc',line:'#333333',accent:'#aaddcc',colors:['#aaddcc','#ffffff','#cccccc','#bbccdd']}};
assert.doesNotThrow(()=>validatePackage(p));
assert.throws(()=>validatePackage({...p,payload:{...p.payload,ink:'#222222'}}));
assert.throws(()=>validatePackage({...p,payload:{...p.payload,accent:'red; background:url(https://example.com)'}}));
});
