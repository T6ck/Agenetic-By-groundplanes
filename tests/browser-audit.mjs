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
  await check(width+'px navigation remains reachable',async()=>{
   await page.locator('[data-navigate]').click();
   await page.locator('#dialog [data-destination="review"]').click();
   assert.equal(await page.locator('.review-queue').isVisible(),true);
   await page.locator('#dialog [data-act="close"]').click();
  });
  await page.screenshot({path:out+'/graph-'+width+'.png'});
 }
 assert.deepEqual(errors,[]);
}catch(error){await page.screenshot({path:out+'/failure.png'});throw error;}
finally{await writeFile(out+'/checks.json',JSON.stringify({checks,errors},null,2));await browser.close();await new Promise(resolve=>server.close(resolve));}
