'use strict';
function navigateDialog(){modal('Find your way.','<span class="section-kicker">AGENETIC / YOUR WORKSPACE</span><div class="destination-list">'+[['workspace','Workspace','Notes, agents and connected work'],['models','Models','Browse Hugging Face or use a local GGUF'],['research','Research','Review evidence and critique findings'],['summary','Summarize','Turn connected sections into a plain-language draft'],['tools','MCP tools','Inspect and run explicitly allowed tools'],['backup','Backup & restore','Move or recover your complete local vault'],['community','Community','Share only what you review'],['releases','Releases','Check for updates and read patch notes']].map(([id,title,copy])=>'<button data-destination="'+id+'"><strong>'+title+'</strong><span>'+copy+'</span>'+lineIcon('arrow')+'</button>').join('')+'</div><button data-setup-reopen>Revisit setup guide</button><p class="navigation-hint">Ctrl / ⌘ K to find notes. Esc to close a panel.</p>')}
function enhanceNavigation(){document.documentElement.dataset.explorerCollapsed=String(!!appearance().explorerCollapsed);const host=document.querySelector('.family-header');if(host&&!host.querySelector('[data-navigate]'))host.insertAdjacentHTML('afterbegin',(inNetwork()?'<button data-explorer-toggle class="explorer-toggle" aria-label="'+(appearance().explorerCollapsed?'Expand explorer':'Collapse explorer')+'" aria-expanded="'+(!appearance().explorerCollapsed)+'" aria-controls="graph-explorer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/></svg></button>':'')+'<button data-navigate class="navigate-trigger" title="Navigate Agenetic">'+lineIcon('menu')+'<span>Navigate</span></button>');if(page==='Models'){document.body.classList.add('model-library-page');const main=$('#content');if(!main.querySelector('.library-navigation'))main.insertAdjacentHTML('afterbegin','<nav class="library-navigation" aria-label="Agenetic navigation"><button data-destination="workspace">'+brandMark()+'<strong>Agenetic</strong><small>by Groundplanes</small></button><div><button data-navigate>Navigate</button><button data-destination="workspace">Back to workspace</button><button data-destination="backup">Backup</button></div></nav>')}else document.body.classList.remove('model-library-page');const footer=document.querySelector('.knowledge-explorer-footer');if(footer&&!footer.querySelector('[data-destination="research"]'))footer.insertAdjacentHTML('beforeend','<button data-destination="research">'+lineIcon('agent')+'Research cycle</button><button data-destination="tools">'+lineIcon('settings')+'MCP tools</button><button data-destination="backup">'+lineIcon('download')+'Backup & restore</button>')}
const navigationRender=render;render=function(){navigationRender();enhanceNavigation()};
document.addEventListener('click',e=>{const b=e.target.closest('[data-navigate],[data-destination]');if(!b)return;(async()=>{if(b.hasAttribute('data-navigate'))return navigateDialog();if(!await saveEditor())return;$('#dialog').close();switch(b.dataset.destination){case 'workspace':page='Overview';render();break;case 'models':page='Models';render();break;case 'research':cycleDialog();break;case 'summary':summaryDialog();break;case 'tools':mcpDialog();break;case 'backup':recoveryDialog();break;case 'releases':desktopStatus();break;case 'community':page='Community';render();if(!window.ageneticDesktop)await loadCommunity();break}})().catch(report)});

async function setExplorerCollapsed(collapsed) {
 const preferences=appearance(),previous=preferences.explorerCollapsed;
 if (!!previous===collapsed) return true;
 if(studio.dirty&&!await saveEditor())return false;
 preferences.explorerCollapsed=collapsed;
 try {await save();}
 catch (error) {preferences.explorerCollapsed=previous;report(error);return false;}
 render();
 if (inNetwork()) fitNetwork();
 return true;
}
document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-explorer-toggle]');
 if(!button || !inNetwork())return;
 button.disabled=true;
 try {
  if(await setExplorerCollapsed(!appearance().explorerCollapsed))document.querySelector('[data-explorer-toggle]')?.focus({preventScroll:true});
 } finally {button.disabled=false;}
});
