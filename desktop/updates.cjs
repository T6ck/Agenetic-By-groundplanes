const {execFile}=require('node:child_process');
function verifyInstaller(file,thumbprints,run=execFile){
 return new Promise(resolve=>{
  const pins=(thumbprints||[]).filter(x=>/^[A-Fa-f0-9]{40}$/.test(x)).map(x=>x.toUpperCase());
  if(!pins.length)return resolve('No trusted release signer configured.');
  const script="$s=Get-AuthenticodeSignature -LiteralPath $env:AGENETIC_VERIFY_FILE; @{status=[string]$s.Status; thumbprint=[string]$s.SignerCertificate.Thumbprint}|ConvertTo-Json -Compress";
  run('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout:30000,env:{...process.env,AGENETIC_VERIFY_FILE:file}},(error,stdout)=>{
   if(error)return resolve('Windows signature verification failed.');
   try{const s=JSON.parse(stdout);resolve(s.status==='Valid'&&pins.includes(String(s.thumbprint).toUpperCase())?null:'Installer signer is invalid or untrusted.')}catch{resolve('Invalid signature verification response.')}
  });
 });
}
function configureUpdates(updater,release,{packaged,platform,setTimer=setInterval}={}){
 if(!packaged||platform!=='win32'||!release?.signed||!release.signerThumbprints?.length)return {check:async()=>({message:'Automatic updates require a signed Windows release.'}),stop(){}};
 updater.autoDownload=true;updater.autoInstallOnAppQuit=true;updater.allowDowngrade=false;updater.allowPrerelease=false;updater.disableWebInstaller=true;
 updater.verifyUpdateCodeSignature=(_names,file)=>verifyInstaller(file,release.signerThumbprints);
 // Pinned electron-updater 6 otherwise skips verification when publisherName is missing.
 updater.verifySignature=file=>verifyInstaller(file,release.signerThumbprints);
 let busy=false,status='Automatic updates enabled.';
 updater.on('error',()=>{status='Update unavailable. Your current version is unchanged.'});
 updater.on('update-downloaded',()=>{status='Update ready. It will install when you close Agenetic.'});
 async function check(){if(busy)return {message:status};busy=true;try{await updater.checkForUpdates()}catch{status='Update unavailable. Your current version is unchanged.'}finally{busy=false}return {message:status}}
 const timer=setTimer(()=>void check(),6*60*60*1000);timer.unref?.();void check();
 return {check,stop(){clearInterval(timer)}};
}
module.exports={verifyInstaller,configureUpdates};
