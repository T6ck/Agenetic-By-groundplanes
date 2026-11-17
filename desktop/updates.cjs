const {execFile}=require('node:child_process');
const {resolve: absolutePath}=require('node:path');
function verifyInstaller(file,thumbprints,run=execFile,profileEku=''){
 return new Promise(resolve=>{
  const pins=(thumbprints||[]).filter(x=>/^[A-Fa-f0-9]{40}$/.test(x)).map(x=>x.toUpperCase());
  const azureProfile = /^1\.3\.6\.1\.4\.1\.311\.97\.(?:[0-9]+\.){3}[0-9]+$/.test(profileEku);
  if(!azureProfile&&!pins.length)return resolve('No trusted release signer configured.');
  const script = [
   '$ErrorActionPreference="Stop"',
   '$s=Get-AuthenticodeSignature -LiteralPath $env:AGENETIC_VERIFY_FILE -ErrorAction Stop',
   'if (!$s) { throw "No Authenticode result for $env:AGENETIC_VERIFY_FILE" }',
   '$eku=@($s.SignerCertificate.Extensions | Where-Object {$_.Oid.Value -eq "2.5.29.37"} | ForEach-Object {([System.Security.Cryptography.X509Certificates.X509EnhancedKeyUsageExtension]::new($_, $_.Critical)).EnhancedKeyUsages} | ForEach-Object {$_.Value})',
   '@{status=[string]$s.Status; thumbprint=[string]$s.SignerCertificate.Thumbprint; eku=$eku; timestamped=[bool]$s.TimeStamperCertificate}|ConvertTo-Json -Compress'
  ].join('; ');
  // Windows PowerShell must resolve its own built-in modules, including on a PowerShell 7 host.
  const env = {...process.env, AGENETIC_VERIFY_FILE:absolutePath(file)};
  for (const key of Object.keys(env)) {
   if (key.toLowerCase() === 'psmodulepath') delete env[key];
  }
  run('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true,timeout:30000,env},(error,stdout)=>{
   if(error)return resolve('Windows could not read the installer signature.');
   try {
    const signature = JSON.parse(stdout);
    const matchesSigner = azureProfile
      ? signature.timestamped === true && Array.isArray(signature.eku) && signature.eku.includes(profileEku)
      : !profileEku && pins.includes(String(signature.thumbprint).toUpperCase());
    if (signature.status !== 'Valid') return resolve('Windows signature status: ' + signature.status);
    if (azureProfile && !signature.timestamped) return resolve('Installer signature has no trusted timestamp.');
    resolve(matchesSigner ? null : 'Installer signature is from an unexpected signing profile or certificate.');
   } catch { resolve('Invalid signature verification response.'); }
  });
 });
}
function configureUpdates(updater,release,{packaged,platform,setTimer=setInterval}={}){
 if(!packaged||platform!=='win32'||!release?.signed||release.development||!(release.signingProfileEku||release.signerThumbprints?.length))return {check:async()=>({message:'Automatic updates require a signed Windows release.'}),install:()=>false,stop(){}};
 const beta = release.channel === 'beta';
 if (beta) updater.channel = 'beta';
 updater.allowPrerelease = beta;
 // Assign the downgrade guard after channel selection. The updater's channel setter enables downgrades.
 updater.allowDowngrade = false;
 updater.autoDownload = true;
 updater.autoInstallOnAppQuit = true;
 updater.disableWebInstaller = true;
 updater.disableDifferentialDownload = true;
 updater.verifyUpdateCodeSignature=(_names,file)=>verifyInstaller(file,release.signerThumbprints,undefined,release.signingProfileEku);
 // Pinned electron-updater 6 otherwise skips verification when publisherName is missing.
 updater.verifySignature=file=>verifyInstaller(file,release.signerThumbprints,undefined,release.signingProfileEku);
 let pending, ready=false, status='Automatic updates enabled.';
 updater.on('checking-for-update',()=>{status='Checking GitHub for updates…';});
 updater.on('update-not-available',()=>{status='Agenetic is up to date.';});
 updater.on('update-available',info=>{status='Downloading Agenetic '+info.version+'…';});
 updater.on('error',()=>{status='Update unavailable. Your current version is unchanged.'});
 updater.on('update-downloaded',()=>{ready=true;status='Update ready. It will install when you close Agenetic.'});
 async function check(){
  if (!pending && !ready) {
   pending = Promise.resolve().then(()=>updater.checkForUpdates()).then(result=>result?.downloadPromise).catch(()=>{
    status='Update unavailable. Your current version is unchanged.';
   }).finally(()=>{pending=null;});
  }
  await pending;
  return {message:status,ready};
 }
 const timer=setTimer(()=>void check(),60*60*1000);timer.unref?.();void check();
 return {check,install(){if(!ready)return false;updater.quitAndInstall();return true;},stop(){clearInterval(timer)}};
}
module.exports={verifyInstaller,configureUpdates};
