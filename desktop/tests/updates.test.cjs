const {test}=require('node:test');const assert=require('node:assert/strict');const {EventEmitter}=require('node:events');const {verifyInstaller,configureUpdates}=require('../updates.cjs');
const pin='A'.repeat(40);
test('signature verifier fails closed on missing signer, OS errors and wrong certificate',async()=>{assert.ok(await verifyInstaller('file',[]));for(const response of [{status:'Valid',thumbprint:'B'.repeat(40)},{status:'NotSigned',thumbprint:pin},null])assert.ok(await verifyInstaller('file',[pin],(_a,_b,_c,cb)=>response?cb(null,JSON.stringify(response)):cb(Error('offline'))));assert.equal(await verifyInstaller('file',[pin],(_a,_b,_c,cb)=>cb(null,JSON.stringify({status:'Valid',thumbprint:pin}))),null)});
test('signed Windows releases check automatically and install on exit',async()=>{const u=new EventEmitter();let calls=0;u.checkForUpdates=async()=>{calls++};const ctl=configureUpdates(u,{signed:true,signerThumbprints:[pin]},{packaged:true,platform:'win32',setTimer:()=>({unref(){}})});await new Promise(r=>setImmediate(r));assert.equal(calls,1);assert.equal(u.autoDownload,true);assert.equal(u.autoInstallOnAppQuit,true);assert.equal(u.allowDowngrade,false);u.emit('update-downloaded');assert.match((await ctl.check()).message,/close Agenetic/)});
test('unsigned builds never check for updates',async()=>{let called=false;const ctl=configureUpdates({checkForUpdates(){called=true}},{signed:false},{packaged:true,platform:'win32'});await ctl.check();assert.equal(called,false)});

test('signed beta selects the beta feed without allowing downgrades',async()=>{
 const updater=new EventEmitter();
 Object.defineProperty(updater,'channel',{set(value){this.selectedChannel=value;this.allowDowngrade=true}});
 updater.checkForUpdates=async()=>{updater.emit('update-not-available')};
 const controls=configureUpdates(updater,{signed:true,channel:'beta',signerThumbprints:[pin]},{packaged:true,platform:'win32',setTimer:()=>({unref(){}})});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(updater.selectedChannel,'beta');
 assert.equal(updater.allowPrerelease,true);
 assert.equal(updater.allowDowngrade,false);
 assert.equal((await controls.check()).message,'Agenetic is up to date.');
});

test('development signing does not activate automatic updates',async()=>{
 const updater={checkForUpdates(){assert.fail('Development build contacted the release feed')}};
 const controls=configureUpdates(updater,{signed:true,development:true,channel:'beta',signerThumbprints:[pin]},{packaged:true,platform:'win32'});
 assert.match((await controls.check()).message,/require a signed Windows release/);
});

test('Azure updater trusts the exact timestamped profile across leaf certificate rotation', async () => {
 const profile = '1.3.6.1.4.1.311.97.11.22.33.44';
 const verify = signature => verifyInstaller('file', [pin],
   (_command, _args, _options, callback) => callback(null, JSON.stringify(signature)), profile);
 const valid = {status:'Valid', timestamped:true, eku:[profile]};
 assert.equal(await verify({...valid, thumbprint:pin}), null);
 assert.equal(await verify({...valid, thumbprint:'B'.repeat(40)}), null);
 assert.ok(await verify({...valid, eku:[profile + '0'], thumbprint:pin}));
 assert.ok(await verify({...valid, timestamped:false}));
 assert.ok(await verify({...valid, status:'NotTrusted'}));
});
