'use strict';
let companionOpen=false;
function companionState(){return data.companion??={enabled:true,suggestions:[],dismissed:[]}}
function researchFingerprint(){return 'v2|'+data.files.map(f=>f.id+':'+(f.text||'')).join('|')}
function researchSuggestions(){const c=companionState();if(!c.enabled)return [];const fingerprint=researchFingerprint();if(c.fingerprint===fingerprint)return c.suggestions;c.fingerprint=fingerprint;const existing=c.suggestions.filter(s=>s.mode==='AI'||s.mode==='Source review');const suggestions=[];const names=new Set(data.files.map(f=>fileNameKey(f.name)));for(const f of data.files.filter(f=>f.text&&!f.research&&!f.originTrace)){
 const question=f.text.split(/\n|(?<=[.!?])\s+/).find(s=>/open question\s*:|\?|^\s*(?:TODO|to verify|needs evidence)\s*:/i.test(s));
 if(question)suggestions.push({id:'question:'+f.id,title:'Resolve: '+f.name,reason:question.slice(0,220),sources:[f.id],mode:'Local check'});
 const missing=[...f.text.matchAll(/\[\[([^\]\n]+)\]\]/g)].map(m=>m[1].split('|')[0].split('#')[0]).filter(n=>!['note title','title'].includes(n.toLowerCase())&&!names.has(fileNameKey(n)));
 if(missing.length)suggestions.push({id:'reference:'+f.id,title:'Check references in '+f.name,reason:'Missing note: '+missing.slice(0,3).join(', '),sources:[f.id],mode:'Local check'});
 }c.suggestions=[...existing,...suggestions.slice(0,6)].filter(s=>!c.dismissed.includes(s.id));return c.suggestions}
