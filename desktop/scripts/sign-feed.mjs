import fs from 'node:fs/promises';import crypto from 'node:crypto';
if(!process.env.AGENETIC_UPDATE_SIGNING_KEY)throw Error('Update signing key is required.');
const files=[];for(const name of (await fs.readdir('release')).filter(n=>/\.(exe|yml|blockmap)$/.test(n))){const data=await fs.readFile('release/'+name);files.push({name,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')})}
const body=JSON.stringify({format:'agenetic-release/1',version:JSON.parse(await fs.readFile('package.json')).version,files});
const signature=crypto.sign(null,Buffer.from(body),process.env.AGENETIC_UPDATE_SIGNING_KEY).toString('base64');await fs.writeFile('release/signed-manifest.json',JSON.stringify({body,signature},null,2));
