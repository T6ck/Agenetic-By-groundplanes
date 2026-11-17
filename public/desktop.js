'use strict';
const desktopBridge=window.ageneticDesktop;
let desktopRelease=null;
if(desktopBridge){
 function showVersion(){
  const host=document.querySelector('.knowledge-explorer-footer,.space-footer > div,.library-navigation > div,.desktop-community header > div');
  if(!host||host.querySelector('[data-destination="releases"]'))return;
  const button=document.createElement('button');
  button.type='button';button.dataset.destination='releases';button.className='desktop-version';
  button.textContent=desktopRelease?'v'+desktopRelease.version:'Version & updates';
  button.title=desktopRelease?desktopRelease.channel+' · Version & updates':'Version & updates';
  button.setAttribute('aria-label',button.textContent+' · Version & updates');host.append(button);
 }
 if(desktopBridge.getRelease){
 const desktopRender=render;
 render=function(){desktopRender();showVersion()};
 desktopBridge.getRelease().then(value=>{desktopRelease=value;document.querySelectorAll('.desktop-version').forEach(button=>button.remove());showVersion();document.querySelector('#installed-release')?.replaceChildren(releaseLabel());}).catch(()=>{});
 }
 function releaseLabel(){return desktopRelease?'Version '+desktopRelease.version+' · '+desktopRelease.channel:'Installed version unavailable';}
 document.addEventListener('click',event=>{const button=event.target.closest('[data-desktop-install]');if(!button)return;(async()=>{if(!await saveEditor())return;const result=await desktopBridge.installUpdate();if(result?.message)toast(result.message)})().catch(report)});
 window.ageneticDesktop.getConnection().then(c=>{if(c.error){desktopConnectionStatus=c.error;if(page==='Models')render();return}companionBase=c.base;token=c.key;desktopConnectionStatus='Companion connected automatically';if(page==='Models')refreshModels().catch(report)}).catch(()=>{desktopConnectionStatus='Companion unavailable. Restart Agenetic to try again.';if(page==='Models')render()});
 renderCommunity=function(){
  document.body.classList.remove('knowledge-mode');document.body.classList.add('mindspace');applyAppearance();
  $('#content').innerHTML='<section class="community-shell desktop-community"><header><button data-community-back>'+brandMark()+'<strong>Agenetic</strong><span>/ Community</span></button><div><button data-global-appearance aria-label="Appearance">'+lineIcon('palette')+'Appearance</button></div></header><main class="desktop-community-intro"><span class="section-kicker">A CONNECTION YOU CHOOSE</span><h1>Your work stays here.<br>Ideas can travel.</h1><p>Community opens in your browser with its own sign-in. Your local notes, model files and run history are not uploaded when you open it.</p><p>Export a workflow or theme, review its contents, then choose whether to publish it. Anyone can browse the community. Sign in with ChatGPT in your browser to publish.</p><div><button class="primary" data-desktop-community>Open community in browser</button><button data-community-back>Return to workspace</button></div></main></section>';
  if(appearanceOpen)$('#content').insertAdjacentHTML('beforeend',appearancePanel());
 };
 loadCommunity=async function(){};
 document.addEventListener('click',e=>{if(e.target.closest('[data-desktop-community]'))window.ageneticDesktop.openCommunity();if(e.target.closest('[data-desktop-website]'))window.ageneticDesktop.openWebsite();const update=e.target.closest('[data-desktop-update]');
  if(!update||update.disabled)return;
  const status=document.querySelector('#release-status');
  const install=status?.parentElement.querySelector('[data-desktop-install]');
  const showStatus=message=>{if(status?.isConnected)status.textContent=message;else if(!status)toast(message)};
  update.disabled=true;
  if(status)status.textContent='Checking update status…';
  window.ageneticDesktop.checkUpdate()
   .then(result=>{showStatus(result.message);if(install)install.hidden=!result.ready;})
   .catch(()=>showStatus('Update status is unavailable.'))
   .finally(()=>{update.disabled=false});});
}
let desktopConnectionStatus='';