function companionPanel(){const c=companionState(),items=researchSuggestions();return '<section class="research-companion" aria-label="Research companion"><div class="research-heading"><div><span class="section-kicker">RESEARCH COMPANION</span><h2>A useful next step.</h2></div><button data-research-close aria-label="Close research companion">'+lineIcon('close')+'</button></div><p>Only this profile. Suggestions need your approval.</p><div class="companion-status">'+(token?'Local runner session available':'AI model not connected')+' · '+data.files.filter(f=>f.text).length+' readable notes</div><div class="actions"><button data-research-ai>Analyze notes</button><button data-research-summary>Summarize</button><button data-research-cycle>Research cycle</button><button data-mcp-open>MCP tools</button></div><div class="research-suggestions">'+(items.length?items.map(s=>'<article><small>'+esc(s.mode)+'</small><h3>'+esc(s.title)+'</h3><p>'+esc(s.reason)+'</p><div class="source-buttons">'+s.sources.map(id=>{const f=data.files.find(f=>f.id===id);return f?'<button data-research-source="'+esc(id)+'">'+lineIcon('note')+esc(f.name)+'</button>':''}).join('')+'</div><div class="suggestion-actions"><button data-research-accept="'+esc(s.id)+'">Add task</button><button data-research-dismiss="'+esc(s.id)+'">Dismiss</button></div></article>').join(''):'<div class="research-empty">'+(data.files.some(f=>f.text)?'No open questions or missing references found by local checks. Use your model for a deeper review.':'Add a research note to get source-based suggestions. No generic tasks are generated.')+'</div>')+'</div><button data-research-disable>Disable for this profile</button></section>'}
function researchControls(){document.querySelectorAll('.research-launch,.telemetry-launch,.research-companion').forEach(e=>e.remove());if(page==='Community')return;const host=document.querySelector('.network-footer')||document.querySelector('.space-footer>div')||document.querySelector('.return-to-space');if(!host)return;const c=companionState();researchSuggestions();host.insertAdjacentHTML('beforeend',(c.enabled?'<button class="research-launch" data-research-toggle>'+lineIcon('agent')+'Companion'+(c.suggestions.length?' <span>'+c.suggestions.length+'</span>':'')+'</button>':'')+'<button class="telemetry-launch" data-telemetry>'+lineIcon('graph')+'Run trace</button>');if(companionOpen&&c.enabled)$('#content').insertAdjacentHTML('beforeend',companionPanel());updateNeuralField()}
const researchRender=render;render=function(){researchRender();researchControls()};
const researchAppearance=appearancePanel;appearancePanel=function(){return researchAppearance().replace('<p class="appearance-footnote">','<label class="grid-choice"><input type="checkbox" id="companion-enabled" '+(companionState().enabled?'checked':'')+'> Research companion</label><p class="appearance-footnote">')};
document.addEventListener('change',async e=>{if(e.target.id==='companion-enabled'){companionState().enabled=e.target.checked;companionOpen=false;await save();render()}});
function researchInputSources(ids, focus) {
 const files = new Map(workspaceSourceFiles().map(file=>[file.id,file]));
 const encoder = new TextEncoder();
 return selectedResearchSources(ids).slice(0,4).flatMap((id,index)=>{
  const quote = selectContext({files:[id]},focus).quotes?.[0];
  if (!quote) return [];
  const excerpt = new TextDecoder().decode(encoder.encode(quote.excerpt).slice(0,900)).replace(/\uFFFD$/,'');
  return [{id, label:'S'+(index+1), name:files.get(id).name, excerpt}];
 });
}
function sourcePrompt(sources) {
 return sources.map(source=>'['+source.label+'] '+source.name.slice(0,120)+'\n'+source.excerpt).join('\n\n');
}
function parseResearchQuestions(output, sources) {
 const byLabel = new Map(sources.map(source=>[source.label,source]));
 const seen = new Set();
 const questions = [];
 for (const line of output.split('\n')) {
  const match = /^\s*(?:[-*]\s*)?\[?(S[1-4])\]?\s*\|\s*(.{12,155}\?)\s*$/.exec(line);
  if (!match || !byLabel.has(match[1]) || seen.has(match[2].toLowerCase())) continue;
  questions.push({source:byLabel.get(match[1]), question:match[2]});
  seen.add(match[2].toLowerCase());
  if (questions.length===3) break;
 }
 return questions;
}
function researchSourceDefaults() {
 const focus = new Set(typeof studio==='undefined'?[]:studio.selected);
 const step = data.tasks.find(task=>focus.has(task.id));
 if (step) {
  const agent = data.agents.find(agent=>agent.id===step.agent);
  if (agent) return agentSourceScope(agent,step,false).files;
 }
 if (!focus.size) return [];
 const focusedAgent = data.agents.find(agent=>focus.has(agent.id));
 if (focusedAgent) return agentSourceScope(focusedAgent,null,!!focusedAgent.followLinkedNotes).files;
 return agentSourceScope({files:[...focus]},null,true).files;
}
function researchModelPicker() {
 return '<label class="field">Local model<select name="model" required><option value="">Select a registered model</option>'+
  data.models.map(model=>'<option value="'+esc(model.id)+'">'+esc(model.name)+'</option>').join('')+'</select></label>';
}
function summaryDialog() {
 const steps = spaceNodes().filter(node=>node.kind==='task');
 const selectedStep = steps.find(step=>studio.selected.has(step.id));
 modal('Summarize connected research', '<p>Turn selected sections into a short draft. Use the focus to say who it’s for or what you want the reader to understand.</p>'+
  '<form id="research-summary"><label class="field">Focus<textarea name="focus" maxlength="320" placeholder="Explain what the studies found for a reader new to the topic.">'+esc(selectedStep?.description?.slice(0,320)||'')+'</textarea></label>'+
  researchModelPicker()+sourcePicker('Select up to four sources',selectedResearchSources(researchSourceDefaults()).slice(0,4))+
  '<label class="field">Link draft to a workflow step<select name="step"><option value="">Keep as a standalone draft</option>'+
  steps.map(step=>'<option value="'+esc(step.id)+'" '+(step.id===selectedStep?.id?'selected':'')+'>'+esc(step.name)+'</option>').join('')+'</select></label>'+
  '<div class="actions"><button type="submit" class="primary" '+(!token?'disabled':'')+'>Write summary draft</button></div>'+
  (!token?'<p>Connect a local model from Local models first.</p>':'')+
  '<p data-summary-status role="status"></p></form><div id="summary-result"></div>');
}
async function runResearchSummary(form) {
 if (running) return toast('Wait for the active task.');
 const values = new FormData(form), ids = selectedResearchSources(values.getAll('sources'));
 const model = data.models.find(model=>model.id===values.get('model'));
 const status = form.querySelector('[data-summary-status]'), resultHost = $('#summary-result');
 if (!token || !model || !ids.length || ids.length>4) {
  status.textContent='Connect a model and select one to four readable sources.';
  return;
 }
 const focus = values.get('focus').trim() || 'Summarize the main findings, differences, and any important uncertainty.';
 const sources = researchInputSources(ids,focus);
 if (!sources.length) {status.textContent='No readable excerpts remain in this workspace.';return;}
 const record = data, workspace = activeSpace().id;
 const step = spaceNodes().find(node=>node.kind==='task'&&node.id===values.get('step'));
 const submit = form.querySelector('[type=submit]');
 running=true;
 submit.disabled=true;
 resultHost.replaceChildren();
 status.textContent='Writing a short draft on this device…';
 try {
  const response = await localModelRequest({
   model:model.name, model_id:model.companionId||null, model_source:model.source||null,
   role:'Plain-language editor', profile:'balanced',
   task:focus,
   instructions:'Write two short paragraphs for a real reader. Start with the clearest finding. Use ordinary words, concrete details, and short sentences. Name important disagreements or gaps. Cite the provided source tags, such as [S1], beside claims. Use only supplied excerpts. No introductory filler, invented facts, medical recommendations, markdown headings, or list of references.',
   context:sourcePrompt(sources)
  },{label:'Summary · '+focus.slice(0,100),sources:sources.map(source=>source.id)});
  if (!form.isConnected || data!==record || activeSpace().id!==workspace) return;
  const tags = new Map(sources.map(source=>[source.label,source.name]));
  const cited = [...response.output.matchAll(/\[(S\d+)\]/g)].map(match=>match[1]);
  const valid = cited.length>0 && cited.every(label=>tags.has(label));
  status.textContent=valid?'Draft ready. Review the claims and citations before reusing them.':
   'Draft ready. The draft omitted source tags or used unknown tags. Check each claim against the excerpts.';
  const text=response.output.replace(/\[(S\d+)\]/g,(match,label)=>tags.has(label)?'['+tags.get(label)+']':match);
  resultHost.innerHTML='<pre class="output" data-summary-text></pre><details><summary>Excerpts used</summary>'+
   sources.map(source=>'<p><strong>'+esc(source.name)+'</strong></p><blockquote>'+esc(source.excerpt)+'</blockquote>').join('')+
   '</details><button type="button" data-save-summary>Save to graph for claim review</button>';
  resultHost.querySelector('[data-summary-text]').textContent=text;
  const saveButton = resultHost.querySelector('[data-save-summary]');
  saveButton.onclick = async () => {
   if (data!==record || activeSpace().id!==workspace) return;
   if (selectedResearchSources(sources.map(source=>source.id)).length!==sources.length ||
     sources.some(source=>!data.files.find(file=>file.id===source.id)?.text.includes(source.excerpt))) {
    status.textContent='A source changed. Write the draft again from the current text.';
    return;
   }
   saveButton.disabled=true;
   let draft;
   if (await change(()=>{draft=appendResearchNode({name:'Summary · '+focus,text,state:'pending',
    sources:sources.map(source=>source.id),step:step?.id||'',agent:step?.agent||'',stepTask:step?.description||''});})) {
    reviewResearchDraft(draft);
   } else saveButton.disabled=false;
  };
 } catch(error) {status.textContent=error.message;}
 finally {running=false;submit.disabled=false;}
}
function analysisDialog(){if(!companionState().enabled)return;modal('Analyze your research','<p>Select the notes and local model to use. Excerpts stay on this device and are sent only to your local runner.</p><form id="research-analysis"><label class="field">Local model<select name="model" required><option value="">Select a registered model</option>'+data.models.map(m=>'<option value="'+esc(m.id)+'">'+esc(m.name)+'</option>').join('')+'</select></label>' +sourcePicker('Research sources')+ '<small>Up to four relevant excerpts are sent per review. Suggestions are proposals, not verified findings.</small><button type="submit" class="primary" '+(!token?'disabled':'')+'>Analyze locally</button>'+(!token?'<button type="button" data-command="runtime">Connect a local model first</button>':'')+'<p id="research-analysis-status" role="status"></p></form>')}
function tracePanel(){const events=data.runTraces||[];modal('Real execution, inspectable.','<p>Measured locally at the request boundary. Configured links do not mean a model has run. No token or GPU metrics are estimated.</p><div class="trace-list">'+(!events.length?'<div class="research-empty">No recorded model runs in this profile. Connect a local runner and execute a task to see its sources, model, elapsed time, and outcome.</div>':events.slice(0,20).map(t=>'<article><small>'+esc(new Date(t.started).toLocaleString())+' · '+esc(t.status)+'</small><h3>'+esc(t.label)+'</h3><p>'+esc(t.model)+' · '+(t.duration==null?'Request in progress':(t.duration/1000).toFixed(2)+' s')+' · '+t.contextChars+' context characters'+(t.outputChars!=null?' · '+t.outputChars+' output characters':'')+'</p><p>Sources: '+esc(t.sources.map(id=>data.files.find(f=>f.id===id)?.name||'Removed source').join(', ')||'No source excerpts')+'</p>'+(t.error?'<p>'+esc(t.error)+'</p>':'')+(t.status==='completed'&&t.output?'<button data-trace-handoff="'+t.id+'">Save draft for claim review</button>':'')+'</article>').join(''))+'</div>')}
async function localModelRequest(payload,meta={}){
 const profileId=data.profile.id,record=data;const trace={id:crypto.randomUUID(),started:Date.now(),label:meta.label||payload.task.slice(0,100),model:payload.model,agent:meta.agent||'',sources:meta.sources||data.files.filter(f=>payload.context.includes('File: '+f.name+'\n')).map(f=>f.id),contextChars:payload.context.length,status:'running'};
 record.runTraces??=[];record.runTraces.unshift(trace);record.runTraces=record.runTraces.slice(0,100);const start=performance.now();
 const active=document.querySelector('[data-knowledge-node="'+CSS.escape(meta.agent||'')+'"]');active?.classList.add('executing');
 try{
  const request = {...payload, request_id: trace.id};
  meta.onRequest?.(trace.id);
  let result;
  if (typeof window !== 'undefined' && window.ageneticDesktop?.modelRequest) {
   result = await companionCall('/run', request);
  } else {
   const response = await fetch((typeof companionBase === 'string' ? companionBase : 'http://127.0.0.1:7871') + '/run', {
    method: 'POST',
    headers: {Authorization: 'Bearer ' + token, 'Content-Type': 'application/json'},
    body: JSON.stringify(request),
    signal: meta.signal ? AbortSignal.any([meta.signal, AbortSignal.timeout(310000)]) : AbortSignal.timeout(310000)
   });
   result = await response.json();
   if (!response.ok) throw new Error(result.error || 'The local runner failed.');
  }
  if(typeof result.output!=='string')throw new Error(result.error||'The runner returned no usable output.');trace.status='completed';trace.output=result.output;trace.outputChars=result.output.length;return result;
 }catch(e){trace.status=e.message==='Run stopped.'?'stopped':'failed';trace.error=e instanceof TypeError?'Local runner unreachable.':e.message;throw e}finally{trace.duration=Math.round(performance.now()-start);active?.classList.remove('executing');if(data.profile.id===profileId)await save();else await profileStore(record)}
}
document.addEventListener('submit', async event=>{
 const form=event.target;
 if (!['research-analysis','research-summary'].includes(form.id)) return;
 event.preventDefault();
 if (form.id==='research-summary') return runResearchSummary(form);
 if (running) return toast('Wait for the active task.');
 const values = new FormData(form);
 const ids = selectedResearchSources(values.getAll('sources'));
 const model = data.models.find(item=>item.id===values.get('model'));
 const status = $('#research-analysis-status');
 if (!ids.length || ids.length>4 || !model || !token) {
  status.textContent='Connect a model and select one to four readable sources.';
  return;
 }
 const state=companionState(), record=data, workspace=activeSpace().id;
 const sources=researchInputSources(ids,'open questions limitations disagreement gaps evidence');
 if (!sources.length) {status.textContent='No readable excerpts remain in this workspace.';return;}
 const submit=form.querySelector('[type=submit]');
 running=true;
 submit.disabled=true;
 status.textContent='Looking for useful follow-up questions…';
 try {
  const response=await localModelRequest({model:model.name,model_id:model.companionId||null,
   model_source:model.source||null,role:'Research companion',profile:'balanced',
   instructions:'Give one or two short follow-up questions, each on its own line. Use the exact format S1 | What evidence would answer this? Use only the provided source tags. No JSON, markdown, greetings, answers, or extra lines.',
   task:'Suggest useful next research questions from these excerpts.',context:sourcePrompt(sources)
  },{label:'Research companion analysis',sources:sources.map(source=>source.id)});
  if (data!==record || activeSpace().id!==workspace || !state.enabled || !form.isConnected) return;
  const questions=parseResearchQuestions(response.output,sources);
  const suggestions=questions.length
   ? questions.map(({source,question})=>({id:crypto.randomUUID(),title:question.slice(0,120),reason:'Suggested follow-up for '+source.name,sources:[source.id],mode:'AI',trace:record.runTraces[0]?.id}))
   : sources.map(source=>({id:crypto.randomUUID(),title:('Review '+source.name).slice(0,120),
    reason:'Read this excerpt and note one finding, one limitation, and any detail that needs a source check.',
    sources:[source.id],mode:'Source review',trace:record.runTraces[0]?.id}));
  const previous=state.suggestions;
  state.suggestions=[...suggestions,...previous.filter(item=>item.mode!=='AI'&&item.mode!=='Source review')];
  try {await save();}
  catch(error) {state.suggestions=previous;throw error;}
  $('#dialog').close();
  companionOpen=true;
  render();
  if (!questions.length) toast('The model returned no complete follow-up questions. Added source review suggestions instead.');
 } catch(error) {status.textContent=error.message;}
 finally {running=false;submit.disabled=false;}
});

