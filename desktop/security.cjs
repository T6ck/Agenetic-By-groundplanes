const ORIGIN='agenetic://app';
function isLocal(url){try{const u=new URL(url);return u.protocol==='agenetic:'&&u.host==='app'}catch{return false}}
function externalURL(value){
 try {
  const url=new URL(value);
  if (url.protocol!=='https:'||url.username||url.password||url.port) return null;
  if (url.hostname==='github.com') {
   return /^\/T6ck\/(?:AgeneticByGroundplanes|Agenetic-By-groundplanes)\/(releases|issues)(?:\/|$)/i.test(url.pathname)?url.href:null;
  }
  return ['groundplanes.com','neuron-ops.enchantingflora5.chatgpt.site','huggingface.co','buy.stripe.com','donate.stripe.com','billing.stripe.com','checkout.stripe.com','invoice.stripe.com','pay.stripe.com','water.org'].includes(url.hostname)?url.href:null;
 } catch {return null;}
}
function assetPath(url){const u=new URL(url);if(!isLocal(url))throw Error('Untrusted origin');const name=decodeURIComponent(u.pathname);if(name.includes('\\')||name.split('/').includes('..')||name.includes('\0'))throw Error('Invalid path');return name==='/'?'index.html':name.replace(/^\//,'')}
module.exports={ORIGIN,isLocal,externalURL,assetPath};
