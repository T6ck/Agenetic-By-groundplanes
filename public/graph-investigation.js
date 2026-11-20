'use strict';

const investigationStates=new WeakMap();
const traceRules={forward:'Follow link direction',either:'Either direction',citations:'Declared sources only'};

function traceEdgeKey(edge){
  return JSON.stringify([edge.from,edge.to,edge.kind]);
}

// Search the workspace once, retain equal-length predecessors, then iteratively
// reconstruct only enough routes to display and detect an additional alternative.
function shortestGraphRoutes(nodes,links,from,to,rule='forward',limit=3){
  const rows=new Map(nodes.map(n=>[n.id,n]));
  if(!rows.has(from)||!rows.has(to)||!Object.hasOwn(traceRules,rule))return {routes:[],more:false};
  if(from===to)return {routes:[{ids:[from],edges:[]}],more:false};
  const adjacency=new Map(),seenEdges=new Set();
  function connect(a,b,edge){
    if(!adjacency.has(a))adjacency.set(a,[]);
    adjacency.get(a).push({next:b,edge});
  }
  for(const edge of links){
    if(edge.from===edge.to||!rows.has(edge.from)||!rows.has(edge.to))continue;
    if(rule==='citations'&&(edge.kind!=='reference'||!rows.get(edge.to).research?.sources?.includes(edge.from)))continue;
    const key=traceEdgeKey(edge);
    if(seenEdges.has(key))continue;
    seenEdges.add(key);connect(edge.from,edge.to,edge);
    if(rule==='either')connect(edge.to,edge.from,edge);
  }
  const distance=new Map([[from,0]]),parents=new Map(),queue=[from];
  for(let i=0;i<queue.length;i++){
    const id=queue[i],depth=distance.get(id);
    if(distance.has(to)&&depth>=distance.get(to))break;
    for(const {next,edge} of adjacency.get(id)||[]){
      if(!distance.has(next)){distance.set(next,depth+1);parents.set(next,[]);queue.push(next);}
      if(distance.get(next)===depth+1)parents.get(next).push({id,edge});
    }
  }
  if(!distance.has(to))return {routes:[],more:false};
  for(const group of parents.values())if(group.length>1)group.sort((a,b)=>a.id.localeCompare(b.id,'en')||a.edge.kind.localeCompare(b.edge.kind,'en'));
  const routes=[],stack=[{id:to,index:0}],edges=[];
  while(stack.length&&routes.length<=limit){
    const frame=stack.at(-1);
    if(frame.id===from)routes.push({ids:stack.map(f=>f.id).reverse(),edges:[...edges].reverse()});
    const parent=parents.get(frame.id)?.[frame.index++];
    if(parent){stack.push({id:parent.id,index:0});edges.push(parent.edge);}
    else {stack.pop();edges.pop();}
  }
  return {routes:routes.slice(0,limit),more:routes.length>limit};
}

function locateReviewedQuote(text,exact,anchor){
  if(typeof text!=='string'||typeof exact!=='string'||!exact)return {offset:-1,count:0};
  let count=0,first=-1,matched=-1,anchored=0;
  for(let i=text.indexOf(exact);i!==-1;i=text.indexOf(exact,i+1)){
    if(first===-1)first=i;
    count++;
    if(anchor&&typeof anchor.prefix==='string'&&typeof anchor.suffix==='string'&&
       text.slice(Math.max(0,i-anchor.prefix.length),i)===anchor.prefix&&
       text.slice(i+exact.length,i+exact.length+anchor.suffix.length)===anchor.suffix){
      matched=i;anchored++;
    }
  }
  return {offset:anchored===1?matched:count===1?first:-1,count};
}
function reviewAnchor(text,exact,offset){
  if(!Number.isInteger(offset)||offset<0||text.slice(offset,offset+exact.length)!==exact)return undefined;
  return {prefix:text.slice(Math.max(0,offset-40),offset),suffix:text.slice(offset+exact.length,offset+exact.length+40)};
}
function quoteComparison(quote,source,revisions,linked){
  if(!source)return {status:'Source unavailable in this workspace'};
  const revision=quote.revision&&revisions.find(r=>r.id===quote.revision&&r.source===source.id);
  const current=locateReviewedQuote(source.text,quote.excerpt,quote.anchor);
  const saved=revision?locateReviewedQuote(revision.text,quote.excerpt,quote.anchor):null;
  let status='Matches reviewed version';
  if(!linked)status='Source link removed';
  else if(!quote.excerpt)status='No passage recorded';
  else if(quote.revision&&!revision)status='Reviewed version unavailable';
  else if(revision&&source.text!==revision.text)status='Source changed since review';
  else if(!current.count)status='Passage missing from current source';
  else if(current.offset<0)status='Passage appears more than once';
  else if(!revision)status='Matches current text · no saved version';
  return {status,revision,current,saved};
}

