// Run from the repository root with Playwright and Chromium installed.
// This captures a new browser profile containing only the built-in Fieldwork example.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {extname,resolve,sep} from 'node:path';

const {chromium}=createRequire(import.meta.url)('playwright');
const root=resolve('public');
const output=resolve('docs/screenshots/gallery');
const selected=new Set(process.argv.slice(2));
const wants=name=>!selected.size||selected.has(name);
const html=JSON.parse((await readFile('app/workspace-html.ts','utf8')).replace(/^export default\s*/,'').trim().replace(/;$/,''));
const contentTypes={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.webp':'image/webp'};
await mkdir(output,{recursive:true});

const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1,reducedMotion:'reduce',colorScheme:'light'});
  const errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin!=='http://127.0.0.1')return route.abort();
    if(url.pathname==='/api/session')return route.fulfill({json:{scope:'guest',signedIn:false}});
    if(url.pathname==='/')return route.fulfill({contentType:'text/html; charset=utf-8',body:html});
    const file=resolve(root,'.'+decodeURIComponent(url.pathname));
    if(!file.startsWith(root+sep))return route.abort();
    try{return await route.fulfill({contentType:contentTypes[extname(file)]||'application/octet-stream',body:await readFile(file)});}
    catch{return route.fulfill({status:404,body:''});}
  });
  await page.goto('http://127.0.0.1/');
  if(wants('source-workspace')){
    await page.locator('[data-command=spaces]').click();
    await page.locator('#new-space [name=name]').fill('Pier exchange');
    await page.locator('#new-space [name=starter]').selectOption('network');
    await page.locator('#new-space button').click();
    await page.locator('.reading-page h1').filter({hasText:'Change window'}).waitFor();
    const picker=page.waitForEvent('filechooser');
    await page.locator('.reading-bar [data-reading=import]').click();
    await (await picker).setFiles([
      {name:'Evening handoff.md',mimeType:'text/plain',buffer:Buffer.from('Pier exchange · Evening shift\n\nWest-side subscribers reported short bursts of loss just after 19:00. Replication had started four minutes earlier on the same uplink.\n\nThe first egress drops appeared at 19:04. Input errors stayed flat while the queue filled. Compare that minute with the preceding samples.\n\nNext shift\nRepeat the measurements after moving the replication window. Keep the interface, sample interval and subscriber paths the same.')},
      {name:'Uplink counters.csv',mimeType:'text/csv',buffer:Buffer.from('Time,Queue %,TX drops,RX errors\n19:00,26,0,0\n19:01,31,0,0\n19:02,33,0,0\n19:03,38,0,0\n19:04,94,182,0\n19:05,97,261,0\n19:06,89,138,0\n19:07,61,25,0')}
    ]);
    await page.locator('#reading-beside').selectOption({label:'Uplink counters.csv'});
    await page.waitForFunction(()=>document.querySelectorAll('.reading-page').length===2);
    await page.evaluate(()=>document.fonts.ready);
    const capture=await (await page.context().newCDPSession(page)).send('Page.captureScreenshot',{format:'webp',quality:90});
    await writeFile(resolve(output,'source-workspace.webp'),Buffer.from(capture.data,'base64'));
    assert.equal(await page.locator('.reading-table tbody tr').count(),8);
    await page.locator('[data-reading=finding]').click();
    await page.locator('#reading-note [name=name]').fill('First egress drops');
    await page.locator('#reading-note textarea').fill('The first drops were recorded at 19:04.');
    await page.locator('#reading-note button').click();
    await page.waitForFunction(()=>document.querySelector('.reading-page h1')?.textContent==='First egress drops');
    assert.equal(await page.locator('.reading-page').first().locator('.reading-related button').count(),2);
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.locator('#reading-primary').isVisible());
    await page.setViewportSize({width:1440,height:1000});
    await page.locator('[data-command=spaces]').click();
    await page.locator('[data-command=switch-space][data-key=home]').click();
    await page.locator('.reading-page h1').filter({hasText:'Start here'}).waitFor();
  }
  await page.locator('.reading-bar [data-reading=map]').click();
  await page.locator('.knowledge-node').first().waitFor();
  assert.equal(await page.evaluate(()=>data.profile.demo),true);
  const cdp=await page.context().newCDPSession(page);
  async function settle(){
    await page.mouse.move(1438,999);
    await page.evaluate(async()=>{
      await document.fonts.ready;
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    });
  }
  async function screenshot(name){
    await settle();
    await page.waitForFunction(()=>!document.querySelector('#toast')?.textContent,null,{timeout:10000});
    // Capture the viewport directly in WebP. No resampling, cropping or overlays.
    const image=await cdp.send('Page.captureScreenshot',{format:'webp',quality:88,fromSurface:true,captureBeyondViewport:false});
    await writeFile(resolve(output,name+'.webp'),Buffer.from(image.data,'base64'));
    console.log(name+'.webp');
  }
  async function layout(name){
    if(await page.locator('.network-stage').getAttribute('data-layout')!==name){
      const control=page.locator('[data-network=layout][data-key="'+name+'"]');
      if(!await control.isVisible()){
        const toggle=page.locator('summary,button[aria-haspopup]').filter({hasText:/layout|graph design/i});
        if(await toggle.count())await toggle.first().click();
      }
      await control.click({timeout:6000});
    }
    await page.locator('.network-stage[data-layout="'+name+'"]').waitFor();
    await page.locator('[data-network=fit]').first().click();
    await settle();
    assert.ok(await page.locator('.knowledge-node').count()>5);
  }
  async function theme(name){await page.evaluate(value=>{appearance().theme=value;render();},name);await settle();}
  await theme('porcelain');
  if(wants('signal-field')){await theme('linen');await layout('signal');await screenshot('signal-field');}
  if(wants('atlas')||wants('atlas-graphite')){
    await theme('linen');await layout('atlas');
    if(wants('atlas'))await screenshot('atlas');
    if(wants('atlas-graphite')){
      await theme('graphite');await screenshot('atlas-graphite');await theme('porcelain');
    }
  }
  for(const name of ['flow','orbit','clusters','freeform']){
    if(!wants(name))continue;
    await layout(name);
    if(name==='clusters'){
      const gap=await page.evaluate(()=>{
        const heading=document.querySelector('.layout-hint').getBoundingClientRect();
        const top=Math.min(...Array.from(document.querySelectorAll('.cluster-guides text'),el=>el.getBoundingClientRect().top));
        return Math.max(0,Math.ceil(heading.bottom+18-top));
      });
      if(gap){
        const svg=await page.locator('.knowledge-svg').boundingBox(),x=svg.x+svg.width*.92,y=svg.y+svg.height*.55;
        await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+gap,{steps:5});await page.mouse.up();
      }
    }
    if(name==='freeform'){
      await page.locator('[data-network=arrange]').first().click();
      await page.locator('[data-network=undo-arrange]').first().waitFor();
      await page.locator('[data-network=fit]').first().click();
    }
    await screenshot(name);
  }
  if(wants('paths')){
    await layout('flow');
    await page.locator('.invest-entry').click();
    await page.locator('#invest-from').selectOption({label:'Project brief'});
    await page.locator('#invest-to').selectOption({label:'Compare interview findings'});
    assert.ok(await page.locator('.invest-link').count()>=2);
    await page.locator('[data-invest=frame]').click();await screenshot('paths');
    await page.locator('[data-invest=close]').click();
  }
  if(wants('research')||wants('sources')||wants('review')){
    await page.evaluate(async()=>{
      await bootDesk();
      const sources=data.files.filter(f=>f.name.startsWith('Interview · '));
      const j=deskState();j.sources=sources.map(f=>f.id);j.goal='How do teams trace a decision back to its source?';
      const p=projectModule.ensureProject(j);
      p.audience='Research team';p.deliverable='Field interview brief';p.completion='Each finding links to an exact interview passage.';
      // Queue two source-scoped tasks through the journal. No inference is run.
      await deskEnqueue('Compare how the three interviewees use source notes.',j.sources);
      const mira=sources.find(f=>f.name==='Interview · Mira');
      await deskEnqueue('Identify the source behind Mira’s decision-making requirement.',[mira.id]);
      p.tab='plan';page='Research';render();
    });
    if(wants('research')){
      assert.equal(await page.locator('.desk-job').count(),2);
      await screenshot('research');
    }
    await page.locator('.project-tabs [data-project-tab=sources]').click();
    await page.locator('.project-source blockquote').first().waitFor();
    if(wants('sources'))await screenshot('sources');
    if(wants('review')){
      const claim='Mira needs to trace decisions back to the source document.';
      const quote='She needs to see which document supports a decision.';
      const source=await page.evaluate(()=>{
        const source=data.files.find(f=>f.name==='Interview · Mira');
        const draft=appendResearchNode({name:'Field interview findings',text:'Mira describes a gap between the decision and the document that supports it.',state:'pending',sources:[source.id]});
        reviewResearchDraft(draft);return source.id;
      });
      const form=page.locator('#claim-review');
      await form.locator('[name=claim]').fill(claim);
      await form.locator('[name=source]').selectOption(source);
      await form.locator('[name=decision]').selectOption('supported');
      await form.locator('[name=quote]').fill(quote);
      await form.locator('[name=rationale]').fill('Mira states this requirement directly in the interview.');
      await form.locator('[type=submit]').click();
      await form.waitFor({state:'hidden'});
      await page.evaluate(()=>{page='Graph';render();});
      await layout('atlas');
      await page.locator('.invest-entry').click();
      await page.locator('[data-invest=tab][data-key=evidence]').click();
      const id=await page.evaluate(statement=>data.files.find(f=>f.research?.statement===statement).id,claim);
      await page.locator('#invest-claim').selectOption(id);
      await page.locator('[data-invest=compare]').click();
      await page.locator('.quote-comparison').waitFor();
      assert.equal(await page.locator('.quote-window mark').count(),2);
      await screenshot('review');
    }
  }
  if(wants('cut-room')||wants('palette')){
    await page.evaluate(()=>{page='Graph';render();showSpaces()});
    const form=page.locator('#new-space');
    await form.locator('[name=name]').fill('North Pier / Picture lock');
    await form.locator('[name=starter]').selectOption('edit');
    await form.locator('button').click();
    await page.locator('.reading-bar [data-reading=map]').click();await layout('flow');await theme('linen');
    assert.equal(await page.locator('.knowledge-node').count(),7);
    if(wants('cut-room')){
      const picker=page.waitForEvent('filechooser');
      await page.locator('[data-command=import]').click();
      await (await picker).setFiles({name:'Pier interview.srt',mimeType:'text/plain',buffer:Buffer.from('1\n00:00:03,125 --> 00:00:07,480\nThe tide was already coming in.\n\n2\n00:00:09,200 --> 00:00:12,760\nWe kept the camera on the water.\n\n3\n00:00:15,040 --> 00:00:19,520\nThat was the last boat of the morning.')});
      await page.locator('[data-network=open]').filter({hasText:'Pier interview.srt'}).click();
      assert.equal(await page.locator('.caption-sheet li').count(),3);
      await screenshot('cut-room');
      await page.locator('[aria-label="Close inspector"]').first().click();
    }
    if(wants('palette')){
      await theme('cobalt');
      await page.locator('[data-network=appearance]').first().click();
      await page.locator('[data-edit-palette]').click();
      await page.locator('#palette-editor').waitFor();
      await screenshot('palette');
      await page.locator('#palette-editor [name=name]').fill('North Pier');
      await page.locator('#palette-editor button.primary').click();
      await page.locator('#palette-editor').waitFor({state:'hidden'});
      const downloaded=page.waitForEvent('download');
      await page.locator('[data-theme-export]').click();
      await page.locator('[data-confirm]').click();
      const path=await (await downloaded).path();
      await theme('linen');
      await page.locator('#appearance-import').setInputFiles(path);
      await page.locator('[data-package-install]').click();
      await page.locator('[data-confirm]').click();
      await page.waitForFunction(()=>appearance().theme==='community'&&theme().name==='North Pier');
      await page.reload();await page.locator('.reading-bar [data-reading=map]').click();
      await page.waitForFunction(()=>document.querySelector('.knowledge-node')&&theme().name==='North Pier');
    }
  }
  assert.deepEqual(errors,[]);
}finally{await browser.close();}
