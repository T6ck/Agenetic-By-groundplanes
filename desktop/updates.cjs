const {execFile}=require('node:child_process');
function verifyInstaller(file,thumbprints,run=execFile,profileEku=''){
 return new Promise(resolve=>{
  const pins=(thumbprints||[]).filter(x=>/^[A-Fa-f0-9]{40}$/.test(x)).map(x=>x.toUpperCase());
  const azureProfile = /^1\.3\.6\.1\.4\.1\.311\.97\.(?:[0-9]+\.){3}[0-9]+$/.test(profileEku);
  if(!azureProfile&&!pins.length)return resolve('No trusted release signer configured.');
  const script = [
   '$s=Get-AuthenticodeSignature -LiteralPath $env:AGENETIC_VERIFY_FILE',
   '$eku=@($s.SignerCertificate.Extensions | Where-Object {$_.Oid.Value -eq "2.5.29.37"} | ForEach-Object {$_.EnhancedKeyUsages} | ForEach-Object {$_.Value})',
   '@{status=[string]$s.Status; thumbprint=[string]$s.SignerCertificate.Thumbprint; eku=$eku; timestamped=[bool]$s.TimeStamperCertificate}|ConvertTo-Json -Compress'
  ].join('; ');
  run('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout:30000,env:{...process.env,AGENETIC_VERIFY_FILE:file}},(error,stdout)=>{
   if(error)return resolve('Windows signature verification failed.');
   try {
    const signature = JSON.parse(stdout);
    const matchesSigner = azureProfile
      ? signature.timestamped === true && Array.isArray(signature.eku) && signature.eku.includes(profileEku)
      : !profileEku && pins.includes(String(signature.thumbprint).toUpperCase());
    resolve(signature.status === 'Valid' && matchesSigner ? null : 'Installer signer is invalid or untrusted.');
   } catch { resolve('Invalid signature verification response.'); }
  });
 });
}
function configureUpdates(updater,release,{packaged,platform,setTimer=setInterval}={}){
 if(!packaged||platform!=='win32'||!release?.signed||release.development||!(release.signingProfileEku||release.signerThumbprints?.length))return {check:async()=>({message:'Automatic updates require a signed Windows release.'}),stop(){}};
 const beta = release.channel === 'beta';
 if (beta) updater.channel = 'beta';
 updater.allowPrerelease = beta;
 // Assign the downgrade guard after channel selection. The updater's channel setter enables downgrades.
 updater.allowDowngrade = false;
 updater.autoDownload = true;
 updater.autoInstallOnAppQuit = true;
 updater.disableWebInstaller = true;
 updater.verifyUpdateCodeSignature=(_names,file)=>verifyInstaller(file,release.signerThumbprints,undefined,release.signingProfileEku);
 // Pinned electron-updater 6 otherwise skips verification when publisherName is missing.
 updater.verifySignature=file=>verifyInstaller(file,release.signerThumbprints,undefined,release.signingProfileEku);
 let busy=false,status='Automatic updates enabled.';
 updater.on('checking-for-update',()=>{status='Checking GitHub for updates…';});
 updater.on('update-not-available',()=>{status='Agenetic is up to date.';});
 updater.on('update-available',info=>{status='Downloading Agenetic '+info.version+'…';});
 updater.on('error',()=>{status='Update unavailable. Your current version is unchanged.'});
 updater.on('update-downloaded',()=>{status='Update ready. It will install when you close Agenetic.'});
 async function check(){if(busy)return {message:status};busy=true;try{await updater.checkForUpdates()}catch{status='Update unavailable. Your current version is unchanged.'}finally{busy=false}return {message:status}}
 const timer=setTimer(()=>void check(),60*60*1000);timer.unref?.();void check();
 return {check,stop(){clearInterval(timer)}};
}
module.exports={verifyInstaller,configureUpdates};
