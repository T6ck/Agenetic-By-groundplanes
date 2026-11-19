const MAX_REQUEST_BYTES=16_100_000;
const actions=new Set(['teams','status','create_team','invite','accept','remove','revoke_invite',
 'key_create','key_revoke','project_get','project_put','model_put','entitlement','support',
 'checkout','seats','portal','invoices']);

export async function readTeamRequest(request) {
 const tooLarge=()=>new RangeError('Team workflow requests can be up to 16 MB.');
 if(Number(request.headers.get('content-length'))>MAX_REQUEST_BYTES)throw tooLarge();
 const reader=request.body?.getReader();
 if(!reader)throw Error('Choose a team action.');
 const parts=[],decoder=new TextDecoder();
 let bytes=0;
 try{
  while(true){
   const {value,done}=await reader.read();
   if(done)break;
   bytes+=value.byteLength;
   if(bytes>MAX_REQUEST_BYTES){await reader.cancel();throw tooLarge()}
   parts.push(decoder.decode(value,{stream:true}));
  }
 }finally{reader.releaseLock()}
 parts.push(decoder.decode());
 let body;
 try{body=JSON.parse(parts.join(''))}catch{throw Error('The team request could not be read.')}
 if(!body||!actions.has(body.action))throw Error('Choose a supported team action.');
 if(body.action!=='project_put'&&bytes>1_100_000)throw new RangeError('Request exceeds 1 MB.');
 return body;
}
