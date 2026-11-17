import assert from 'node:assert/strict';
import {execFileSync, spawn} from 'node:child_process';
import {existsSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {createRequire} from 'node:module';

const {isLocal} = createRequire(import.meta.url)('../security.cjs');
import {setTimeout as wait} from 'node:timers/promises';

const version = process.env.VERSION;
const run = Number(version.match(/-beta\.(\d+)$/)?.[1]);
const github = args => execFileSync('gh', args, {encoding:'utf8', timeout:180000});
const tags = JSON.parse(github(['release','list','--limit','100','--json','tagName,isDraft']));
const previous = tags
 .filter(tag => !tag.isDraft)
 .map(({tagName}) => [tagName, Number(tagName.match(/^v\d+\.\d+\.\d+-beta\.(\d+)$/)?.[1])])
 .filter(([,number]) => number < run)
 .sort((a,b) => b[1]-a[1])[0]?.[0];
if (!previous) {
 console.log('First signed beta. The next signed beta will exercise installation and automatic update.');
 process.exit(0);
}

const temp = process.env.RUNNER_TEMP;
const target = join(temp,'agenetic-upgrade');
const executable = join(target,'Agenetic.exe');
const installer = 'Agenetic-Setup-' + previous.slice(1) + '-x64.exe';
github(['release','download',previous,'--pattern',installer,'--dir',temp]);
execFileSync(join(temp,installer), ['/S','/D='+target], {stdio:'inherit', timeout:180000});
assert.ok(existsSync(executable), 'Silent installation did not produce Agenetic.exe');

let port = 9321;
const payload = join(target,'resources','app.asar');
const previousPayload = statSync(payload).mtimeMs;
const {GH_TOKEN: _token, ...childEnvironment} = process.env;

async function retry(operation, timeout, interval = 1000) {
 const start = Date.now();
 while (Date.now()-start < timeout) {
  const result = await operation();
  if (result) return result;
  await wait(interval);
 }
 throw new Error('Timed out after ' + timeout/1000 + ' seconds');
}

async function findPage(processHandle) {
 return retry(async () => {
  if (processHandle.exitCode !== null) throw new Error('Agenetic exited before the window loaded');
  try {
   const result = await fetch('http://127.0.0.1:'+port+'/json/list', {signal:AbortSignal.timeout(1000)});
   const pages = await result.json();
   return pages.find(page => page.type === 'page' && isLocal(page.url));
  } catch { return null; }
 },45000);
}

async function evaluate(page, expression, timeout = 10000) {
 return new Promise((resolve,reject) => {
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  const timer = setTimeout(() => finish(new Error('Agenetic did not answer the update check')),timeout);
  function finish(error,value) {
   clearTimeout(timer);
   if (socket.readyState < WebSocket.CLOSING) socket.close();
   if (error) reject(error);
   else resolve(value);
  }
  socket.addEventListener('open', () => socket.send(JSON.stringify({
   id:1, method:'Runtime.evaluate', params:{expression,awaitPromise:true,returnByValue:true}
  })));
  socket.addEventListener('message', event => {
   const message = JSON.parse(event.data);
   if (message.id !== 1) return;
   if (message.error || message.result?.exceptionDetails) finish(new Error('Agenetic renderer evaluation failed'));
   else finish(null,message.result.result.value);
  });
  socket.addEventListener('error', () => finish(new Error('Could not connect to Agenetic renderer')));
 });
}

const launch = () => spawn(executable,['--remote-debugging-port='+port,'--remote-debugging-address=127.0.0.1'],{stdio:['ignore','inherit','inherit'],env:{...childEnvironment,ELECTRON_ENABLE_LOGGING:'1'}});
let app = launch();
try {
 const page = await findPage(app);
 const check = 'window.ageneticDesktop.checkUpdate()';
 const starting = await evaluate(page,check,240000);
 assert.equal(starting.version,previous.slice(1));
 const ready = await retry(async () => {
  const status = await evaluate(page,check,240000);
  console.log(status.message);
  return status.message.startsWith('Update ready.');
 },240000,5000);
 assert.ok(ready,'Signed update did not download');
 await evaluate(page,'setTimeout(() => window.close(), 250); true');
 await retry(() => app.exitCode !== null,30000);
 // NSIS updates the installed app after Electron exits.
 await retry(async () => {
  try {
   return statSync(payload).mtimeMs !== previousPayload;
  } catch { return false; }
 },120000,3000);
 // The previous DevTools socket can remain reserved briefly after Windows exits.
 port++;
 app = launch();
 const installed = await evaluate(await findPage(app),check,45000);
 assert.equal(installed.version,version,'Relaunch should report the newly installed version');
 console.log('Automatic update verified from ' + previous + ' to v' + version);
} finally {
 if (app.exitCode === null) app.kill();
}
