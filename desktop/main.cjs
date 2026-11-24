const {app,BrowserWindow,protocol,net,ipcMain,dialog,shell,session}=require('electron');const {spawn,execFile}=require('node:child_process');const {randomBytes}=require('node:crypto');const path=require('node:path');const fs=require('node:fs');const {pathToFileURL}=require('node:url');const {ORIGIN,isLocal,externalURL,assetPath}=require('./security.cjs');
protocol.registerSchemesAsPrivileged([{scheme:'agenetic',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
let window,child,connectionError='',closing=false;
let connectionResolve;const connection=new Promise(resolve=>connectionResolve=resolve);
if(!app.requestSingleInstanceLock())app.quit();
app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.focus()}});
function verify(event){if(!isLocal(event.senderFrame?.url||'')||event.senderFrame!==event.sender.mainFrame)throw Error('Untrusted caller')}
async function startCompanion(){const root=app.isPackaged?process.resourcesPath:__dirname;const exe=path.join(root,'runtime',process.platform==='win32'?'agenetic-companion.exe':'agenetic-companion');if(!fs.existsSync(exe)){connectionError='Companion missing. Build the desktop runtime before packaging.';connectionResolve({error:connectionError});return}
 const key=randomBytes(32).toString('base64url'),args=['--desktop','--origin',ORIGIN,'--port','0','--models-dir',path.join(app.getPath('userData'),'models')];const llama=path.join(root,'runtime',process.platform==='win32'?'llama-cli.exe':'llama-cli');if(fs.existsSync(llama))args.push('--llama-cli',llama);
 child=spawn(exe,args,{windowsHide:true,env:{...process.env,AGENETIC_SESSION_KEY:key},stdio:['ignore','pipe','pipe']});let buffer='',settled=false;const timeout=setTimeout(()=>{connectionError='Companion startup timed out.';connectionResolve({error:connectionError});child?.kill()},45000);
 child.stdout.on('data',chunk=>{buffer+=chunk.toString();if(buffer.length>8192)buffer=buffer.slice(-8192);for(const line of buffer.split('\n')){try{const info=JSON.parse(line);if(!settled&&info.event==='ready'&&Number.isInteger(info.port)&&info.port>0&&info.port<65536){settled=true;clearTimeout(timeout);connectionResolve({base:'http://127.0.0.1:'+info.port,key})}}catch{}}});
 child.on('error',()=>{clearTimeout(timeout);connectionError='Companion could not start.';connectionResolve({error:connectionError})});child.on('exit',()=>{clearTimeout(timeout);connectionError='Companion stopped. Restart Agenetic to reconnect.';connectionResolve({error:connectionError});if(!closing&&window)dialog.showMessageBox(window,{type:'error',message:connectionError})});child.stderr.on('data',()=>{});
}
// The renderer picks an operation. Only the main process selects a destination or file path.
async function requestCompanion(route, payload, timeout) {
 const ready = await connection;
 if (connectionError || ready.error) return {error: connectionError || ready.error};
 const body = payload === undefined ? undefined : JSON.stringify(payload);
 if (body && Buffer.byteLength(body) > 65536) return {error: 'Companion request is too large.'};
 try {
  const response = await fetch(ready.base + route, {
   method: body === undefined ? 'GET' : 'POST',
   headers: {Origin: ORIGIN, Authorization: 'Bearer ' + ready.key, ...(body === undefined ? {} : {'Content-Type': 'application/json'})},
   body,
   redirect: 'error',
   signal: AbortSignal.timeout(timeout)
  });
  const result = await response.json();
  return response.ok ? result : {error: result.error || 'Companion operation failed.'};
 } catch (error) {
  return {error: error.name === 'TimeoutError'
   ? 'The local companion did not respond before the request timed out.'
   : 'Could not reach the local companion. Restart Agenetic and try again.'};
 }
}
app.whenReady().then(async()=>{
 session.defaultSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));session.defaultSession.setPermissionCheckHandler(()=>false);
 protocol.handle('agenetic',async request=>{try{const u=new URL(request.url);if(!isLocal(u.href))return new Response('Denied',{status:403});if(u.pathname==='/api/session')return Response.json({signedIn:false,scope:'guest',signIn:'https://groundplanes.com/signin?app=agenetic',signOut:'https://groundplanes.com/signin?signout=1'});if(u.pathname==='/api/models'){const {modelCatalog}=await import(pathToFileURL(path.join(__dirname,'renderer/model-catalog.mjs')).href);try{return Response.json(await modelCatalog(u.searchParams))}catch(e){return Response.json({error:e.message},{status:502})}}
 if(u.pathname.startsWith('/api/'))return Response.json({error:'Community opens separately in your browser.'},{status:503});const file=path.resolve(__dirname,'renderer',assetPath(u.href));if(!file.startsWith(path.resolve(__dirname,'renderer')+path.sep))return new Response('Denied',{status:403});return net.fetch(pathToFileURL(file).href)}catch{return new Response('Not found',{status:404})}});
 let pdfParsing = false;
 ipcMain.handle('vault:extract-pdf', async (event, bytes) => {
  verify(event);
  if (!ArrayBuffer.isView(bytes) || bytes.byteLength > 24 * 1024 * 1024) {
   return {error: 'Choose a valid PDF under 24 MiB.'};
  }
  if (pdfParsing) return {error: 'Another PDF is being indexed. Try again after it finishes.'};
  const runtime = app.isPackaged ? process.resourcesPath : __dirname;
  const executable = path.join(runtime, 'runtime', process.platform === 'win32' ? 'agenetic-companion.exe' : 'agenetic-companion');
  pdfParsing = true;
  try {
   return await new Promise(resolve => {
    const child = execFile(executable, ['--extract-pdf'], {
     windowsHide: true, timeout: 30000, maxBuffer: 8 * 1024 * 1024,
     env: {SYSTEMROOT: process.env.SYSTEMROOT, PATH: process.env.PATH, TEMP: process.env.TEMP, TMP: process.env.TMP}
    }, (error, stdout) => {
     if (error) return resolve({error: 'PDF indexing timed out or failed. Try a smaller PDF or a text export.'});
     try {resolve(JSON.parse(stdout));}
     catch {resolve({error: 'The PDF reader returned an invalid result.'});}
    });
    child.stdin.on('error', () => {});
    child.stdin.end(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
   });
  } finally {pdfParsing = false;}
 });
 ipcMain.handle('models:catalog',async(event,values)=>{verify(event);try{const {modelCatalog}=await import(pathToFileURL(path.join(__dirname,'renderer/model-catalog.mjs')).href);const params=new URLSearchParams();for(const key of ['repo','query','revision'])if(typeof values?.[key]==='string')params.set(key,values[key]);return await modelCatalog(params)}catch(e){return {error:e.message}}});
 const runtimeRoutes = new Map([
  ['/models', 30000], ['/hub/search', 30000], ['/hub/inspect', 30000],
  ['/hub/download', 30000], ['/models/activate', 30000], ['/run', 315000],
  ['/cancel', 10000]
 ]);
 ipcMain.handle('models:request', async (event, route, payload) => {
  verify(event);
  if (!runtimeRoutes.has(route)) return {error: 'Unsupported companion operation.'};
  if (route === '/models' ? payload !== undefined : !payload || typeof payload !== 'object' || Array.isArray(payload)) {
   return {error: 'Invalid companion request.'};
  }
  return requestCompanion(route, payload, runtimeRoutes.get(route));
 });
 ipcMain.handle('companion:connection', async event => {
  verify(event);
  return connectionError ? {error: connectionError} : connection;
 });
 ipcMain.handle('companion:choose', async event => {
  verify(event);
  const result = await dialog.showOpenDialog(window, {
   properties: ['openFile'],
   filters: [{name: 'GGUF models', extensions: ['gguf']}]
  });
  if (result.canceled || !result.filePaths.length) return {cancelled: true};
  return requestCompanion('/models/register', {path: result.filePaths[0]}, 30000);
 });
 ipcMain.handle('app:community',event=>{verify(event);return shell.openExternal('https://groundplanes.com/signin?app=agenetic')});ipcMain.handle('app:website',event=>{verify(event);return shell.openExternal('https://groundplanes.com')});
 const releasePath=path.join(process.resourcesPath,'runtime','release.json');
 let release={};try{release=JSON.parse(fs.readFileSync(releasePath,'utf8').replace(/^\uFEFF/,''))}catch{}
 const updates=require('./updates.cjs').configureUpdates(require('electron-updater').autoUpdater,release,{packaged:app.isPackaged,platform:process.platform});
 app.on('before-quit',()=>updates.stop());
 const releaseInfo={version:app.getVersion(),channel:release.development?'development':release.signed?(release.channel||'stable'):'manual preview'};
 ipcMain.handle('app:release',event=>{verify(event);return releaseInfo;});
 ipcMain.handle('app:update',async event=>{verify(event);return {...await updates.check(),...releaseInfo};});
 ipcMain.handle('app:install-update',event=>{verify(event);return updates.install()?{}:{message:'Check for updates and wait for the download first.'};});
 window=new BrowserWindow({width:1440,height:960,minWidth:760,minHeight:640,title:'Agenetic by Groundplanes',backgroundColor:'#f4f7f6',webPreferences:{preload:path.join(__dirname,'preload.cjs'),backgroundThrottling:false,contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});window.removeMenu();window.webContents.on('will-navigate',(event,url)=>{if(!isLocal(url)){event.preventDefault();const safe=externalURL(url);if(safe)shell.openExternal(safe)}});window.webContents.setWindowOpenHandler(({url})=>{const safe=externalURL(url);if(safe)shell.openExternal(safe);return {action:'deny'}});startCompanion();await window.loadURL(ORIGIN+'/');
});
app.on('before-quit',()=>{closing=true;child?.kill()});app.on('window-all-closed',()=>app.quit());
