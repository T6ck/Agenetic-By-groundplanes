'use strict';
// Local account identity is independent of research workspaces.
let localIdentity={name:'Researcher',avatar:''},identitySession={scope:'guest',signedIn:false,verified:false};
async function bootIdentity(){try{const r=await fetch('/api/session',{cache:'no-store'});if(!r.ok)throw new Error('Session unavailable');const session=await r.json();if(!session||typeof session.scope!=='string'||!(/^[a-f0-9]{64}$/.test(session.scope)||session.scope==='guest')||typeof session.signedIn!=='boolean')throw new Error('Invalid session');identitySession={...session,verified:true}}catch{identitySession={scope:'guest',signedIn:false,verified:false}}const stored=await req(db.transaction('state').objectStore('state').get('identity:'+identitySession.scope));if(stored)localIdentity=stored;else if(identitySession.scope==='guest'){localIdentity=structuredClone(data.identity||{name:'Researcher',avatar:''});await persistIdentity(localIdentity)}else localIdentity={name:'Researcher',avatar:''}}
function persistIdentity(value){return new Promise((resolve,reject)=>{const t=db.transaction('state','readwrite');t.objectStore('state').put(value,'identity:'+identitySession.scope);t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||new Error('Profile save failed'))})}
function profileIdentity(){return localIdentity}
function identityAvatar(identity=profileIdentity()){return identity.avatar&&/^data:image\/(png|jpeg|webp);base64,/.test(identity.avatar)?'<img src="'+esc(identity.avatar)+'" alt="">':'<span>'+esc(Array.from(identity.name.trim()||'A').slice(0,2).join('').toUpperCase())+'</span>'}
function addIdentityControl(){const host=document.querySelector('.knowledge-header,.space-header,.community-shell>header');if(!host||host.querySelector('[data-account]'))return;host.classList.add('family-header');host.insertAdjacentHTML('beforeend','<button class="account-control" data-account aria-label="Your profile" title="Your profile"><span class="identity-avatar">'+identityAvatar()+'</span></button>')}
const identityBaseRender=render;render=function(){identityBaseRender();addIdentityControl()};
const identityCommunityRender=renderCommunity;renderCommunity=function(){identityCommunityRender();addIdentityControl()};
let identityDraft=null,avatarRequest=0;
function accountDialog(){identityDraft={...profileIdentity()};modal('Your profile','<section class="identity-sheet"><p class="identity-lead">A name of your choosing. A space of your own.</p><form id="identity-form"><div class="identity-photo-row"><span class="identity-avatar identity-large" id="identity-preview">'+identityAvatar(identityDraft)+'</span><label class="identity-photo-button">Change avatar<input id="identity-photo" type="file" accept="image/png,image/jpeg,image/webp"></label><button type="button" data-avatar-remove>Use initials</button></div><p class="identity-help">PNG, JPEG or WebP, up to 2 MB. Your avatar stays on this device across every workspace. It is not attached to community posts.</p><label class="field">Display name<input name="displayName" maxlength="60" required autocomplete="nickname" value="'+esc(identityDraft.name)+'"></label><p class="identity-help">Use any name. It does not need to be unique or match your sign-in account.</p><button class="primary" type="submit">Save profile</button><p id="identity-feedback" role="status"></p></form><section class="identity-section"><span class="section-kicker">SIGN-IN</span><h3>'+(identitySession.signedIn?'Signed-in profile':'Guest profile')+'</h3><p>Community access uses Sign in with ChatGPT. Agenetic does not ask for another email address or store a sign-in password. Manage your password with your sign-in provider.</p><a class="identity-login" target="_top" href="'+esc(identitySession.signedIn?identitySession.signOut:community.signIn)+'">'+(identitySession.signedIn?'Sign out':'Continue with existing login')+' '+lineIcon('arrow')+'</a></section><section class="identity-section"><span class="section-kicker">ON THIS DEVICE</span><h3>One identity across your workspaces.</h3><p>'+(identitySession.signedIn?'Your name and avatar are saved on this device for your signed-in account. Sign out to return to the guest identity.':'This guest identity is shared across workspaces on this browser. Sign in to use a separate account identity.')+' Nothing is synchronized to other devices.</p><button data-profiles>Manage local profiles</button></section></section>')}
document.addEventListener('click',e=>{if(e.target.closest('[data-account]'))accountDialog();if(e.target.closest('[data-avatar-remove]')&&identityDraft){avatarRequest++;identityDraft.avatar='';document.querySelector('#identity-form [type=submit]').disabled=false;document.querySelector('#identity-feedback').textContent='Initials selected.';document.querySelector('#identity-preview').innerHTML=identityAvatar(identityDraft)}});
async function readProfileAvatar(file){
 if(file.size>2*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Choose a PNG, JPEG or WebP under 2 MB.');
 let image;
 try{image=await createImageBitmap(file)}catch{throw Error('This photo could not be read. Choose another image.')}
 try{
  if(image.width>12000||image.height>12000)throw Error('Choose an image up to 12,000 pixels per side.');
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const side=Math.min(image.width,image.height);
  canvas.getContext('2d').drawImage(image,(image.width-side)/2,(image.height-side)/2,side,side,0,0,256,256);
  return canvas.toDataURL('image/png');
 }finally{image.close()}
}
document.addEventListener('change',async e=>{
 const input=e.target;if(input.id!=='identity-photo'||!input.files?.[0])return;
 const draft=identityDraft,request=++avatarRequest,form=input.closest('form');
 const feedback=form.querySelector('#identity-feedback'),saveButton=form.querySelector('[type=submit]');
 saveButton.disabled=true;feedback.textContent='Preparing photo…';
 try{
  const avatar=await readProfileAvatar(input.files[0]);
  if(draft!==identityDraft||!input.isConnected||request!==avatarRequest)return;
  draft.avatar=avatar;form.querySelector('#identity-preview').innerHTML=identityAvatar(draft);
  feedback.textContent='Photo ready. Save profile to keep it.';
 }catch(err){if(request===avatarRequest)feedback.textContent=err.message}
 finally{input.value='';if(request===avatarRequest)saveButton.disabled=false}
});
document.addEventListener('submit',e=>{if(e.target.id!=='identity-form')return;e.preventDefault();const form=e.target,name=new FormData(form).get('displayName').trim();if(!name){document.querySelector('#identity-feedback').textContent='Enter a display name.';return}const button=form.querySelector('[type=submit]');button.disabled=true;const next={name,avatar:identityDraft.avatar};persistIdentity(next).then(()=>{localIdentity=next;$('#dialog').close();identityDraft=null;render();toast('Profile saved across workspaces on this device.')}).catch(err=>{button.disabled=false;document.querySelector('#identity-feedback').textContent='Could not save: '+err.message})});
