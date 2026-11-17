import {test} from 'node:test';
import assert from 'node:assert/strict';
import {modelSetup,paidAccess,seatCount,claimAudit,auditHtml,PERSONAL_FEATURES} from '../public/business-rules.mjs';
test('personal features remain ungated and checkout success is not entitlement',()=>{
 assert.ok(PERSONAL_FEATURES.includes('claim_review'));assert.ok(PERSONAL_FEATURES.includes('workflow_export'));
 assert.equal(paidAccess({status:'unpaid',seats:2,period_end:'2099-01-01'}),false);
 assert.equal(paidAccess({status:'active',seats:2,period_end:'2099-01-01',risk_hold:true}),false);
 for(const n of [0,-1,501,1.2,'2'])assert.throws(()=>seatCount(n));
});
test('shared model pins exact weights without secrets or local paths',()=>{
 const v={name:'Research',repo:'org/model',revision:'a'.repeat(40),filename:'model.gguf',context:2048,threads:4,gpuLayers:0};
 assert.equal(modelSetup(v),v);
 for(const changes of [{revision:'main'},{apiKey:'secret'},{filename:'../model.gguf'},{context:999999}])assert.throws(()=>modelSetup({...v,...changes}));
});
test('audit checks current quotes without claiming scientific validation',async()=>{
 const files=[{id:'source',name:'Paper',text:'Observed result.'},{id:'claim',name:'A claim',research:{state:'supported',quotes:[{id:'source',excerpt:'Observed result.'}]}}];
 const report=await claimAudit(files,{team:'<script>alert(1)</script>',workspace:'Study',reviewer:'Reviewer'});
 assert.equal(report.rows[0].check,'exact_quote_present');assert.equal(report.rows[0].evidence[0].source_sha256.length,64);
 assert.ok(!auditHtml(report).includes('<script>'));
 files[0].text='Changed';assert.equal((await claimAudit(files,{})).rows[0].check,'quote_missing_or_changed');
});
