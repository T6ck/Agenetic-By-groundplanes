'use strict';
window.ageneticTeamBridge={
 async audit(team,reviewer){const {claimAudit,auditHtml}=await import('./business-rules.mjs');const files=workspaceSourceFiles().map(({id,name,text,research,originTrace})=>({id,name,text,originTrace,research:structuredClone(research)}));
 const byId=new Map(files.map(file=>[file.id,file]));
 const current=new Set(files.filter(file=>file.research&&researchSourceReady(file,byId)).map(file=>file.id));
 const r=await claimAudit(files,{team,reviewer,workspace:activeSpace().name,current});for(const [name,text,type] of [['agenetic-claim-audit.json',JSON.stringify(r,null,2),'application/json'],['agenetic-claim-audit.html',auditHtml(r),'text/html']]){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}},
};
document.addEventListener('click',async ev=>{if(!ev.target.closest('[data-business]'))return;modal('Team & billing','<div id="business-root" class="business"></div>');const {showBusiness}=await import('./business.js');showBusiness(document.getElementById('business-root'));});
const personalPolicy=usePolicy;usePolicy=function(){personalPolicy();document.querySelector('.use-policy')?.insertAdjacentHTML('afterbegin','<p><button data-business>Team & billing</button></p><p>Personal features remain free. Team access connects your Groundplanes account to paid seats, shared project snapshots, model setup, claim-audit exports, and same-day first-response support.</p>');};
const businessAccountDialog=accountDialog;accountDialog=function(){businessAccountDialog();document.querySelector('.identity-sheet')?.insertAdjacentHTML('beforeend','<section class="identity-section"><h3>Business team</h3><p>Manage your commercial seats and shared projects. Your local profile stays separate.</p><button data-business>Team & billing</button></section>');};