// Quoted-source dependencies survive a disconnected graph edge. A removed
// link is itself a reason to find the claims a researcher may need to revisit.
function downstreamClaims(nodes,sourceId){
  const byId=new Map(nodes.map(n=>[n.id,n]));
  if(!byId.has(sourceId))return {rows:[],ids:new Set()};
  const consumers=new Map();
  for(const record of nodes){
    if(!['supported','evidence','superseded'].includes(record.research?.state))continue;
    for(const id of new Set((record.research.quotes||[]).map(q=>q.id))){
      if(!consumers.has(id))consumers.set(id,[]);
      consumers.get(id).push(record);
    }
  }
  const seen=new Set([sourceId]),queue=[{id:sourceId,depth:0}],rows=[];
  for(let i=0;i<queue.length;i++){
    const {id,depth}=queue[i];
    for(const record of consumers.get(id)||[]){
      if(seen.has(record.id))continue;
      seen.add(record.id);queue.push({id:record.id,depth:depth+1});
      if(record.research.state!=='superseded')rows.push({record,depth:depth+1});
    }
  }
  // Keep historical intermediates only when they lead to a current dependent.
  const ids=new Set([sourceId]),pending=rows.map(row=>row.record.id);
  for(let i=0;i<pending.length;i++){
    const id=pending[i];
    if(ids.has(id))continue;
    ids.add(id);
    for(const quote of byId.get(id).research.quotes||[])if(seen.has(quote.id)&&!ids.has(quote.id))pending.push(quote.id);
  }
  return {rows,ids};
}
function investigationDefault(nodes,links,start){
  const agent=nodes.find(n=>n.kind==='agent'&&n.files?.length&&nodes.some(t=>t.kind==='task'&&t.agent===n.id));
  const from=start||nodes.find(n=>agent?.files.includes(n.id))?.id||nodes[0]?.id||'';
  const task=agent&&nodes.find(n=>n.kind==='task'&&n.agent===agent.id);
  const next=links.find(l=>l.from===from&&l.to!==from);
  return {tab:'paths',from,to:(!start&&task?.id)||next?.to||'',rule:'forward',index:0,claim:null,region:null,source:null,sheet:true};
}
function investigationModel(state,nodes,links){
  const byId=new Map(nodes.map(n=>[n.id,n])),ids=new Set(),edges=new Set();
  const model={byId,ids,edges};
  if(state.tab==='paths'){
    const result=shortestGraphRoutes(nodes,links,state.from,state.to,state.rule);
    model.routes=result.routes;model.more=result.more;
    state.index=Math.min(state.index,Math.max(0,result.routes.length-1));
    model.route=result.routes[state.index];
    for(const id of model.route?.ids||[])ids.add(id);
    for(const edge of model.route?.edges||[])edges.add(traceEdgeKey(edge));
  }else if(state.tab==='evidence'){
    model.claims=nodes.filter(n=>n.kind==='file'&&n.research);
    if(state.claim==null)state.claim=model.claims.find(n=>n.research.quotes?.length)?.id||model.claims[0]?.id||'';
    model.claim=model.claims.find(n=>n.id===state.claim);
    if(model.claim){
      const research=model.claim.research;
      const declared=new Set(research.sources||[]);
      ids.add(model.claim.id);
      for(const link of links){
        if(link.to===model.claim.id&&link.kind==='reference'&&declared.has(link.from)){
          ids.add(link.from);edges.add(traceEdgeKey(link));
        }
      }
      model.quotes=(research.quotes||[]).map(q=>{
        const source=byId.get(q.id);
        const linked=edges.has(traceEdgeKey({from:q.id,to:model.claim.id,kind:'reference'}));
        return {...quoteComparison(q,source,activeSpace().sourceRevisions||[],linked),quote:q,source};
      });
    }
  }else if(state.tab==='impact'){
    model.sources=nodes.filter(n=>n.kind==='file');
    if(state.source==null){
      const cited=new Set(nodes.flatMap(n=>(n.research?.quotes||[]).map(q=>q.id)));
      state.source=model.sources.find(n=>cited.has(n.id))?.id||model.sources[0]?.id||'';
    }
    model.origin=byId.get(state.source);
    const impact=downstreamClaims(nodes,state.source);
    model.affected=impact.rows.map(row=>({...row,ready:researchSourceReady(row.record,byId)}))
      .sort((a,b)=>Number(a.ready)-Number(b.ready)||a.depth-b.depth||a.record.name.localeCompare(b.record.name));
    for(const id of impact.ids)ids.add(id);
    for(const link of links)if(ids.has(link.from)&&ids.has(link.to)&&link.kind==='reference'&&byId.get(link.to)?.research?.quotes?.some(q=>q.id===link.from))edges.add(traceEdgeKey(link));
  }else if(state.tab==='regions'){
    model.regions=['atlas','clusters'].includes(network.layout)?network.regions:atlasCloud(nodes,links).regions;
    if(state.region==null)state.region=model.regions[0]?.id||'';
    model.region=model.regions.find(r=>r.id===state.region);
    for(const id of model.region?.ids||[])ids.add(id);
    for(const link of links)if(ids.has(link.from)&&ids.has(link.to))edges.add(traceEdgeKey(link));
  }
  return model;
}
const investigationPickers=new WeakMap();
function investigationOptions(items,value,placeholder,query=''){
  const selected=items.find(i=>i.id===value),needle=query.trim().toLocaleLowerCase();
  let visible=items;
  if(items.length>120){
    visible=[];
    for(const item of items){
      if(item.name.toLocaleLowerCase().includes(needle))visible.push(item);
      if(visible.length===60)break;
    }
    if(selected&&!visible.includes(selected))visible.unshift(selected);
  }
  return '<option value="">'+esc(placeholder)+'</option>'+
    (value&&!selected?'<option selected value="'+esc(value)+'">Record unavailable</option>':'')+
    visible.map(i=>'<option value="'+esc(i.id)+'" '+(i.id===value?'selected':'')+'>'+esc(i.name)+'</option>').join('');
}
function investigationSelect(id,label,items,value,placeholder){
  const searchable=items.length>120;
  if(searchable){
    const state=investigationStates.get(activeSpace());
    if(!investigationPickers.has(state))investigationPickers.set(state,new Map());
    investigationPickers.get(state).set(id,{items,placeholder});
  }
  return '<div class="invest-field"><label for="'+id+'">'+esc(label)+'</label>'+
    (searchable?'<input type="search" data-invest-filter="'+id+'" aria-label="Filter '+esc(label)+' choices" placeholder="Find by name">':'')+
    '<select id="'+id+'">'+investigationOptions(items,value,placeholder)+'</select></div>';
}
function investigationButton(action,label,id='',attrs=''){
  return '<button type="button" data-invest="'+action+'" data-key="'+esc(id)+'" '+attrs+'>'+esc(label)+'</button>';
}
function pathPanel(state,model){
  const items=[...model.byId.values()].sort((a,b)=>a.name.localeCompare(b.name));
  const controls=investigationSelect('invest-from','From',items,state.from,'Choose a record')+
    investigationSelect('invest-to','To',items,state.to,'Choose a record')+
    investigationSelect('invest-rule','Connections',Object.entries(traceRules).map(([id,name])=>({id,name})),state.rule,'Choose a rule');
  if(!model.route){
    const status=!state.from||!state.to?'Choose two records to find a path.':
      !model.byId.has(state.from)||!model.byId.has(state.to)?'A saved endpoint is unavailable in this workspace.':'No path under this rule. Try another direction or choose a different record.';
    return controls+'<p class="invest-empty" role="status">'+esc(status)+'</p>';
  }
  const route=model.route,n=route.edges.length;
  const steps=route.ids.map((id,i)=>{
    const node=model.byId.get(id),previous=model.byId.get(route.ids[i-1]);
    const relation=i?relationshipLabel(route.edges[i-1],previous,node):'';
    return '<li>'+(i?'<small class="invest-relation">'+esc(relation)+'</small>':'')+
      investigationButton('record',node.name,id,'class="invest-record '+node.kind+'"')+'</li>';
  }).join('');
  const alternatives=model.routes.length>1?'<div class="invest-pages">'+model.routes.map((_,i)=>
    investigationButton('route',String(i+1),String(i),'aria-label="Show path '+(i+1)+'" aria-pressed="'+(i===state.index)+'"')).join('')+'</div>':'';
  return controls+'<div class="invest-results"><h3>'+n+' '+(n===1?'link':'links')+'</h3>'+alternatives+'</div>'+
    (model.more?'<p class="invest-muted">Showing three equal-length paths.</p>':'')+
    '<ol class="invest-steps">'+steps+'</ol>';
}
function investigationTime(timestamp){
  if(!Number.isFinite(timestamp))return '';
  const date=new Date(timestamp);
  if(!Number.isFinite(date.getTime()))return '';
  return '<time datetime="'+date.toISOString()+'">'+esc(date.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}))+'</time>';
}
function evidencePanel(state,model){
  const picker=investigationSelect('invest-claim','Research record',model.claims,state.claim,'Choose a research record');
  if(!model.claim)return picker+'<p class="invest-empty">Reviewed claims and research drafts in this workspace appear here.</p>';
  const record=model.claim,r=record.research;
  const ready=researchSourceReady(record,model.byId);
  const reviewed=investigationTime(r.decision?.time);
  const status=ready?'Eligible research source':['evidence','supported'].includes(r.state)?'Needs a source check':researchStateLabel(record);
  const draft=model.byId.get(r.draft);
  const review=draft?.research?.state==='pending'&&draft.research.workspace===activeSpace().id?investigationButton('review','Review claim again',draft.id):'';
  const quotes=model.quotes.map((q,i)=>'<article class="invest-quote"><small>'+esc(q.status)+'</small><blockquote>'+esc(q.source?q.quote.excerpt||'':'')+'</blockquote>'+
    (q.source?investigationButton('compare','Inspect passage',String(i)):'')+'</article>').join('');
  const sources=[...model.ids].filter(id=>id!==record.id);
  return picker+'<div class="invest-results"><h3>'+esc(status)+'</h3></div>'+
    (reviewed?'<p class="invest-muted">Decision recorded '+reviewed+'</p>':'')+
    (r.decision?.rationale?'<p>'+esc(r.decision.rationale)+'</p>':'')+quotes+
    (!quotes?'<p class="invest-muted">No reviewed quotation is recorded.</p>':'')+
    (sources.length?'<h4>Connected sources</h4>'+sources.map(id=>investigationButton('record',model.byId.get(id).name,id,'class="invest-source"')).join(''):'')+
    investigationButton('record','Open research record',record.id)+review+
    (state.backToImpact?investigationButton('tab','Back to source impact','impact'):'');
}
function impactPanel(state,model){
  const picker=investigationSelect('invest-source','Source to check',model.sources,state.source,'Choose a source');
  if(!model.origin)return picker+'<p class="invest-empty">'+(state.source?'The source is unavailable in this workspace.':'Choose a source to trace its citations.')+'</p>';
  if(!model.affected.length)return picker+'<p class="invest-empty">No current evidence records or supported claims cite this source.</p>';
  const stale=model.affected.filter(row=>!row.ready).length;
  return picker+'<div class="invest-results"><h3>'+stale+' need'+(stale===1?'s':'')+' a source check</h3></div>'+
    '<ul class="impact-claims">'+model.affected.map(({record,depth,ready})=>'<li>'+
      '<small>'+esc(depth===1?'Direct quotation':depth+' citation steps')+' · '+(ready?'Eligible source':'Needs review')+'</small>'+
      investigationButton('affected',record.research.statement||record.name,record.id)+'</li>').join('')+'</ul>';
}
function regionsPanel(state,model){
  const picker=investigationSelect('invest-region','Region',model.regions.map(r=>({id:r.id,name:r.name+' ('+r.ids.length+')'})),state.region,'Choose a region');
  if(!model.region)return picker+'<p class="invest-empty">Choose a region to inspect its records.</p>';
  const region=model.region,internal=model.edges.size;
  return picker+'<div class="invest-results"><h3>'+region.ids.length+' records</h3></div><p class="invest-muted">'+internal+' internal links · '+region.boundary+' links to other regions</p>'+
    '<ul class="region-members">'+region.ids.map(id=>'<li>'+investigationButton('record',model.byId.get(id).name,id,'class="invest-source"')+'</li>').join('')+'</ul>';
}
function renderInvestigation(state,nodes,links){
  investigationPickers.delete(state);
  const model=investigationModel(state,nodes,links);
  state.model=model;
  const panel=document.getElementById('investigation-pane');
  panel.dataset.sheet=String(state.sheet);
  const tabs=[['paths','Paths'],['evidence','Evidence'],['impact','Impact'],['regions','Regions']];
  const saved=activeSpace().graphInvestigations||[];
  panel.innerHTML='<div class="invest-title"><h2>Investigate</h2>'+investigationButton('close','Close')+'</div>'+
    '<div class="invest-tabs" role="group" aria-label="Investigation type">'+tabs.map(([id,name])=>investigationButton('tab',name,id,'aria-pressed="'+(state.tab===id)+'"')).join('')+'</div>'+
    '<div class="invest-body">'+(state.tab==='paths'?pathPanel(state,model):state.tab==='regions'?regionsPanel(state,model):state.tab==='impact'?impactPanel(state,model):evidencePanel(state,model))+'</div>'+
    '<div class="invest-actions">'+(model.ids.size?investigationButton('frame','Frame on graph'):'')+
    (model.ids.size?investigationButton('save','Save investigation'):'')+'</div>'+
    (saved.length?'<details class="invest-saved" '+(state.savedOpen?'open':'')+'><summary>Saved investigations ('+saved.length+')</summary>'+
      saved.map(s=>'<div>'+investigationButton('restore',s.name,s.id)+investigationButton('forget','Remove',s.id,'aria-label="Remove saved investigation '+esc(s.name)+'"')+'</div>').join('')+'</details>':'');
  const svg=$('.knowledge-svg');
  svg.classList.toggle('has-investigation',!!model.ids.size);
  const graph=indexedGraph(svg);
  for(const [id,node] of graph.nodes){
    node.classList.toggle('invest-hit',model.ids.has(id));
    node.classList.toggle('invest-endpoint',model.route?.ids[0]===id||model.route?.ids.at(-1)===id);
  }
  svg.querySelector('.invest-territory')?.remove();
  if(model.region&&network.layout==='atlas'){
    const shape=document.createElementNS('http://www.w3.org/2000/svg','path');
    shape.setAttribute('class','invest-territory');shape.setAttribute('aria-hidden','true');
    svg.querySelector('.network-edges').before(shape);
    paintInvestigationTerritory(svg);
  }
  for(const edge of svg.querySelectorAll('.knowledge-edge')){
    const {source:from,target:to,kind}=edge.dataset;
    edge.classList.toggle('invest-link',model.edges.has(traceEdgeKey({from,to,kind})));
  }
}
function quoteWindow(text,exact,location){
  if(!location?.count)return '<p>The exact passage is absent.</p>'+(text&&text.length<=320?'<p class="quote-window">'+esc(text)+'</p>':'');
  if(location.offset<0)return '<p>The passage occurs '+location.count+' times. Its original location is ambiguous.</p>';
  const i=location.offset,after=i+exact.length;
  return '<p class="quote-window">'+(i>120?'…':'')+esc(text.slice(Math.max(0,i-120),i))+'<mark>'+esc(exact)+'</mark>'+esc(text.slice(after,after+120))+(text.length>after+120?'…':'')+'</p>';
}
function inspectPassage(item){
  if(!item?.source)return;
  const {source,quote,revision}=item;
  modal('Inspect passage','<section class="quote-comparison"><h3>'+esc(source.name)+'</h3><p>'+esc(item.status)+'</p>'+
    '<section><h4>At review</h4>'+(revision?.time?'<p class="invest-muted">Version captured '+investigationTime(revision.time)+'</p>':'')+(revision?quoteWindow(revision.text,quote.excerpt,item.saved):'<p>No version was saved for this quotation.</p>')+'</section>'+
    '<section><h4>Current source</h4>'+quoteWindow(source.text,quote.excerpt,item.current)+'</section>'+
    investigationButton('current','Read current source',source.id)+'</section>');
}