document.addEventListener('click',e=>{const b=e.target.closest('[data-research-toggle],[data-research-close],[data-research-disable],[data-research-ai],[data-research-summary],[data-research-accept],[data-research-dismiss],[data-research-source],[data-telemetry],[data-trace-handoff]');if(!b)return;(async()=>{const c=companionState();if(b.hasAttribute('data-research-toggle')){companionOpen=!companionOpen;return render()}if(b.hasAttribute('data-research-close')){companionOpen=false;return render()}if(b.hasAttribute('data-research-disable')){c.enabled=false;companionOpen=false;await save();return render()}if(b.hasAttribute('data-research-ai'))return analysisDialog();if(b.hasAttribute('data-research-summary'))return summaryDialog();if(b.dataset.researchSource)return openNetworkNode(b.dataset.researchSource);if(b.hasAttribute('data-telemetry'))return tracePanel();if(b.dataset.traceHandoff){const t=data.runTraces.find(t=>t.id===b.dataset.traceHandoff);modal('Choose the receiving agent','<p>Save the output as a draft linked to the selected agent. Its claims are unavailable as sources until reviewed.</p><form id="trace-handoff" data-trace="'+t.id+'"><label class="field">Receiving agent<select name="agent" required>'+data.agents.map(a=>'<option value="'+a.id+'">'+esc(a.name)+'</option>').join('')+'</select></label><button class="primary" '+(!data.agents.length?'disabled':'')+'>Save and connect result</button></form>');return}const id=b.dataset.researchAccept||b.dataset.researchDismiss,s=c.suggestions.find(s=>s.id===id);if(!s)return;if(b.dataset.researchAccept){const id=crypto.randomUUID();data.tasks.push({id,name:s.title,description:s.reason,agent:'',status:'planned',sources:s.sources,proposalMode:s.mode});for(const source of s.sources)data.links.push({from:source,to:id});activeSpace().members.push(id);log(s.title,'Research suggestion accepted','Graph')}c.dismissed.push(s.id);c.suggestions=c.suggestions.filter(x=>x.id!==s.id);await save();render()})().catch(report)});
document.addEventListener('submit', async event=>{
 if (event.target.id!=='trace-handoff') return;
 event.preventDefault();
 try {
  const trace=data.runTraces.find(item=>item.id===event.target.dataset.trace);
  const agent=data.agents.find(item=>item.id===new FormData(event.target).get('agent'));
  if (!trace?.output || !agent) return;
  const allowed=selectedResearchSources(trace.sources);
  if (trace.sources.length && !allowed.length) return toast('Open the workspace with the original sources first.');
  let draft;
  if (await change(()=>{draft=appendResearchNode({name:'Draft · '+trace.label,text:trace.output,
   state:'pending',sources:allowed,agent:agent.id});})) reviewResearchDraft(draft);
 } catch (error) {report(error);}
});
// Background structure follows actual node positions and graph connectivity.
function updateNeuralField(){document.querySelectorAll('.depth-field').forEach(el=>el.remove());if(!inNetwork()||appearance().depth==='off')return;const world=document.querySelector('.network-world');if(!world)return;world.querySelector('.neural-field')?.remove();const {nodes,links}=networkData();if(!nodes.length)return;const layer=document.createElementNS('http://www.w3.org/2000/svg','g');layer.setAttribute('class','neural-field');layer.setAttribute('aria-hidden','true');for(const n of nodes){const p=network.positions.get(n.id);if(!p)continue;const count=links.filter(l=>l.from===n.id||l.to===n.id).length;if(count<5)continue;const ring=document.createElementNS(layer.namespaceURI,'circle');ring.setAttribute('cx',p[0]);ring.setAttribute('cy',p[1]);ring.setAttribute('r',40+Math.min(12,count)*8);ring.setAttribute('class','neural-region');layer.append(ring)}world.prepend(layer)}
const neuralCamera=applyNetworkCamera;applyNetworkCamera=function(){neuralCamera();updateNeuralField()};
const neuralDepth=syncDepth;syncDepth=function(){document.documentElement.dataset.depth=appearance().depth||'subtle';updateNeuralField()};
