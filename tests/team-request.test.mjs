import test from 'node:test';
import assert from 'node:assert/strict';
import {readTeamRequest} from '../supabase/functions/agenetic-business/request.mjs';

const request=body=>new Request('http://localhost',{method:'POST',body});
test('team actions decode text that crosses a stream chunk boundary',async()=>{
 const payload={action:'project_put',name:'Field café'};
 const bytes=new TextEncoder().encode(JSON.stringify(payload)),i=bytes.indexOf(195)+1;
 const body=new ReadableStream({start(c){c.enqueue(bytes.slice(0,i));c.enqueue(bytes.slice(i));c.close()}});
 assert.deepEqual(await readTeamRequest(new Request('http://localhost',{method:'POST',body,duplex:'half'})),payload);
});
test('team forms report unsupported actions, unreadable JSON and oversized messages',async()=>{
 await assert.rejects(readTeamRequest(request(JSON.stringify({action:'unavailable'}))),/supported/);
 await assert.rejects(readTeamRequest(request('')),/read/);
 await assert.rejects(readTeamRequest(request(JSON.stringify({action:'support',body:'a'.repeat(1_100_000)}))),RangeError);
});

test('checkout resumes only the exact monthly or annual seat selection',async()=>{
 const {checkoutConflict}=await import('../supabase/functions/agenetic-business/checkout.mjs');
 const {PRICES}=await import('../supabase/functions/agenetic-business/rules.mjs');
 const items={data:[{price:{id:PRICES.month},quantity:3}],has_more:false};
 const expires=1_800_000_000;
 assert.equal(checkoutConflict(items,PRICES.month,3,expires),null);
 assert.match(checkoutConflict(items,PRICES.month,2,expires),/3 seat\(s\) billed per month/);
 assert.match(checkoutConflict(items,PRICES.year,3,expires),/per month/);
 assert.ok(checkoutConflict({...items,has_more:true},PRICES.month,3,expires));
 assert.ok(checkoutConflict({data:[],has_more:false},PRICES.month,3,expires));
});
