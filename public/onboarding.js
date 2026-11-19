'use strict';
const setupPages=['Welcome','Your identity','Appearance','Local storage','Models & tools','Ready to begin'];
let setupDialog=null,setupStep=0,setupBusy=false,setupCanClose=false,setupAvatar=null,setupAvatarRequest=0,setupAvatarPending=false;
async function bootOnboarding(force=false){
 if(setupDialog?.open||(!force&&!window.ageneticDesktop))return;
 const state=appearance().onboarding;
 if(!force&&state?.completed)return;
 setupCanClose=force&&(!!state?.completed||!window.ageneticDesktop);
 setupAvatar=null;setupAvatarPending=false;
 setupStep=force?0:Math.max(0,Math.min(5,state?.step||0));
 setupDialog=document.createElement('dialog');setupDialog.className='setup-wizard';setupDialog.setAttribute('aria-label','Set up Agenetic');
 setupDialog.addEventListener('cancel',e=>{e.preventDefault();if(setupCanClose&&!setupBusy)closeSetup()});document.body.append(setupDialog);setupDialog.showModal();drawSetup();
}
function closeSetup(){
 setupAvatarRequest++;setupAvatar=null;setupAvatarPending=false;
 setupDialog.close();setupDialog.remove();setupDialog=null;
 document.querySelector('[data-navigate]')?.focus();
}
function setupCopy(){switch(setupStep){
 case 0:return '<span class="section-kicker">AGENETIC BY GROUNDPLANES</span><h1>Set up your research workspace</h1><p>Choose your name and theme, then see where your files live. You can add a model later.</p><dl><dt>Explore the example project</dt><dd>The example links source notes to an agent and its tasks. Open a note to see the connections. You choose when to run the agent.</dd><dt>No account required</dt><dd>Work locally without an email or community sign-in. Personal use is free.</dd><dt>Take this at your pace</dt><dd>Your progress is saved on this device. Models and tools can be connected later.</dd></dl>';
 case 1:return '<h1>Choose your name and photo</h1><p>This identity belongs to you on this device and stays the same when you switch workspaces.</p><label class="field">Display name<input id="setup-name" maxlength="60" autocomplete="nickname" value="'+esc(localIdentity.name)+'" required></label><div class="identity-photo-row"><span class="identity-avatar identity-large">'+identityAvatar({...localIdentity,avatar:setupAvatar??localIdentity.avatar})+'</span><label class="field">Optional avatar<input id="setup-avatar" type="file" accept="image/png,image/jpeg,image/webp"></label></div><p class="identity-help">PNG, JPEG or WebP, up to 2 MB. Your avatar is not attached to community posts. No new password is required for this local profile; it is not an encrypted vault lock.</p>';
 case 2:return '<h1>Choose an appearance</h1><p>Appearance is saved for this device, across all workspaces. You can customize and export it later.</p><div class="setup-themes">'+Object.entries(themePresets).map(([id,t])=>'<button type="button" data-setup-theme="'+id+'" aria-pressed="'+(appearance().theme===id)+'"><span style="background:'+t.bg+';color:'+t.ink+';border:1px solid '+t.line+'">Aa</span><strong>'+esc(t.name)+'</strong><small>'+esc(t.note)+'</small></button>').join('')+'</div>';
 case 3:return '<h1>Keep a backup of your work</h1><p>Notes, original imports, layouts and run history are stored in this app’s local vault. Model weights are separate files on disk.</p><dl><dt>Protect the device</dt><dd>The live vault is not application-encrypted. Use your Windows account and disk encryption to protect the device.</dd><dt>Back up before you need it</dt><dd>Navigate → Backup & restore creates a password-encrypted vault archive. Keep it on another drive. Model weights and operating-system credentials are not included.</dd><dt>Moving from the browser?</dt><dd>Export an encrypted vault backup in the web app, then restore it here after setup. Restoration replaces the destination vault after confirmation.</dd><dt>Working on a second device</dt><dd>Move your research between devices with an encrypted backup. Community sign-in leaves each device’s private vault separate.</dd></dl><label class="setup-check"><input id="setup-storage" type="checkbox" '+(appearance().onboarding?.storageAcknowledged?'checked':'')+'> I understand that I need a backup to recover local work.</label>';
 case 4:return '<h1>Connect a local model</h1><p>Read, write and organize sources without a model. Inference requires a supported GGUF and a working llama.cpp runtime. Setup does not train or fine-tune model weights.</p><dl><dt>Choose an existing GGUF</dt><dd>Register a file on your disk. Large models can require tens of gigabytes of storage and substantial RAM or VRAM; registration alone does not verify inference.</dd><dt>Browse Hugging Face later</dt><dd>Models → Search shows compatible files and their sizes. Downloads require network access, disk space and the model’s license/access permissions.</dd><dt>Tools are explicit</dt><dd>MCP connections are configured separately. Inspect and allow tools before using them. Arbitrary autonomous tool loops and OAuth MCP are not included.</dd></dl><button type="button" data-setup-model '+(!window.ageneticDesktop?'disabled':'')+'>Choose an existing GGUF</button><p id="setup-model-result" role="status">'+esc(appearance().onboarding?.modelMessage||'Optional. You can continue without a model.')+'</p>';
 default:return '<h1>Open your first source</h1><p>Your workspace is ready to explore. No research files have been published.</p><ol class="setup-tour"><li><strong>Open “Start here” or a document in the explorer.</strong> Read its content and inspect its actual connections.</li><li><strong>Add your own material.</strong> Import files or create a note; switch between Graph and Canvas to organize the same workspace.</li><li><strong>Connect a model and verify a small run.</strong> Check the output and run trace before assigning larger tasks.</li><li><strong>Share deliberately.</strong> Community opens separately with its own sign-in. Review an export before publishing it.</li></ol><p>Installed updates are checked automatically only in configured signed builds. They install when you close the app, not in the middle of research. Self-signed test builds need explicit Windows certificate trust.</p><label class="setup-check"><input id="setup-privacy" type="checkbox"> I understand that model downloads, configured external tools, and community actions can use the network.</label>';
}}
function drawSetup(focusSelector){setupDialog.innerHTML='<div class="setup-side">'+(window.ageneticDesktop?'<img class="setup-brand-art" src="agenetic-brand.webp" width="384" height="384" alt="">':'')+'<strong>Agenetic</strong><small>by Groundplanes</small><ol>'+setupPages.map((x,i)=>'<li '+(i===setupStep?'aria-current="step"':'')+'><span>'+String(i+1).padStart(2,'0')+'</span>'+x+'</li>').join('')+'</ol></div><div class="setup-main"><p class="section-kicker">SETUP / '+(setupStep+1)+' OF '+setupPages.length+'</p><section>'+setupCopy().replace('<h1>','<h1 tabindex="-1">')+'</section><p id="setup-error" role="alert"></p><footer><button type="button" data-setup-back '+(!setupStep?'disabled':'')+'>Back</button>'+(setupCanClose?'<button type="button" data-setup-close>Close guide</button>':'<span>Device setup</span>')+'<button type="button" class="primary" data-setup-next>'+(setupStep===5?'Open my workspace':'Continue')+'</button></footer></div>';setupDialog.querySelector(focusSelector||'h1').focus()}
async function storeSetupStep(step,changes={}){
 const prefs=appearance(),previous=prefs.onboarding;
 prefs.onboarding={...previous,...changes,step};
 try{await save()}catch(error){prefs.onboarding=previous;throw error}
 setupStep=step;
}
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-setup-next],[data-setup-back],[data-setup-theme],[data-setup-model],[data-setup-reopen],[data-setup-close]');
 if(!b||setupBusy)return;
 if(b.hasAttribute('data-setup-reopen')){
  document.querySelector('#dialog')?.close();await bootOnboarding(true);return;
 }
 if(!setupDialog?.open)return;
 if(b.hasAttribute('data-setup-close')){if(setupCanClose)closeSetup();return}
 setupBusy=true;b.disabled=true;
 try{
  if(b.dataset.setupTheme){
   const prefs=appearance(),previous={theme:prefs.theme,customTheme:prefs.customTheme};
   prefs.theme=b.dataset.setupTheme;prefs.customTheme=null;
   try{await save()}catch(error){Object.assign(prefs,previous);throw error}
   render();drawSetup('[data-setup-theme="'+b.dataset.setupTheme+'"]');return;
  }
  if(b.hasAttribute('data-setup-model')){
   const model=await pickCompanionModel();
   if(model){await storeSetupStep(setupStep,{modelMessage:model.name+' added to this workspace. Run a short task after setup to verify inference.'});drawSetup('[data-setup-model]')}
   return;
  }
  if(b.hasAttribute('data-setup-back')){
   await storeSetupStep(Math.max(0,setupStep-1));setupAvatarRequest++;setupAvatarPending=false;drawSetup();return;
  }
  const changes={};
  if(setupStep===1){
   if(setupAvatarPending)throw Error('Your photo is still loading. Try Continue in a moment.');
   const input=setupDialog.querySelector('#setup-name'),name=input.value.trim();
   if(!name){input.focus();throw Error('Enter a display name to continue.')}
   const next={...localIdentity,name,avatar:setupAvatar??localIdentity.avatar};
   await persistIdentity(next);localIdentity=next;setupAvatar=null;
  }
  if(setupStep===3){
   const check=setupDialog.querySelector('#setup-storage');
   if(!check.checked){check.focus();throw Error('Confirm that you understand how backups work.')}
   changes.storageAcknowledged=true;
  }
  if(setupStep===5){
   const check=setupDialog.querySelector('#setup-privacy');
   if(!check.checked){check.focus();throw Error('Confirm that you understand when the app uses the network.')}
   await storeSetupStep(5,{completed:true,completedAt:Date.now()});
   render();closeSetup();return;
  }
  await storeSetupStep(setupStep+1,changes);drawSetup();
 }catch(error){if(setupDialog)setupDialog.querySelector('#setup-error').textContent=error.message||'Setup could not be saved. Try again.'}
 finally{setupBusy=false;b.disabled=false}
});
document.addEventListener('change',async e=>{
 const input=e.target;if(input.id!=='setup-avatar'||!input.files?.[0]||setupBusy)return;
 const request=++setupAvatarRequest,dialog=setupDialog;
 setupAvatarPending=true;
 try{
  const avatar=await readProfileAvatar(input.files[0]);
  if(request!==setupAvatarRequest||!input.isConnected)return;
  setupAvatar=avatar;
  dialog.querySelector('.identity-avatar').innerHTML=identityAvatar({...localIdentity,avatar});
  dialog.querySelector('#setup-error').textContent='';
 }catch(error){if(request===setupAvatarRequest&&input.isConnected)dialog.querySelector('#setup-error').textContent=error.message}
 finally{if(request===setupAvatarRequest)setupAvatarPending=false;input.value=''}
});
