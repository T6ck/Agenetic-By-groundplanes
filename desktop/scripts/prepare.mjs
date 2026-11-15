import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const desktop=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),root=path.resolve(desktop,'..');
await fs.rm(path.join(desktop,'renderer'),{recursive:true,force:true});await fs.mkdir(path.join(desktop,'renderer'),{recursive:true});
await fs.cp(path.join(root,'public'),path.join(desktop,'renderer'),{recursive:true,filter:p=>!p.includes('__pycache__')&&!p.endsWith('.pyc')});
const source=await fs.readFile(path.join(root,'app/workspace-html.ts'),'utf8');let html=JSON.parse(source.replace(/^export default\s*/,'').replace(/;\s*$/,''));
html=html.replace("connect-src 'self' http://127.0.0.1:7871", "connect-src 'self' http://127.0.0.1:*");
await fs.writeFile(path.join(desktop,'renderer/index.html'),html);
