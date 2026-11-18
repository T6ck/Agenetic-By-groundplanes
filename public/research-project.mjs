// Local project rules. No requests, telemetry or model-generated authorization.
export const PROJECT_VERSION=1;
export function ensureProject(j){
 if(!j.project)j.project={version:PROJECT_VERSION,audience:'',deliverable:'Research brief',completion:'',tab:'plan',brief:{text:'',citations:[],versions:[]}};
 return j.project;
}
const stop=new Set(['the','and','for','from','with','that','this','what','which','review','research','write','find','summarize','compare','data','document','information','task']);
const terms=text=>[...new Set((text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[]).filter(x=>!stop.has(x)))].slice(0,64);
// An incremental index: immutable text equality invalidates cached passages.
export function createPassageIndex(){
 const cache=new Map();
 return {select(files,question){
  const wanted=new Set(files.map(f=>f.id));for(const id of cache.keys())if(!wanted.has(id))cache.delete(id);
  const query=terms(question),sources=[],quotes=[];
  for(const file of files){
   const text=file.text||'',limit=Math.min(text.length,2*1024*1024);
   let entry=cache.get(file.id);
   if(!entry||entry.text!==text){
    const passages=[];
    for(let start=0;start<limit;start+=800){const excerpt=text.slice(start,Math.min(limit,start+1000));passages.push({start,end:start+excerpt.length,excerpt,words:new Set(excerpt.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[])});}
    entry={text,passages};cache.set(file.id,entry);
   }
   let best=null,score=-1;
   for(const passage of entry.passages){const n=query.reduce((sum,q)=>sum+Number(passage.words.has(q)),0);if(n>score){best=passage;score=n;}}
   sources.push({id:file.id,name:file.name,scanned:limit,total:text.length,partial:limit<text.length||!!file.pdfIndex?.partial,readable:!!text.trim()});
   if(best&&text.trim()){
    const header='File: '+file.name+' ['+file.id+'] · characters ';
    const budget=Math.floor(1500/files.length)-header.length-24;
    if(budget<24)throw Error('A source name leaves too little room for evidence. Shorten the name before running.');
    const firstHit=[...best.excerpt.matchAll(/[\p{L}\p{N}]{3,}/gu)].find(hit=>query.includes(hit[0].toLowerCase()));
    const offset=Math.max(0,Math.min(best.excerpt.length-budget,(firstHit?.index||0)-Math.floor(budget/3)));
    const excerpt=best.excerpt.slice(offset,offset+budget),start=best.start+offset;
    quotes.push({id:file.id,name:file.name,excerpt,start,end:start+excerpt.length,score,matched:score>0});
   }
  }
  return {sources,quotes,context:quotes.map(q=>'File: '+q.name+' ['+q.id+'] · characters '+(q.start+1)+'–'+q.end+'\n'+q.excerpt).join('\n\n')};
 }};
}
export function reviewedClaims(files,eligible){return files.filter(f=>f.research?.state==='supported'&&!f.research.archived&&eligible(f));}
export function proposeBrief(claims,project){
 return {text:claims.map(f=>f.research.statement||f.name).join('\n\n'),citations:claims.map(f=>({claim:f.id,text:f.text,quotes:structuredClone(f.research.quotes||[])})),base:project.brief.text,createdAt:Date.now()};
}
export function applyBrief(project,proposal,files,eligible){
 if(project.brief.text!==proposal.base)throw Error('The brief changed. Prepare a new proposal to preserve your edits.');
 if(!proposal.citations.length)throw Error('Review at least one supported claim first.');
 for(const c of proposal.citations){const f=files.find(f=>f.id===c.claim);if(!f||f.text!==c.text||f.research?.state!=='supported'||!eligible(f))throw Error('Evidence changed. Review the affected claim before updating the brief.');}
 project.brief.versions.push({text:project.brief.text,citations:structuredClone(project.brief.citations),time:Date.now()});
 project.brief.text=proposal.text;project.brief.citations=structuredClone(proposal.citations);delete project.proposal;
}
export function historyPage(j,page=0,size=20){return j.jobs.slice().reverse().slice(Math.max(0,page)*size,(Math.max(0,page)+1)*size);}
