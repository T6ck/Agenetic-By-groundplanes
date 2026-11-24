const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {makeCommunity, callbackTokens} = require('../community.cjs');

const scope='a'.repeat(64);
const tokens=(access='first',lifetime=3600)=>({access_token:access,refresh_token:'refresh-'+access,expires_at:Math.floor(Date.now()/1000)+lifetime});
const account={signedIn:true,scope,email:'reader@example.test'};
const storage={isEncryptionAvailable:()=>true,encryptString:v=>Buffer.from(v).map(x=>x^91),decryptString:b=>b.map(x=>x^91).toString()};
function fixture(t,send){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'agenetic-community-'));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  return {directory,open:()=>makeCommunity({directory,storage,send})};
}
const request=(route='/api/community',init)=>new Request('agenetic://app'+route,init);

test('only reads credentials from the expected callback fragment',()=>{
  const value=tokens(),fragment=new URLSearchParams(value).toString();
  const link='agenetic://auth/callback#'+fragment;
  assert.deepEqual(callbackTokens(link),value);
  for(const value of [link.replace('#','?'),link.replace('auth/','app/'),link+'&access_token=another','agenetic://auth/callback#expires_at=300'])assert.equal(callbackTokens(value),null);
});

test('confirmed callback survives restart, reads and writes carry bearer, sign-out restores guest',async t=>{
  const calls=[],f=fixture(t,async(url,opts)=>{
    calls.push({url,...opts});
    return Response.json(url.endsWith('/session')?account:{posts:[]});
  });
  const client=f.open(),value=tokens();
  await client.accept(value,async()=>false);
  assert.deepEqual(fs.readdirSync(f.directory),[]);
  await client.accept(value,async email=>email===account.email);
  assert.ok(!fs.readFileSync(path.join(f.directory,'community-session.bin')).includes('refresh-first'));
  const reopened=f.open();
  for(const req of [request('/api/session'),request('/api/community?channel=ideas'),request('/api/community',{method:'POST',body:'{"title":"test"}'}),request('/api/community',{method:'DELETE',body:'{"id":"1"}'})]){
    const response=await reopened.handle(req);
    assert.equal(response.status,200);assert.ok(calls.at(-1).url.startsWith('https://groundplanes.com/api/community'));
    assert.equal(calls.at(-1).headers.Authorization,'Bearer first');assert.equal(calls.at(-1).redirect,'error');
  }
  reopened.logout();
  assert.equal((await (await f.open().handle(request('/api/session'))).json()).signedIn,false);
  await f.open().handle(request());assert.equal(calls.at(-1).headers.Authorization,undefined);
});

test('concurrent requests share one refresh and a 401 retries with the new token',async t=>{
  let refreshes=0,force401=false;
  const client=fixture(t,async(url,opts)=>{
    if(url.endsWith('/session'))return Response.json(account);
    if(url.endsWith('/refresh')){refreshes++;await new Promise(r=>setImmediate(r));return Response.json(tokens('renewed'+refreshes));}
    if(force401){force401=false;return Response.json({error:'Expired'},{status:401});}
    return Response.json({ok:true});
  }).open();
  await client.accept(tokens('near-expiry',30),async()=>true);
  await Promise.all([client.handle(request()),client.handle(request())]);
  assert.equal(refreshes,1);
  force401=true;
  assert.equal((await client.handle(request())).status,200);assert.equal(refreshes,2);
});

test('sign-out during refresh cannot restore a session or publish as another account',async t=>{
  let unblock, started;
  const pending=new Promise(r=>started=r);
  const client=fixture(t,async url=>{
    if(url.endsWith('/session'))return Response.json(account);
    if(url.endsWith('/refresh')){started();await new Promise(r=>unblock=r);return Response.json(tokens('late'));}
    assert.fail('unexpected write');
  }).open();
  await client.accept(tokens('old',5),async()=>true);
  const result=client.handle(request('/api/community',{method:'POST',body:'{}'}));await pending;
  client.logout();unblock();assert.equal((await result).status,409);
  assert.equal((await (await client.handle(request('/api/session'))).json()).scope,'guest');
});
