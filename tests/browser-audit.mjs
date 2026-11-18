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
 await check('dense graph keeps labels and the cursor anchor stable through a wheel burst', async()=>{
  const result=await page.evaluate(async()=>{
   const svg=document.querySelector('.knowledge-svg');
   const layer=svg.querySelector('.network-nodes');
   const original=layer.firstElementChild;
   const bounds=svg.getBoundingClientRect();
   const clientX=Math.round(bounds.left+bounds.width/2),clientY=Math.round(bounds.top+bounds.height/2);
   const x=clientX-bounds.left,y=clientY-bounds.top;
   const oldCamera={...network.camera}, added=[];
   const title=original.querySelector('text');
   const renderedSize=()=>parseFloat(getComputedStyle(title).fontSize)*title.getScreenCTM().a;
   const anchor=()=>[(x-network.camera.x)/network.camera.scale,(y-network.camera.y)/network.camera.scale];
   const wheel=(delta,mode)=>svg.dispatchEvent(new WheelEvent('wheel',{
    bubbles:true,cancelable:true,clientX,clientY,deltaY:delta,deltaMode:mode
   }));
   try{
    const fragment=document.createDocumentFragment();
    for(let i=0;i<600;i++){
     const id='wheel-test-'+i, point=[(i%30)*62,Math.floor(i/30)*48];
     const node=original.cloneNode(true);
     node.dataset.knowledgeNode=id;node.setAttribute('transform','translate('+point.join(' ')+')');
     network.positions.set(id,point);added.push(id);fragment.append(node);
    }
    layer.append(fragment);
    network.camera={x:0,y:0,scale:1};applyNetworkCamera();
    const initial=renderedSize(), origin=anchor();
    for(let i=0;i<10;i++)wheel(-3,1);
    await new Promise(requestAnimationFrame);
    const moving=renderedSize(),scale=network.camera.scale,after=anchor();
    const readout=document.querySelector('#network-zoom').textContent;
    await new Promise(resolve=>setTimeout(resolve,220));
    return {initial,moving,settled:renderedSize(),scale,readout,anchorShift:Math.hypot(after[0]-origin[0],after[1]-origin[1])};
   }finally{
    added.forEach(id=>network.positions.delete(id));
    network.camera=oldCamera;activeSpace().graphCamera={...oldCamera};render();
   }
  });
  assert.ok(Math.abs(result.moving/result.initial-1)<.01);
  assert.ok(Math.abs(result.settled/result.initial-1)<.01);
  assert.ok(Math.abs(result.scale-Math.exp(.48))<.0001);
  assert.equal(result.readout,Math.round(result.scale*100)+'%');
  assert.ok(result.anchorShift<.01);
 });
 await check('graph status follows its title when zoom changes', async()=>{
  await page.locator('[data-network="zoom-in"]').click();
  const labels=await page.locator('.knowledge-node text').evaluateAll(elements=>elements.map(title=>[
   title.getAttribute('x'), title.querySelector('.node-state-label')?.getAttribute('x')
  ]));
  assert.ok(labels.length>0);
  assert.ok(labels.every(([title,state])=>title===state));
 });
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
  assert.equal(await page.locator('[data-desk-stop]').isVisible(),false);
  await page.locator('.project-next [data-project-tab="review"]').click();
  await page.waitForSelector('.project-review-row');
  await page.locator('.project-review-row [data-desk-review]').first().click();await page.waitForSelector('#claim-review');
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
 await check('editing an upstream original invalidates a derived research input',async()=>{
  await page.evaluate(async()=>{
   const j=deskState(),source=data.files.find(f=>f.id===j.sources[0]),original=source.text;
   const input=appendResearchNode({name:'Verified excerpt',text:'Verified excerpt',state:'evidence',sources:[source.id],quotes:[{id:source.id,excerpt:original.slice(0,20)}]});
   j.enabled=true;
   const job=await deskEnqueue('Audit derived inputs',[input.id]);
   localModelRequest=async()=>{source.text=original+' Updated.';return {output:'Outdated result'};};
   await deskRun(job);
   if(job.status!=='blocked'||job.steps.length||job.output)throw Error('Stale upstream source produced a checkpoint');
   source.text=original;job.status='cancelled';await save();
  });
 });
 await check('research sections preserve brief edits and show exact source preflight',async()=>{
  await page.evaluate(()=>{page='Research';projectModule.ensureProject(deskState()).tab='plan';render();});
  await page.locator('.project-tabs [data-project-tab="sources"]').click();
  await page.waitForSelector('.project-source blockquote');
  assert.match(await page.locator('.project-panel').innerText(),/characters scanned/);
  await page.screenshot({path:out+'/project-sources.png'});
  await page.locator('.project-tabs [data-project-tab="brief"]').click();
  await page.locator('#project-brief textarea').fill('My own careful research notes.');
  await page.locator('.project-tabs [data-project-tab="review"]').click();
  await page.locator('.project-tabs [data-project-tab="brief"]').click();
  assert.equal(await page.locator('#project-brief textarea').inputValue(),'My own careful research notes.');
  await page.locator('[data-brief-propose]').click();
  // With no supported claims, the user's writing remains intact.
  assert.equal(await page.locator('#project-brief textarea').inputValue(),'My own careful research notes.');
  await page.screenshot({path:out+'/project-brief.png'});
  await page.evaluate(()=>{page='Overview';render();});
 });
 await check('reviewed briefs require approval, keep versions, and flag changed source revisions',async()=>{
  await page.evaluate(()=>{
   const source=data.files.find(f=>f.id===deskState().sources[0]);
   const claim=appendResearchNode({name:'Reviewed observation',text:'A limited observation with evidence.',state:'supported',statement:'The project uses a configured research workflow.',sources:[source.id],quotes:[{id:source.id,excerpt:source.text.slice(0,80)}]});
   window.projectClaim=claim.id;page='Research';deskState().project.tab='brief';render();
  });
  await page.locator('[data-brief-propose]').click();await page.waitForSelector('.brief-proposal');
  assert.match(await page.locator('.brief-diff').innerText(),/My own careful research notes/);
  await page.locator('[data-brief-apply]').click();await page.waitForFunction(()=>!document.querySelector('.brief-proposal')&&document.querySelector('#project-brief textarea').value.includes('configured research workflow')); 
  assert.match(await page.locator('#project-brief textarea').inputValue(),/configured research workflow/);
  await page.evaluate(()=>{data.files.find(f=>f.id===deskState().sources[0]).text+=' New conflicting information.';render();});
  assert.match(await page.locator('.project-warning').innerText(),/evidence changed/);
  await page.locator('[data-brief-undo]').click();await page.waitForFunction(()=>document.querySelector('#project-brief textarea').value==='My own careful research notes.');
  await page.setViewportSize({width:390,height:900});
  await page.locator('.project-tabs [data-project-tab="sources"]').click();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:out+'/project-mobile.png'});
  await page.locator('[data-project-source]').first().click();await page.waitForSelector('#space-inspector:not([hidden])');
  await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>{studio.inspector=false;page='Overview';render();});
 });
 await check('failed brief save keeps unsaved writing visible and blocks navigation',async()=>{
  await page.evaluate(()=>{page='Research';deskState().project.tab='brief';render();window.realSave=save;save=async()=>{throw Error('Test storage quota failure');};});
  await page.locator('#project-brief textarea').fill('Unsaved writing must survive a failed save.');
  await page.locator('.project-tabs [data-project-tab="sources"]').click();
  await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('Test storage quota failure'));
  assert.equal(await page.locator('#project-brief textarea').inputValue(),'Unsaved writing must survive a failed save.');
  assert.equal(await page.evaluate(()=>deskState().project.tab),'brief');
  await page.evaluate(()=>{save=window.realSave;});
  await page.locator('#project-brief button[type="submit"]').click();
  await page.waitForFunction(()=>deskState().project.brief.text==='Unsaved writing must survive a failed save.');
  await page.evaluate(()=>{page='Overview';render();});
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
  if(width===390){const add=await page.locator('.network-add').boundingBox(),header=await page.locator('.family-header').boundingBox();assert.ok(add.y>=header.y+header.height,'Add controls must sit below navigation');}
  await page.screenshot({path:out+'/graph-'+width+'.png'});
 }
 assert.deepEqual(errors,[]);
}catch(error){await page.screenshot({path:out+'/failure.png'});throw error;}
finally{await writeFile(out+'/checks.json',JSON.stringify({checks,errors},null,2));await browser.close();await new Promise(resolve=>server.close(resolve));}
