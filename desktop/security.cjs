const ORIGIN='agenetic://app';
function isLocal(url){try{const u=new URL(url);return u.protocol==='agenetic:'&&u.host==='app'}catch{return false}}
function externalURL(value){try{const u=new URL(value);return u.protocol==='https:'&&['groundplanes.com','neuron-ops.enchantingflora5.chatgpt.site','huggingface.co','buy.stripe.com','donate.stripe.com','billing.stripe.com','water.org'].includes(u.hostname)&&!u.username&&!u.password?u.href:null}catch{return null}}
function assetPath(url){const u=new URL(url);if(!isLocal(url))throw Error('Untrusted origin');const name=decodeURIComponent(u.pathname);if(name.includes('\\')||name.split('/').includes('..')||name.includes('\0'))throw Error('Invalid path');return name==='/'?'index.html':name.replace(/^\//,'')}
module.exports={ORIGIN,isLocal,externalURL,assetPath};
