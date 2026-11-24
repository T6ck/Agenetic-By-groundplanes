'use strict';
let removalPending=false;
function confirmRemoval(title,description,label='Confirm removal',tone){
 tone??=/delete|remove|replace|clear|reset/i.test(title+' '+label)?'danger':'primary';
 if(removalPending)return Promise.resolve(false);
 removalPending=true;
 return new Promise(resolve=>{
  const d=document.createElement('dialog');d.className='removal-dialog';d.setAttribute('aria-labelledby','removal-title');
  d.innerHTML='<div class="pad"><span class="section-kicker">PLEASE CONFIRM</span><h2 id="removal-title">'+esc(title)+'</h2><p>'+esc(description)+'</p><div class="confirm-actions"><button data-cancel autofocus>Cancel</button><button data-confirm class="'+tone+'" disabled>'+esc(label)+'</button></div></div>';
  document.body.append(d);let done=false;const finish=value=>{if(done)return;done=true;d.close();d.remove();removalPending=false;resolve(value)};
  d.querySelector('[data-cancel]').onclick=()=>finish(false);d.querySelector('[data-confirm]').onclick=()=>finish(true);d.addEventListener('cancel',e=>{e.preventDefault();finish(false)});d.showModal();d.querySelector('[data-cancel]').focus();setTimeout(()=>{if(d.isConnected)d.querySelector('[data-confirm]').disabled=false},400);
 });
}
function usePolicy(){modal('Personal and commercial use','<section class="use-policy"><p class="policy-lead">Free for personal use. Funded by commercial use.</p><div class="policy-row"><span>01 / PERSONAL</span><div><h3>Personal projects</h3><p>Personal learning, independent noncommercial research, and your own projects are free. No Agenetic-imposed limits on notes, profiles, agents, or local model runs. No credit packs, trial countdown, or payment card required.</p><p class="policy-detail">Your device sets the practical limits. Models and optional third-party services may have their own licenses or costs.</p></div></div><div class="policy-row"><span>02 / COMMERCIAL</span><div><h3>Commercial licenses</h3><p>Work performed for a business, paid client work, commercial products, and company deployments require a paid commercial license. Commercial revenue is intended to fund continued free personal access.</p><p class="policy-detail">One license per commercial user. $12 USD monthly or $120 USD yearly, plus applicable tax. Renews automatically; cancel before renewal through Manage billing. Your license remains valid through the paid period.</p></div></div><div class="billing-actions"><button data-business>Team &amp; billing</button></div><p class="policy-detail">Connect your Groundplanes account to purchase seats, invite members, and access invoices. Existing receipt-based license holders can contact hello@groundplanes.com to connect their license. Local inference runs on your hardware.</p><div class="policy-row"><span>03 / PRIVACY</span><div><h3>Local data</h3><p>Your notes, files, agent instructions, and model registrations remain on this device. No inspection of your vault is used to classify your work or calculate a bill.</p></div></div></section>')}
const productRender=render;
render=function(){productRender();addProductControls();syncDepth()};
const productCommunity=renderCommunity;
renderCommunity=function(){productCommunity();addProductControls()};
function supportAgenetic(){
  modal('Support Agenetic', '<section class="use-policy">'+
    '<p class="policy-lead">Donations start at $1.</p>'+
    '<p>Donations help pay for Agenetic development and community hosting.</p>'+
    '<div class="billing-actions"><a href="https://donate.stripe.com/eVq9AUfAZ7845Az7fOaR203" target="_blank" rel="noopener noreferrer">Contribute from $1</a></div>'+
    '<div class="policy-row"><span>WATER ACCESS</span><div><h3>5% goes to Water.org</h3><p>Groundplanes sets aside 5% of Agenetic donations to support Water.org’s work expanding access to safe water and sanitation.</p><a href="https://water.org/donate" target="_blank" rel="noopener noreferrer">Give directly to Water.org</a></div></div>'+
    '<p class="policy-detail">Choose your amount at Stripe checkout. Contributions to Groundplanes are optional, one-time, and not tax-deductible. Agenetic is free for personal use.</p></section>');
}
function aboutAgenetic(){modal('About Agenetic','<p>Agenetic by Groundplanes. A local workspace for research and connected tasks.</p><div class="about-actions"><button data-destination="releases">Version and updates</button><button data-support>Support Agenetic</button><button data-use-policy>Personal and commercial use</button><button data-destination="backup">Backup and restore</button></div>')}
function addProductControls(){
 const host=document.querySelector('.knowledge-explorer-footer');
 if(host&&!host.querySelector('[data-destination="about"]'))host.insertAdjacentHTML('beforeend','<button data-destination="review">'+lineIcon('review')+'Review queue</button><button data-destination="about">About Agenetic</button>');
}
document.addEventListener('click',e=>{if(e.target.closest('[data-use-policy]'))usePolicy();if(e.target.closest('[data-support]'))supportAgenetic()});
function syncDepth(){const a=appearance();document.documentElement.dataset.depth=a.depth||'subtle';for(const s of document.querySelectorAll('.network-stage,.space-stage')){if(!s.querySelector('.depth-field')){const layer=document.createElement('div');layer.className='depth-field';layer.setAttribute('aria-hidden','true');layer.innerHTML='<i class="depth-wash"></i><i class="depth-contour contour-one"></i><i class="depth-contour contour-two"></i><i class="depth-mesh"></i>';s.prepend(layer)}}}
let depthFrame=0;
document.addEventListener('pointermove',e=>{const s=e.target.closest('.network-stage,.space-stage');if(!s||appearance().depth==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches||depthFrame)return;depthFrame=requestAnimationFrame(()=>{const r=s.getBoundingClientRect();s.style.setProperty('--depth-x',((e.clientX-r.left)/r.width-.5)*18+'px');s.style.setProperty('--depth-y',((e.clientY-r.top)/r.height-.5)*14+'px');depthFrame=0})});
const depthPanel=appearancePanel;
appearancePanel=function(){return depthPanel().replace('<label class="grid-choice">','<label>Background depth<select id="appearance-depth"><option value="off" '+(appearance().depth==='off'?'selected':'')+'>Flat</option><option value="subtle" '+(!appearance().depth||appearance().depth==='subtle'?'selected':'')+'>Subtle</option><option value="deep" '+(appearance().depth==='deep'?'selected':'')+'>Deep</option></select></label><label class="grid-choice">')};
document.addEventListener('change',async e=>{if(e.target.id!=='appearance-depth')return;appearance().depth=e.target.value;syncDepth();try{await save()}catch(err){report(err)}});
