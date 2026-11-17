// Real Chromium interactions against a local test vault. No production accounts or models.
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const html=JSON.parse((await readFile('app/workspace-html.ts','utf8')).replace(/^export default\s*/,'').trim().replace(/;$/,''));
const root=resolve('public'),out=resolve('audit-results');await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/api/session'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({scope:'guest',signedIn:false}));return;}
  if(pathname==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}
  const file=resolve(root,'.'+decodeURIComponent(pathname));
  if(!file.startsWith(root+'/')){res.writeHead(403).end();return;}
  res.setHeader('Content-Type',({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.ttf':'font/ttf','.webp':'image/webp'})[extname(file)]||'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
const checks=[];
async function check(name,run){await run();checks.push(name);console.log('PASS '+name);}
try{
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.waitForSelector('.knowledge-node');
 await check('save closes inspector and stays closed',async()=>{
  await page.locator('[data-network="open"]').first().click();
  await page.locator('[data-reader-mode="edit"]').click();
  await page.locator('#studio-editor [name="name"]').fill('Audit source');
  await page.locator('#studio-editor [type="submit"]').click();
  await page.waitForFunction(()=>!studio.inspector);
  await page.evaluate(()=>render());assert.equal(await page.locator('#space-inspector').isVisible(),false);
 });
 await check('collapsed sections survive render and reload',async()=>{
  await page.locator('[data-explorer-kind="agent"] summary').click();
  await page.waitForFunction(()=>activeSpace().explorerClosed?.includes('agent'));
  await page.evaluate(()=>save());await page.reload();await page.waitForSelector('.knowledge-node');
  assert.equal(await page.locator('[data-explorer-kind="agent"]').getAttribute('open'),null);
 });
 await check('companion closes and stays closed',async()=>{
  await page.locator('[data-research-toggle]').click();await page.locator('[data-research-close]').click();
  await page.evaluate(()=>render());assert.equal(await page.locator('.research-companion').count(),0);
 });
 await check('review queue finds a draft and opens claim review',async()=>{
  await page.evaluate(()=>{appendResearchNode({name:'Audit draft',text:'A statement needing a source check.',state:'pending',sources:[data.files[0].id]});render();});
  await page.locator('[data-destination="review"]').click();
  assert.match(await page.locator('.review-queue').innerText(),/Audit draft/);
  await page.locator('[data-review-open]').click();await page.waitForSelector('#claim-review');
  await page.locator('#dialog [data-act="close"]').click();
 });
 await check('research form runs three mocked passes through the real submit handler',async()=>{
  await page.evaluate(()=>{
   data.models.push({id:'audit-model',name:'Test model'});token='test-only';
   window.auditModelCalls=0;
   localModelRequest=async()=>({output:'Completed test pass '+(++window.auditModelCalls)});
   cycleDialog();
  });
  await page.locator('#research-cycle [name="question"]').fill('Compare the interviews');
  await page.locator('#research-cycle [name="model"]').selectOption('audit-model');
  await page.locator('#research-cycle input[name="sources"]').first().check();
  await page.locator('#research-cycle [type="submit"]').click();
  await page.waitForFunction(()=>window.auditModelCalls===3&&!running);
  assert.match(await page.locator('#cycle-progress').innerText(),/Three passes complete/);
  await page.locator('#dialog [data-act="close"]').click();
 });
 await check('center, zoom and graph filters change the view',async()=>{
  const before=await page.evaluate(()=>network.camera.scale);
  await page.locator('[data-network="zoom-in"]').click();
  assert.ok(await page.evaluate(()=>network.camera.scale)>before);
  await page.locator('[data-network="fit"]').click();
  await page.locator('[data-network="type"][data-key="agent"]').click();
  assert.equal(await page.locator('[data-knowledge-node].agent').count(),0);
  assert.match(await page.locator('#graph-count').innerText(),/hidden by this view/);
  await page.locator('[data-network="all"]').click();
 });
 await check('research journal saves results while another view is open and retains them after reload',async()=>{
  await page.evaluate(async()=>{
   await deskReady;await bootDesk();
   const source=data.files.find(f=>f.text&&!f.research);
   Object.assign(deskState(),{goal:'Compare the interview evidence',model:'audit-model',sources:[source.id],dailyLimit:12,enabled:true,organize:true});deskSession=deskKey();
   localModelRequest=async()=>({output:'The source describes a research need. Review the original passage before accepting this conclusion.'});
   const job=await deskEnqueue(deskState().goal,[source.id]);
   page='Models';render();await deskRun(job);
   window.auditJobId=job.id;
  });
  assert.equal(await page.evaluate(()=>deskState().jobs.at(-1).status),'needs_review');
  assert.ok(await page.evaluate(()=>data.files.some(f=>f.research?.journalJob===window.auditJobId)));
  await page.reload();await page.waitForSelector('.knowledge-node');
  await page.evaluate(async()=>{await bootDesk();page='Research';render();});
  assert.equal(await page.evaluate(()=>deskState().enabled),false);
  assert.match(await page.locator('#desk-live').innerText(),/needs review/);
  await page.screenshot({path:out+'/research-desk.png'});
  await page.locator('[data-desk-review]').first().click();await page.waitForSelector('#claim-review');
  await page.screenshot({path:out+'/claim-review.png'});
  await page.locator('#dialog [data-act="close"]').click();
 });
 await check('interrupted research resumes only unfinished passes',async()=>{
  await page.evaluate(async()=>{
   token='test-only';const j=deskState();j.enabled=true;deskSession=deskKey();
   const job=await deskEnqueue('Check the interview scope',j.sources);let calls=0;
   localModelRequest=async()=>{calls++;if(calls===2)throw Error('Test disconnect');return {output:'Saved evidence pass'};};
   await deskRun(job);if(job.steps.length!==1||job.status!=='blocked')throw Error('Checkpoint was not retained');
   localModelRequest=async()=>{calls++;return {output:'Resumed analysis'};};job.status='queued';j.enabled=true;await deskRun(job);
   if(calls!==4||job.status!=='needs_review')throw Error('Completed passes were repeated');
   j.enabled=false;page='Overview';render();await save();
  });
 });
 await check('100 overlapping scheduler ticks make one request and pause retains its checkpoint',async()=>{
  await page.evaluate(async()=>{
   const j=deskState();j.enabled=true;j.lastScan=Date.now();deskSession=deskKey();token='test-only';
   const job=await deskEnqueue('Check scheduler concurrency',j.sources);
   let release,started,calls=0;const entered=new Promise(resolve=>started=resolve),gate=new Promise(resolve=>release=resolve);
   localModelRequest=async()=>{calls++;started();await gate;return {output:'Evidence checkpoint retained'};};
   const ticks=Array.from({length:100},()=>deskTick());await entered;
   if(calls!==1)throw Error('Overlapping model requests');j.enabled=false;release();await Promise.all(ticks);
   if(calls!==1||job.status!=='interrupted'||job.steps.length!==1)throw Error('Pause did not preserve exactly one pass');
   job.status='cancelled';await save();
  });
 });
 await check('source edits during inference block stale results from entering the graph',async()=>{
  await page.evaluate(async()=>{
   const j=deskState();j.enabled=true;const job=await deskEnqueue('Check revision protection',j.sources);
   const source=data.files.find(f=>f.id===j.sources[0]),original=source.text;let calls=0;
   localModelRequest=async()=>{calls++;source.text=original+' Changed during inference.';return {output:'Stale inference result'};};
   await deskRun(job);
   if(calls!==1||job.status!=='blocked'||job.output||j.enabled)throw Error('Stale evidence escaped review boundary');
   source.text=original;job.status='cancelled';await save();
  });
 });
 for(const theme of ['porcelain','graphite','midnight','ember','forest']){
  await page.evaluate(theme=>{appearance().theme=theme;appearance().headings='sans';appearance().depth='off';appearance().grid=true;render();},theme);
  await check(theme+' respects independent grid and heading settings',async()=>{
   assert.notEqual(await page.locator('.grid-field').first().evaluate(e=>getComputedStyle(e).display),'none');
   await page.evaluate(()=>navigateDialog());
   assert.match(await page.locator('#dialog h2').evaluate(e=>getComputedStyle(e).fontFamily),/Instrument Sans/);
   await page.locator('#dialog [data-act="close"]').click();
  });
  await page.screenshot({path:out+'/'+theme+'-graph.png'});
 }
 await page.evaluate(()=>{appearance().theme='porcelain';render();});
 for(const width of [1024,768,390]){
  await page.setViewportSize({width,height:900});
  await page.evaluate(()=>render());
  await check(width+'px navigation remains reachable',async()=>{
   await page.locator('[data-navigate]').click();
   await page.locator('#dialog [data-destination="review"]').click();
   assert.equal(await page.locator('.review-queue').isVisible(),true);
   await page.locator('#dialog [data-act="close"]').click();
  });
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Page must not overflow horizontally');
  await page.screenshot({path:out+'/graph-'+width+'.png'});
 }
 assert.deepEqual(errors,[]);
}catch(error){await page.screenshot({path:out+'/failure.png'});throw error;}
finally{await writeFile(out+'/checks.json',JSON.stringify({checks,errors},null,2));await browser.close();await new Promise(resolve=>server.close(resolve));}