function paintInvestigationTerritory(svg){
  const shape=svg.querySelector('.invest-territory');
  if(!shape)return;
  const region=investigationStates.get(activeSpace())?.model?.region;
  if(!region)return;
  const points=region.ids.map(id=>network.positions.get(id)).filter(Boolean).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  if(!points.length)return;
  function half(ordered){
    const side=[];
    for(const p of ordered){
      while(side.length>=2){
        const a=side.at(-2),b=side.at(-1);
        if((b[0]-a[0])*(p[1]-a[1])>(b[1]-a[1])*(p[0]-a[0]))break;
        side.pop();
      }
      side.push(p);
    }
    return side.slice(0,-1);
  }
  const hull=points.length===1?points:[...half(points),...half([...points].reverse())];
  const d=hull.map(([x,y],i)=>(i?'L':'M')+x+' '+y).join('');
  shape.setAttribute('d',d+(hull.length===1?'l.01 .01':'Z'));
}
function repaintInvestigation(state,focus){
  const {nodes,links}=networkData();
  renderInvestigation(state,nodes,links);
  placeNetworkLabels();
  if(focus)document.querySelector(focus)?.focus({preventScroll:true});
}
function investigationSpec(state){
  const spec={tab:state.tab};
  for(const key of state.tab==='paths'?['from','to','rule']:state.tab==='regions'?['region']:state.tab==='impact'?['source']:['claim'])spec[key]=state[key];
  return spec;
}
function saveInvestigation(state,space){
  const spec=investigationSpec(state),m=state.model;
  const name=state.tab==='paths'?[m.byId.get(state.from)?.name,m.byId.get(state.to)?.name].join(' → '):
    state.tab==='regions'?m.region?.name:state.tab==='impact'?'Impact of '+m.origin?.name:m.claim?.name;
  modal('Save investigation','<form id="save-investigation"><label class="field">Name<input name="name" required maxlength="120" value="'+esc((name||'Investigation').slice(0,120))+'"></label><button type="submit" class="primary">Save</button><p role="status"></p></form>');
  const form=$('#save-investigation');form.elements.name.select();
  form.onsubmit=async e=>{
    e.preventDefault();
    const name=form.elements.name.value.trim(),button=form.querySelector('button');
    if(!name||button.disabled||space!==activeSpace())return;
    button.disabled=true;
    const entry={...spec,id:crypto.randomUUID(),name};
    (space.graphInvestigations??=[]).push(entry);
    try{await save();}
    catch{space.graphInvestigations=space.graphInvestigations.filter(s=>s!==entry);form.querySelector('[role=status]').textContent='Save failed. Try again.';button.disabled=false;return;}
    if(space!==activeSpace()||!form.isConnected)return;
    $('#dialog').close();state.savedOpen=true;
    repaintInvestigation(state,'[data-invest="restore"][data-key="'+CSS.escape(entry.id)+'"]');
    toast('Investigation saved.');
  };
}
async function investigationAction(action,key){
  const space=activeSpace();
  let state=investigationStates.get(space);
  const hadEdits=studio.dirty;
  if(!await saveEditor()||activeSpace()!==space)return;
  if(hadEdits&&state&&$('#investigation-pane'))repaintInvestigation(state);
  if(['open','start','end','claim','source'].includes(action)){
    if(!state){
      state=investigationDefault(spaceNodes(),studioLinks(),action==='start'?key:'');
      investigationStates.set(space,state);
    }else if(action==='open'&&(innerWidth>760||state.sheet))action='close';
    if(action!=='close'){
      state.sheet=true;
      if(action==='start')Object.assign(state,investigationDefault(spaceNodes(),studioLinks(),key));
      if(action==='end')Object.assign(state,{tab:'paths',to:key,index:0});
      if(action==='source')Object.assign(state,{tab:'impact',source:key});
      if(action==='claim')Object.assign(state,{tab:'evidence',claim:key});
      studio.inspector=false;studio.selected.clear();network.settings=false;
      render();$('#investigation-pane [data-invest=tab][aria-pressed=true]')?.focus({preventScroll:true});return;
    }
  }
  if(!state)return;
  if(action==='close'){
    investigationStates.delete(space);render();$('.invest-entry')?.focus({preventScroll:true});return;
  }
  if(action==='review'){
    const draft=workspaceSourceFiles().find(f=>f.id===key);
    if(draft){
      reviewResearchDraft(draft);
      const form=$('#claim-review'),claim=state.model.claim;
      if(form&&claim?.research?.draft===draft.id){
        form.elements.claim.value=claim.research.statement||'';
        const source=claim.research.quotes?.[0]?.id;
        if(source&&[...form.elements.source.options].some(o=>o.value===source)){
          form.elements.source.value=source;form.elements.source.onchange();
        }
        form.elements.decision.focus();
      }
    }
    return;
  }
  if(action==='record'||action==='current'){
    if(action==='current')$('#dialog').close();
    if(innerWidth<=760){state.sheet=false;$('#investigation-pane').dataset.sheet='false';$('.invest-entry').setAttribute('aria-expanded','false');}
    await openNetworkNode(key);$('#space-inspector .floating-heading button')?.focus({preventScroll:true});return;
  }
  if(action==='compare'){inspectPassage(state.model.quotes?.[Number(key)]);return;}
  if(action==='frame'){
    studio.inspector=false;studio.selected.clear();drawInspector();highlightNetwork();
    if(innerWidth<=760){state.sheet=false;$('#investigation-pane').dataset.sheet='false';$('.invest-entry').setAttribute('aria-expanded','false');}
    fitNetwork(state.model.ids);$('.network-stage').focus({preventScroll:true});return;
  }
  if(action==='save'){saveInvestigation(state,space);return;}
  if(action==='forget'){
    const saved=(space.graphInvestigations||[]).find(s=>s.id===key);
    if(!saved||!await confirmRemoval('Remove saved investigation?',saved.name,'Remove')||activeSpace()!==space)return;
    const previous=space.graphInvestigations;
    space.graphInvestigations=previous.filter(s=>s!==saved);
    try{await save();}catch(error){space.graphInvestigations=previous;throw error;}
    if(activeSpace()===space)repaintInvestigation(state,'#investigation-pane summary');
    return;
  }
  if(action==='restore'){
    const saved=(space.graphInvestigations||[]).find(s=>s.id===key);
    if(!saved||!['paths','regions','evidence','impact'].includes(saved.tab))return;
    Object.assign(state,investigationSpec(saved),{index:0,sheet:true,savedOpen:true,backToImpact:false});
  }else if(action==='affected'){
    state.tab='evidence';state.claim=key;state.backToImpact=true;
  }else if(action==='tab'&&['paths','regions','evidence','impact'].includes(key)){
    state.tab=key;state.backToImpact=false;
  }
  else if(action==='route')state.index=Number(key);
  else return;
  studio.inspector=false;studio.selected.clear();drawInspector();highlightNetwork();
  repaintInvestigation(state,action==='route'?'[data-invest=route][aria-pressed=true]':'#investigation-pane [data-invest=tab][aria-pressed=true]');
}
document.addEventListener('click',event=>{
  const button=event.target.closest('button[data-invest]');
  if(button)investigationAction(button.dataset.invest,button.dataset.key).catch(report);
});
document.addEventListener('input',event=>{
  const id=event.target.dataset.investFilter;
  if(!id)return;
  const spec=investigationPickers.get(investigationStates.get(activeSpace()))?.get(id),select=document.getElementById(id);
  if(spec&&select)select.innerHTML=investigationOptions(spec.items,select.value,spec.placeholder,event.target.value);
});
document.addEventListener('change',async event=>{
  const input=event.target;
  if(!input.matches('#investigation-pane select'))return;
  const key=input.id.replace(/^invest-/,''),space=activeSpace(),state=investigationStates.get(space);
  if(!state||!['from','to','rule','claim','region','source'].includes(key))return;
  if(!await saveEditor()||space!==activeSpace()){input.value=state[key];return;}
  state[key]=input.value;state.index=0;
  studio.inspector=false;studio.selected.clear();drawInspector();highlightNetwork();
  repaintInvestigation(state,'#'+input.id);
});
document.addEventListener('toggle',event=>{
  if(event.target.matches?.('.invest-saved')&&event.target.isConnected){
    const state=investigationStates.get(activeSpace());
    if(state)state.savedOpen=event.target.open;
  }
},true);
