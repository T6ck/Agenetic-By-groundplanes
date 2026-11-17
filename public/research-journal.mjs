// Pure scheduling rules. The browser adapter owns storage and model requests.
export const STAGES=['Evidence review','Critical review','Synthesis'];
export function newJournal(){return {version:1,goal:'',model:'',sources:[],performance:'quick',intervalMinutes:15,dailyLimit:12,autoFollowups:false,organize:true,archiveDuplicates:false,enabled:false,jobs:[],events:[],seen:{},lastScan:0};}
export function recoverJournal(j){j.enabled=false;for(const job of j.jobs)if(job.status==='running')job.status='interrupted';return j;}
export function addEvent(j,message,now=Date.now()){j.events.unshift({time:now,message});j.events=j.events.slice(0,100);}
export function queueJob(j,{id,question,sources,revision,context,quotes=[],parent='',depth=0,task},now=Date.now()){
 if(j.jobs.some(x=>x.revision===revision&&x.question===question&&x.status!=='cancelled'))return null;
 if(j.jobs.length>=200)throw Error('This journal has 200 tasks. Create a new workspace to continue with a fresh journal.');
 if(j.jobs.filter(x=>['queued','running','interrupted'].includes(x.status)).length>=20)throw Error('The queue has 20 unfinished tasks. Finish or cancel some before adding more.');
 const job={id,question,sources:[...sources],revision,context,quotes,parent,depth,task,status:'queued',steps:[],createdAt:now,model:j.model,performance:j.performance||'quick'};
 j.jobs.push(job);addEvent(j,'Queued: '+question,now);return job;
}
export function nextJob(j,now=Date.now()){
 if(!j.enabled)return null;
 const since=now-86400000;
 const started=j.jobs.filter(x=>x.startedAt>since).length;
 return j.jobs.find(x=>x.status==='queued'&&(x.startedAt||started<j.dailyLimit))||null;
}
export function checkpoint(job,stage,output){
 if(stage!==STAGES[job.steps.length])throw Error('Unexpected research stage.');
 if(typeof output!=='string'||!output.trim())throw Error('The model returned no readable result.');
 job.steps.push({stage,output:output.slice(0,24000)});
}
export function duplicateDrafts(files){
 const seen=new Map(),duplicates=[];
 for(const f of files){
  // Exact text and source scope only. Never archive originals or reviewed claims.
  if(!f.research?.journalJob||f.research.state!=='pending'||f.research.archived||f.research.noAutoArchive||!f.text?.trim())continue;
  const key=JSON.stringify([f.text,[...(f.research.sources||[])].sort()]);
  if(seen.has(key))duplicates.push({id:f.id,canonical:seen.get(key)});else seen.set(key,f.id);
 }
 return duplicates;
}
export function placeGenerated(space,id,source){
 space.graphPositions??={};space.positions??={};
 if(space.graphPositions[id])return;
 const origin=space.graphPositions[source]||[0,0],occupied=Object.values(space.graphPositions);
 let x=origin[0]+240,y=origin[1];
 while(occupied.some(p=>Math.abs(p[0]-x)<180&&Math.abs(p[1]-y)<90))y+=110;
 space.graphPositions[id]=[x,y];space.positions[id]=[x,y];
}
