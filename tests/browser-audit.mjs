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
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.ttf':'font/ttf','.webp':'image/webp'})[extname(file)]||'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
const checks=[];
async function check(name,run){await run();checks.push(name);console.log('PASS '+name);}
try{
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.waitForSelector('.knowledge-node');
 if(process.env.AGENETIC_GRAPH_BENCHMARK==='1'){
  const metrics=await page.evaluate(async()=>{
   const original=data,rows=[];
   const stats=times=>{
    times.sort((a,b)=>a-b);
    return {medianMs:+times[Math.floor(times.length/2)].toFixed(1),p95Ms:+times[Math.ceil(times.length*.95)-1].toFixed(1),samples:times.length};
   };
   try{
    for(const count of [600,1200,10000]){
     const files=Array.from({length:count},(_,i)=>({id:'n'+i,name:'Field interview '+i,kind:'file',text:'Field notes.'}));
     const links=files.flatMap((n,i)=>[i+1,i+17].filter(j=>j<count).map(j=>({from:n.id,to:files[j].id,kind:'reference'})));
     const pathTimes=[];
     for(let i=0;i<33;i++){
      const t=performance.now(),result=shortestGraphRoutes(files,links,'n0','n'+(count-1),'forward');
      if(!result.routes.length)throw Error('Unreachable benchmark destination');
      if(i>=3)pathTimes.push(performance.now()-t);
     }
     const row={records:count,links:links.length,path:stats(pathTimes)};
     if(count<=1200){
      data=freshProfile('Atlas benchmark');data.files=files;data.links=links;ensureStudio();
      activeSpace().graphLayout='atlas';activeSpace().atlasCamera={x:460,y:350,scale:.9};
      network.space=null;network.signature='';network.focus=null;network.search='';render();
      await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const svg=document.querySelector('.knowledge-svg'),times=[],labels=[];
      for(let i=0;i<14;i++){
       const t=performance.now();network.orientation=homeOrientation(atlasHomeAngle+i*.02);paintSpatialGraph(svg,true);
       const t1=performance.now();placeNetworkLabels();const t2=performance.now();
       if(i>=2){times.push(t1-t);labels.push(t2-t1);}
       await new Promise(requestAnimationFrame);
      }
      const start=performance.now();paintSpatialGraph(svg);
      const finished=performance.now();placeNetworkLabels();
      row.releaseMs=+(performance.now()-start).toFixed(1);row.releaseGeometryMs=+(finished-start).toFixed(1);
      Object.assign(row,{orbitUpdate:stats(times),labelPlacement:stats(labels),svgNodes:svg.querySelectorAll('*').length});
     }
     rows.push(row);
    }
    return rows;
   }finally{data=original;network.space=null;network.signature='';render();}
  });
  console.log('GRAPH BENCHMARK '+JSON.stringify(metrics));
  await writeFile(out+'/investigation-benchmark.json',JSON.stringify(metrics,null,2));
 }
 await check('atlas rotates actual records, Flow preserves links, and Freeform retains manual positions',async()=>{
  const layout=async key=>{
    await page.locator('.graph-layouts [data-key="'+key+'"]').click();
    await page.locator('.network-stage[data-layout="'+key+'"]').waitFor();
  };
  await page.locator('.network-stage[data-layout=atlas]').waitFor();
  const ids=await page.locator('.knowledge-node').evaluateAll(nodes=>nodes.map(n=>n.dataset.knowledgeNode).sort());
  const count=await page.locator('.knowledge-edge').count();
  const first=page.locator('.knowledge-node').first(),before=await first.getAttribute('transform');
  await page.getByRole('combobox',{name:'3D view angle'}).selectOption('right');
  assert.notEqual(await first.getAttribute('transform'),before);
  await page.evaluate(()=>{appearance().theme='graphite';render();});
  await page.screenshot({path:out+'/atlas-dark.png'});
  const angle=await page.evaluate(()=>activeSpace().atlasOrientation);
  await layout('flow');
  assert.equal(await page.locator('.flow-columns text').count(),3);
  assert.equal(await page.locator('path.knowledge-edge').count(),count);
  const source=page.locator('.knowledge-file-list [data-network=open]').first();
  await source.click();
  await page.waitForSelector('#space-inspector:not([hidden])');
  assert.ok(await page.locator('.knowledge-edge.related').count()>0);
  const origin=await page.locator('.source-reader h2').innerText();
  const reference=page.locator('.source-reader .reader-reference').first();
  const target=await reference.innerText();await reference.click();
  await page.waitForFunction(name=>document.querySelector('.source-reader h2')?.textContent===name,target);
  await page.locator('[aria-label="Back to previous record"]').click();
  await page.waitForFunction(name=>document.querySelector('.source-reader h2')?.textContent===name,origin);
  await page.screenshot({path:out+'/flow-inspection.png'});
  await page.locator('[aria-label="Close inspector"]').click();
  await layout('freeform');
  await page.locator('[data-network="arrange"]').first().click();
  await page.locator('[data-network="undo-arrange"]').waitFor();
  const manual=await page.evaluate(()=>JSON.stringify(activeSpace().graphPositions));
  await layout('atlas');
  assert.ok(await page.evaluate(q=>network.orientation.every((v,i)=>Math.abs(v-q[i])<1e-10),angle));
  assert.deepEqual(await page.locator('.knowledge-node').evaluateAll(nodes=>nodes.map(n=>n.dataset.knowledgeNode).sort()),ids);
  await page.reload();await page.locator('.network-stage[data-layout=atlas]').waitFor();
  assert.ok(await page.evaluate(q=>network.orientation.every((v,i)=>Math.abs(v-q[i])<1e-10),angle));
  assert.equal(await page.evaluate(()=>JSON.stringify(activeSpace().graphPositions)),manual);
  await page.evaluate(()=>{appearance().theme='porcelain';render()});
  await page.screenshot({path:out+'/atlas-light.png'});
 });
 await check('vertical drags, roll and record pulls move the visible geometry and keep real links attached',async()=>{
  const angle=page.getByRole('combobox',{name:'3D view angle'});
  const svg=page.locator('.knowledge-svg');
  const snapshot=()=>page.evaluate(()=>{
    const svg=document.querySelector('.knowledge-svg'),nodes={},edges={};
    for(const node of svg.querySelectorAll('.knowledge-node')){
      const m=node.transform.baseVal.consolidate().matrix;
      nodes[node.dataset.knowledgeNode]=[m.e,m.f];
    }
    for(const edge of svg.querySelectorAll('.knowledge-edge')){
      const a=edge.getPointAtLength(0),b=edge.getPointAtLength(edge.getTotalLength());
      const {source,target,kind}=edge.dataset;
      if(Math.hypot(a.x-nodes[source][0],a.y-nodes[source][1])>.15||Math.hypot(b.x-nodes[target][0],b.y-nodes[target][1])>.15)throw Error('Detached '+source+' → '+target);
      edges[[source,target,kind]]=edge.getAttribute('d');
    }
    return {nodes,edges,q:network.orientation,face:svg.querySelector('#solid-file').innerHTML};
  });
  const saveShot=async name=>{await page.screenshot({path:out+'/'+name+'.png'});};
  await angle.selectOption('reset');
  await page.locator('[data-network=fit]').first().click();
  await page.mouse.move(2,2);
  const initial=await snapshot();await saveShot('atlas-front');
  const box=await svg.boundingBox(),x=box.x+box.width*.65,y=box.y+box.height*.54;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+140,{steps:10});await page.mouse.up();
  const pitched=await snapshot();assert.notDeepEqual(pitched.q,initial.q);assert.notDeepEqual(pitched.edges,initial.edges);assert.notEqual(pitched.face,initial.face);
  const ids=Object.keys(initial.nodes);
  assert.ok(ids.some(id=>Math.abs(pitched.nodes[id][1]-initial.nodes[id][1])>25));
  await page.mouse.move(2,2);await saveShot('atlas-tilt');
  await page.keyboard.down('Alt');await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+105,y,{steps:8});await page.mouse.up();await page.keyboard.up('Alt');
  const rolled=await snapshot();assert.notDeepEqual(rolled.q,pitched.q);
  await page.mouse.move(2,2);await saveShot('atlas-roll');
  await page.keyboard.down('Shift');await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+30,y+21,{steps:4});await page.mouse.up();await page.keyboard.up('Shift');
  assert.deepEqual((await snapshot()).q,rolled.q);
  await angle.selectOption('reset');
  await page.locator('.graph-layouts [data-key=spatial]').click();await page.locator('.network-stage[data-layout=spatial]').waitFor();
  await page.mouse.move(2,2);await saveShot('spatial-home');
  await angle.selectOption('up');await angle.selectOption('right');await saveShot('spatial-turned');
  const start=await snapshot();
  const hit=await page.evaluate(()=>{
    const graph=indexedGraph(document.querySelector('.knowledge-svg'));
    for(const [id,el] of [...graph.nodes].sort((a,b)=>graph.edges.get(b[0]).length-graph.edges.get(a[0]).length)){
      const {e:x,f:y}=el.getScreenCTM();
      if(!graph.edges.get(id).length||document.elementFromPoint(x,y)?.closest('.knowledge-node')!==el)continue;
      const weights=neighborWeights(graph,id);
      if([...weights.values()].includes(.42))return {id,x,y,weights:[...weights]};
    }
  });
  assert.ok(hit,'a visible connected record must be draggable');
  await page.mouse.move(hit.x,hit.y);
  const traces=await page.locator('.spatial-signals mpath').evaluateAll(paths=>paths.map(p=>document.querySelector(p.getAttribute('href'))?.classList.contains('related')));
  assert.ok(traces.length>0&&traces.every(Boolean));
  await page.mouse.move(hit.x,hit.y);await page.mouse.down();await page.mouse.move(hit.x+82,hit.y-46,{steps:10});
  await page.waitForFunction(()=>!!network.pull);
  const pulled=await snapshot(),dist=(id,a,b)=>Math.hypot(...a.nodes[id].map((v,i)=>v-b.nodes[id][i]));
  const travel=dist(hit.id,pulled,start);assert.ok(travel>40);
  for(const [id,w] of hit.weights.filter(([,w])=>w===.42)){
    const motion=dist(id,pulled,start);assert.ok(motion>3&&motion<travel);
  }
  for(const id of Object.keys(start.nodes))if(!hit.weights.some(([member])=>member===id))assert.deepEqual(pulled.nodes[id],start.nodes[id]);
  assert.notDeepEqual(pulled.edges,start.edges);await saveShot('spatial-pull');
  await page.mouse.up();await page.waitForFunction(()=>!network.pull);
  assert.deepEqual((await snapshot()).nodes,start.nodes);
  assert.equal(await page.locator('#space-inspector:visible').count(),0);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.mouse.move(1,1);await page.mouse.move(hit.x,hit.y);
  await page.waitForFunction(()=>matchMedia('(prefers-reduced-motion: reduce)').matches&&document.querySelectorAll('.spatial-signals mpath').length===0);
  await page.mouse.down();await page.mouse.move(hit.x+28,hit.y-16,{steps:3});await page.mouse.up();
  assert.equal(await page.evaluate(()=>network.pull),null);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.reload();await page.locator('.network-stage[data-layout=spatial]').waitFor();
  const restored=await snapshot();
  assert.ok(restored.q.every((v,i)=>Math.abs(v-start.q[i])<1e-10));
  await page.locator('.graph-layouts [data-key=atlas]').click();await page.locator('.network-stage[data-layout=atlas]').waitFor();
 });
 await check('all six graph designs keep the same records, investigation and keyboard targets, and Orbit remembers its center',async()=>{
  const layouts=page.locator('.graph-layouts button'),pane=page.locator('#investigation-pane');
  assert.equal(await layouts.count(),6);
  await page.locator('.invest-entry').click();
  const ids=async()=>page.locator('.knowledge-node').evaluateAll(ns=>ns.map(n=>n.dataset.knowledgeNode).sort());
  const original=await ids(),edges=await page.locator('.knowledge-edge').count();
  for(const name of ['spatial','clusters','orbit','flow','freeform','atlas']){
    await page.locator('.graph-layouts [data-key='+name+']').click();
    await page.locator('.network-stage[data-layout='+name+']').waitFor();
    assert.deepEqual(await ids(),original);assert.equal(await page.locator('.knowledge-edge').count(),edges);
    assert.ok(await page.locator('.invest-link').count()>0);
    assert.equal(await page.locator('.knowledge-node[tabindex="0"]').count(),1);
  }
  await pane.locator('[data-invest=close]').click();
  await page.locator('.graph-layouts [data-key=orbit]').click();
  const target=await page.locator('.atlas-record:not(.orbit-center)').first().getAttribute('data-knowledge-node');
  await page.locator('.knowledge-file-list [data-network=open][data-key="'+target+'"]').click();
  await page.locator('[data-network=orbit-root]').click();
  await page.waitForFunction(id=>network.orbit.root===id,target);
  await page.reload();await page.locator('.network-stage[data-layout=orbit]').waitFor();
  assert.equal(await page.locator('.orbit-center').getAttribute('data-knowledge-node'),target);
  await page.setViewportSize({width:390,height:844});
  for(const name of ['spatial','clusters','orbit','flow','freeform','atlas']){
    const control=page.locator('.graph-layouts [data-key='+name+']');await control.click();
    await page.locator('.network-stage[data-layout='+name+']').waitFor();
    const box=await control.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=391);
  }
  await page.setViewportSize({width:1440,height:1000});
 });
 await check('Investigate explains a live route, restores the query after reload and detects a missing endpoint',async()=>{
  const baseline=await page.evaluate(()=>structuredClone(data));
  try{
   const pane=page.locator('#investigation-pane'),entry=page.locator('.invest-entry');
   await page.locator('#knowledge-query').fill('Project brief');
   await entry.click();await pane.waitFor();
   assert.ok(await page.locator('.invest-link').count()>=1);
   assert.equal(await pane.locator('.invest-steps li').count(),await page.locator('.invest-link').count()+1);
   await page.evaluate(()=>{appearance().theme='graphite';render();});
   await pane.locator('[data-invest=frame]').click();
   await page.screenshot({path:out+'/investigation-path.png'});
   const to=await page.locator('#invest-to').inputValue();
   await pane.locator('[data-invest=save]').click();
   await page.locator('#save-investigation [name=name]').fill('Trace interview workflow');
   await page.locator('#save-investigation button[type=submit]').click();
   await pane.locator('[data-invest=restore]').waitFor();
   await pane.locator('[data-invest=close]').click();
   assert.equal(await page.locator('#knowledge-query').inputValue(),'Project brief');
   await page.reload();await entry.click();await pane.locator('summary').click();
   await pane.locator('[data-invest=restore]').click();assert.equal(await page.locator('#invest-to').inputValue(),to);
   await page.evaluate(async id=>{(activeSpace().hidden??=[]).push(id);await save();render();},to);
   assert.match(await pane.innerText(),/endpoint is unavailable/);
   assert.equal(await page.locator('.invest-link').count(),0);
   assert.equal(await page.locator('#invest-to option:checked').innerText(),'Record unavailable');
  }finally{await page.evaluate(async base=>{data=base;network.search='';await save();render();},baseline);}
 });
 await check('region membership lights actual records and stays aligned while rotating or framing on mobile',async()=>{
  const pane=page.locator('#investigation-pane'),entry=page.locator('.invest-entry');
  await entry.click();await pane.locator('[data-invest=tab][data-key=regions]').click();
  const rows=await pane.locator('.region-members li').count();
  assert.ok(rows>0);assert.equal(await page.locator('.invest-hit').count(),rows);
  const shape=page.locator('.invest-territory'),before=await shape.getAttribute('d');
  await page.getByRole('combobox',{name:'3D view angle'}).selectOption('right');assert.notEqual(await shape.getAttribute('d'),before);
  await page.screenshot({path:out+'/investigation-region.png'});
  await page.setViewportSize({width:390,height:844});await pane.locator('[data-invest=frame]').click();
  assert.equal(await pane.isVisible(),false);assert.ok(await page.locator('.invest-hit').count()>0);
  await entry.click();await pane.waitFor();assert.equal(await pane.locator('.region-members li').count(),rows);
  await pane.locator('[data-invest=close]').click();await page.setViewportSize({width:1440,height:1000});
 });
 await check('a selected repeated passage opens its reviewed version beside the changed source and respects hidden sources',async()=>{
  const baseline=await page.evaluate(()=>structuredClone(data));
  try{
   const exact='the interviews were held on site';
   await page.evaluate(quote=>{
    const source={id:'fixture-interview',name:'Field interview transcript',text:'North cohort: '+quote+'.\nSouth cohort: '+quote+'.'};
    data.files.push(source);activeSpace().members.push(source.id);
    const draft=appendResearchNode({name:'Interview method draft',text:'Investigate where the interviews took place.',state:'pending',sources:[source.id]});
    render();reviewResearchDraft(draft);
   },exact);
   const form=page.locator('#claim-review');
   await form.locator('[name=source]').selectOption('fixture-interview');
   await page.evaluate(exact=>{
    const pre=document.querySelector('#claim-source-preview'),offset=pre.textContent.lastIndexOf(exact),range=document.createRange();
    range.setStart(pre.firstChild,offset);range.setEnd(pre.firstChild,offset+exact.length);
    getSelection().removeAllRanges();getSelection().addRange(range);pre.dispatchEvent(new Event('pointerup'));
   },exact);
   await form.locator('#claim-use-selection').click();
   await form.locator('[name=claim]').fill('The south cohort was interviewed on site.');
   await form.locator('[name=decision]').selectOption('supported');await form.locator('[type=submit]').click();
   await form.waitFor({state:'hidden'});
   const claim=await page.evaluate(()=>data.files.find(f=>f.research?.statement==='The south cohort was interviewed on site.').id);
   const pane=page.locator('#investigation-pane');
   await page.locator('.invest-entry').click();await pane.locator('[data-invest=tab][data-key=evidence]').click();
   await page.locator('#invest-claim').selectOption(claim);
   assert.match(await pane.innerText(),/Eligible research source/);
   await page.evaluate(()=>{data.files.find(f=>f.id==='fixture-interview').text='Correction: the south cohort met by phone.';render();});
   assert.match(await pane.innerText(),/Needs a source check/);await pane.locator('[data-invest=compare]').click();
   assert.equal(await page.locator('.quote-window mark').count(),1);
   assert.match(await page.locator('.quote-comparison').innerText(),/absent/);
   assert.match(await page.locator('.quote-window mark').evaluate(mark=>mark.previousSibling.textContent),/South cohort/);
   await page.screenshot({path:out+'/investigation-evidence.png'});
   await page.locator('#dialog [data-act=close]').click();
   await pane.locator('[data-invest=tab][data-key=impact]').click();
   await pane.locator('#invest-source').selectOption('fixture-interview');
   assert.match(await pane.innerText(),/1 needs a source check/);
   await pane.locator('[data-invest=affected]').click();
   await pane.locator('[data-invest=review]').click();
   assert.equal(await form.locator('[name=claim]').inputValue(),'The south cohort was interviewed on site.');
   assert.equal(await form.locator('[name=decision]').inputValue(),'');
   assert.match(await form.locator('#claim-source-preview').innerText(),/by phone/);
   await form.locator('[name=decision]').selectOption('unresolved');
   await form.locator('[type=submit]').click();await form.waitFor({state:'hidden'});
   assert.equal(await page.evaluate(id=>data.files.find(f=>f.id===id).research.state,claim),'superseded');
   assert.ok(await page.evaluate(()=>data.files.some(f=>f.research?.state==='unresolved'&&f.research.statement==='The south cohort was interviewed on site.')));
   await page.evaluate(()=>{(activeSpace().hidden??=[]).push('fixture-interview');render();});
   assert.match(await pane.innerText(),/Source unavailable/);assert.equal(await pane.locator('[data-invest=compare]').count(),0);
  }finally{await page.evaluate(async base=>{data=base;await save();render();},baseline);}
 });
 await check('failed investigation saves can be retried and named investigations stay in their own workspace',async()=>{
  const base=await page.evaluate(()=>structuredClone(data));
  try{
   const pane=page.locator('#investigation-pane');await page.locator('.invest-entry').click();
   await pane.locator('[data-invest=save]').click();await page.locator('#save-investigation input').fill('Source trace');
   await page.evaluate(()=>{const prior=save;save=async()=>{save=prior;throw Error('Fixture write failure');};});
   await page.locator('#save-investigation [type=submit]').click();
   assert.match(await page.locator('#save-investigation [role=status]').innerText(),/Save failed/);
   assert.equal(await page.evaluate(()=>activeSpace().graphInvestigations?.length||0),0);
   await page.locator('#save-investigation [type=submit]').click();
   await pane.locator('[data-invest=restore]').waitFor();
   const previous=await page.evaluate(()=>{
    const id=activeSpace().id;data.spaces.push({id:'second-vault',name:'Another workspace',members:[],positions:{},groups:[]});
    data.activeSpace='second-vault';render();return id;
   });
   assert.equal(await pane.count(),0);await page.locator('.invest-entry').click();
   assert.equal(await pane.locator('[data-invest=restore]').count(),0);
   await page.evaluate(id=>{data.activeSpace=id;render();},previous);
   assert.equal(await pane.locator('[data-invest=restore]').count(),1);
  }finally{await page.evaluate(async value=>{data=value;await save();render();},base);}
 });
 await check('a large endpoint picker searches the entire workspace while keeping the option list bounded',async()=>{
  const source=await page.evaluate(()=>structuredClone(data));
  try{
   await page.evaluate(()=>{
    const ids=[];
    for(let i=0;i<150;i++){
     const id='transcript-'+i;ids.push(id);data.files.push({id,name:'Transcript '+i,text:'Interview.'});
    }
    activeSpace().members.push(...ids);data.links.push({from:ids[0],to:ids.at(-1)});render();
   });
   await page.locator('.invest-entry').click();
   assert.ok(await page.locator('#invest-to option').count()<=62);
   await page.locator('[data-invest-filter=invest-from]').fill('Transcript 0');
   await page.locator('#invest-from').selectOption('transcript-0');
   await page.locator('[data-invest-filter=invest-to]').fill('Transcript 149');
   await page.locator('#invest-to').selectOption('transcript-149');
   assert.equal(await page.locator('.invest-link').count(),1);
   await page.locator('.invest-steps [data-key=transcript-149]').click();
   await page.locator('#space-inspector [data-invest=end]').click();
   assert.equal(await page.locator('#invest-to').inputValue(),'transcript-149');
  }finally{await page.evaluate(async base=>{data=base;await save();render();},source);}
 });
 await check('a search result can recover its neighbors, including on a narrow Atlas',async()=>{
  const note='Project brief';
  await page.locator('#knowledge-query').fill(note);
  await page.locator('.knowledge-file-list [data-network=open]').filter({hasText:note}).first().click();
  await page.locator('#space-inspector [data-network=focus]').click();
  await page.waitForFunction(()=>network.focus && network.search==='');
  assert.ok(await page.locator('.knowledge-edge').count()>0);
  await page.locator('.depth-control [data-network=all]').click();
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-network=fit]').click();
  await page.getByRole('combobox',{name:'3D view angle'}).selectOption('left');
  await page.locator('.graph-layouts [data-key=flow]').click();
  await page.locator('.network-stage[data-layout=flow]').waitFor();
  await page.locator('.graph-layouts [data-key=atlas]').click();
  await page.locator('.network-stage[data-layout=atlas]').waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.doesNotMatch(await page.locator('#toast').textContent(),/Cannot set properties/);
  await page.screenshot({path:out+'/atlas-mobile.png'});
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('[data-network=fit]').click();
 });
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
 await check('600 actual workspace notes preserve links through zoom and keyboard selection',async()=>{
  const observed=await page.evaluate(async()=>{
   const original=data,previous={...network.camera};
   try{
    data=freshProfile('Field study');
    for(let i=0;i<600;i++)data.files.push({id:'field-'+i,name:'Interview '+i,text:i?'Field observation. [[Interview '+(i-1)+']]':''});
    network.signature='';network.space=null;render();
    const svg=document.querySelector('.knowledge-svg'),count=svg.querySelectorAll('[data-knowledge-node]').length;
    const bounds=svg.getBoundingClientRect();
    svg.dispatchEvent(new WheelEvent('wheel',{clientX:bounds.left+100,clientY:bounds.top+100,deltaY:-24,cancelable:true,bubbles:true}));
    await new Promise(r=>setTimeout(r,220));
    const middle=svg.querySelector('[data-knowledge-node="field-300"]');
    middle.focus();highlightNetwork();
    return {count,related:svg.querySelectorAll('.knowledge-edge.related').length,neighbors:svg.querySelectorAll('.graph-neighbor').length};
   }finally{
    data=original;network.hovered=null;network.space=null;network.signature='';network.camera=previous;render();await save();
   }
  });
  assert.equal(observed.count,600);assert.equal(observed.related,2);assert.equal(observed.neighbors,3);
 });
 await check('zoom retains the graph depth layer and turning depth off clears it',async()=>{
  const result=await page.evaluate(()=>{
   const pref=appearance(),old=pref.depth;
   try{
    pref.depth='subtle';updateNeuralField();
    const layer=document.querySelector('.neural-field');
    applyNetworkCamera();updateNeuralField();
    const same=layer!==null&&layer===document.querySelector('.neural-field');
    pref.depth='off';updateNeuralField();
    return {same,cleared:!document.querySelector('.neural-field')};
   }finally{pref.depth=old;updateNeuralField()}
  });
  assert.ok(result.same);assert.ok(result.cleared);
 });
 await check('graph keyboard activation and hover use the visible links',async()=>{
  const node=page.locator('.knowledge-node').first();
  assert.equal(await page.locator('.knowledge-node[tabindex="0"]').count(),1);
  await node.focus();await node.press('End');
  assert.equal(await page.locator('.knowledge-node').last().evaluate(el=>el===document.activeElement),true);
  await page.keyboard.press('Home');await page.keyboard.press('Space');
  await page.waitForFunction(()=>studio.inspector);
  const result=await page.evaluate(()=>{
   const original=studioLinks;
   let calls=0;
   studioLinks=function(){calls++;return original()};
   try{
    const svg=document.querySelector('.knowledge-svg'),edge=svg.querySelector('.knowledge-edge');
    const selected=[...studio.selected][0];
    const start=Array.from(svg.querySelectorAll('[data-knowledge-node]')).find(el=>el.dataset.knowledgeNode!==selected);
    const before=Array.from(svg.querySelectorAll('.knowledge-edge.related'));
    start.dispatchEvent(new PointerEvent('pointerover',{bubbles:true}));
    return {calls,related:before.every(e=>e.classList.contains('related')),neighbors:svg.querySelectorAll('.graph-neighbor').length};
   }finally{studioLinks=original;studio.inspector=false;studio.selected.clear();network.hovered=null;render()}
  });
  assert.equal(result.calls,0);assert.ok(result.related);assert.ok(result.neighbors>=1);
 });
 await check('setup retries a failed save on the same step and the reopened guide can close',async()=>{
  await page.locator('[data-navigate]').click();
  await page.locator('[data-setup-reopen]').click();
  assert.equal(await page.locator('.setup-wizard h1').evaluate(el=>el===document.activeElement),true);
  await page.evaluate(()=>{window.setupSave=save;save=async()=>{throw Error('Storage unavailable during setup')}});
  await page.locator('[data-setup-next]').click();
  assert.match(await page.locator('#setup-error').textContent(),/Storage unavailable/);
  assert.equal(await page.evaluate(()=>setupStep),0);
  await page.evaluate(()=>{save=window.setupSave});
  await page.locator('[data-setup-next]').click();await page.locator('#setup-name').waitFor();
  assert.equal(await page.evaluate(()=>appearance().onboarding.step),1);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.setup-wizard').count(),0);
  assert.equal(await page.locator('[data-navigate]').evaluate(el=>el===document.activeElement),true);
 });
 await check('Community loads the native feed and refreshes after browser sign-in and local sign-out',async()=>{
  const ctx=await browser.newContext();let signed=false;
  const session=()=>({signedIn:signed,scope:signed?'a'.repeat(64):'guest',moderator:false,
   signIn:'https://groundplanes.com/signin?app=agenetic',signOut:'https://groundplanes.com/signin?signout=1'});
  await ctx.addInitScript(()=>{window.ageneticDesktop={
   getConnection:async()=>({error:'offline'}),
   onCommunityChanged(fn){window.communityChanged=fn;},
   async openCommunity(){window.browserOpens=(window.browserOpens||0)+1;},
   async signOutCommunity(){window.logoutRequested=true;}
  };});
  await ctx.route('**/api/session',r=>r.fulfill({json:session()}));
  await ctx.route('**/api/community?*',r=>r.fulfill({json:{...session(),posts:[],nextCursor:null}}));
  const fresh=await ctx.newPage();
  fresh.on('pageerror',error=>errors.push(error.message));
  try{
   await fresh.goto(page.url());
   await fresh.waitForFunction(()=>typeof db!=='undefined'&&db&&typeof data!=='undefined'&&data&&identitySession.verified);
   await fresh.locator('.setup-wizard').waitFor();
   await fresh.evaluate(async()=>{closeSetup();page='Community';render();await loadCommunity();});
   await fresh.getByRole('link',{name:'Sign in to post'}).click();
   assert.equal(await fresh.evaluate(()=>window.browserOpens),1);
   signed=true;await fresh.evaluate(()=>window.communityChanged());
   await fresh.getByRole('link',{name:'Sign out',exact:true}).click();
   assert.equal(await fresh.evaluate(()=>window.logoutRequested),true);
   signed=false;await fresh.evaluate(()=>window.communityChanged());
   await fresh.getByRole('link',{name:'Sign in to post'}).waitFor();
  }finally{await ctx.close();}
 });
 await check('new desktop setup can finish at phone width and stays complete on restart',async()=>{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.addInitScript(()=>{window.ageneticDesktop={getConnection:async()=>({error:'Local model offline'}),onCommunityChanged(){}}});
  const fresh=await context.newPage();
  fresh.on('pageerror',error=>errors.push(error.message));
  try{
   await fresh.goto(page.url());
   const wizard=fresh.locator('.setup-wizard'),next=wizard.locator('[data-setup-next]');
   await next.waitFor();await fresh.keyboard.press('Escape');assert.ok(await wizard.isVisible());
   await next.click();await wizard.locator('#setup-name').fill('River');
   assert.ok(await wizard.evaluate(w=>w.scrollWidth<=w.clientWidth+1));
   await next.click();
   const theme=wizard.locator('[data-setup-theme="graphite"]');
   await theme.click();await fresh.waitForFunction(()=>document.activeElement.dataset.setupTheme==='graphite');
   await next.click();await next.click();assert.match(await wizard.locator('#setup-error').textContent(),/backups/);
   await wizard.locator('#setup-storage').check();await next.click();await next.click();
   await wizard.locator('#setup-privacy').check();await next.click();
   await wizard.waitFor({state:'detached'});await fresh.reload();await fresh.waitForSelector('.knowledge-node');
   assert.equal(await fresh.locator('.setup-wizard').count(),0);
   assert.equal(await fresh.evaluate(()=>profileIdentity().name),'River');
   assert.equal(await fresh.evaluate(()=>appearance().theme),'graphite');
  }finally{await context.close()}
 });
 await check('team billing recovers from a service error and switching panels stays local',async()=>{
  const context=await browser.newContext(),teamPage=await context.newPage();
  const first='1',second='2',teams=[{id:first,name:'Field team'},{id:second,name:'Lab team'}];
  let retry=true,statusCalls=0;
  try{
   await context.addInitScript(()=>{sessionStorage.setItem('agenetic.business.session',JSON.stringify({
    access_token:'fixture',expires_at:4102444800,user:{email:'reviewer@example.test'}
   }))});
   await teamPage.route('**/functions/v1/agenetic-business',async route=>{
    const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, content-type, apikey'};
    if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
    const {action,team_id}=route.request().postDataJSON();
    if(action==='teams')return route.fulfill({json:{result:teams},headers});
    assert.equal(action,'status');statusCalls++;
    if(retry){retry=false;return route.fulfill({status:503,json:{error:'Service busy'},headers})}
    const team=teams.find(t=>t.id===team_id);
    return route.fulfill({json:{result:{team:{...team,status:'unpaid',seats:0,has_subscription:false},
     role:'owner',members:[],invites:[],projects:[],keys:[]}},headers});
   });
   await teamPage.goto(new URL('/team.html',page.url()).href);
   await teamPage.getByRole('button',{name:'Try again'}).click();
   await teamPage.getByRole('heading',{name:'Field team'}).waitFor();
   const before=statusCalls;
   await teamPage.locator('[data-view="projects"]').click();
   await teamPage.getByRole('heading',{name:'Shared research projects'}).waitFor();
   assert.equal(statusCalls,before);
   await teamPage.locator('[data-team]').selectOption(second);
   await teamPage.getByRole('heading',{name:'Lab team'}).waitFor();
   assert.equal(await teamPage.locator('[data-view="team"]').getAttribute('aria-pressed'),'true');
  }finally{await context.close()}
 });
 await check('a failed restore preserves both existing IndexedDB stores',async()=>{
  const outcome=await page.evaluate(async()=>{
   const id='restore-check',marker='keeps existing work';
   const tx=db.transaction(['state','blobs'],'readwrite');
   tx.objectStore('blobs').put(new Blob([marker]),id);
   await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=reject});
   const before=await req(db.transaction('state').objectStore('state').get('profiles'));
   const put=IDBObjectStore.prototype.put;let message;
   IDBObjectStore.prototype.put=function(){throw Error('Simulated local write failure')};
   try{await restoreVault({state:[['current',{}]],blobs:[]})}catch(e){message=e.message}
   finally{IDBObjectStore.prototype.put=put}
   const after=await req(db.transaction('state').objectStore('state').get('profiles'));
   const file=await req(db.transaction('blobs').objectStore('blobs').get(id));
   return {message,intact:JSON.stringify(before)===JSON.stringify(after),bytes:await file.text()};
  });
  assert.match(outcome.message,/Simulated/);assert.ok(outcome.intact);assert.equal(outcome.bytes,'keeps existing work');
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
 await check('resizing a panned workspace preserves the world point at its center',async()=>{
  const center=()=>page.evaluate(()=>{
   const svg=document.querySelector('.knowledge-svg'),c=network.camera,box=svg.getBoundingClientRect();
   return [(box.width/2-c.x)/c.scale,(box.height/2-c.y)/c.scale,c.scale];
  });
  await page.mouse.move(1,1);
  const before=await center();
  await page.setViewportSize({width:840,height:790});
  await page.waitForFunction(()=>{
   const box=document.querySelector('.knowledge-svg').getBoundingClientRect(),size=activeSpace().graphViewport;
   return size?.width===box.width&&size?.height===box.height;
  });
  const after=await center();
  assert.equal(before[2],after[2]);assert.ok(Math.hypot(before[0]-after[0],before[1]-after[1])<1);
  await page.setViewportSize({width:1440,height:1000});
 });
 await page.waitForFunction(()=>!document.querySelector('#toast').textContent);
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
