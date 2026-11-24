const {readdirSync, readFileSync, writeFileSync} = require('node:fs');
const {createHash} = require('node:crypto');
const {join} = require('node:path');
const {verifyInstaller} = require('../updates.cjs');

async function main() {
 const release = JSON.parse(readFileSync('runtime/release.json', 'utf8').replace(/^\uFEFF/, ''));
 const installers = readdirSync('release').filter(name => name.endsWith('.exe'));
 if (installers.length !== 1) throw new Error('Expected one Windows installer');
 for (const file of [join('release', installers[0]), join('release', 'win-unpacked', 'Agenetic.exe')]) {
  const error = await verifyInstaller(file, release.signerThumbprints, undefined, release.signingProfileEku);
  if (error) throw new Error(file + ': ' + error);
  console.log('Verified Windows signature for ' + file);
 }

 const config = readFileSync(join('release', 'win-unpacked', 'resources', 'app-update.yml'), 'utf8');
 if (!/^provider: github\s*$/m.test(config) || !/^repo: AgeneticByGroundplanes\s*$/m.test(config)) {
  throw new Error('Packaged app is missing its GitHub updater configuration');
 }
 const installer = installers[0];
 const bytes = readFileSync(join('release', installer));
 const sha512 = createHash('sha512').update(bytes).digest('base64');
 const {version} = require('../package.json');
 const manifest = {
  version,
  files:[{url:installer, sha512, size:bytes.byteLength}],
  path:installer,
  sha512,
  releaseDate:new Date().toISOString()
 };
 const channel = release.channel === 'beta' ? 'beta' : 'latest';
 // Derive the update feed from the final, verified installer.
 writeFileSync(join('release', channel+'.yml'), [
  'version: '+manifest.version,
  'files: '+JSON.stringify(manifest.files),
  'path: '+JSON.stringify(manifest.path),
  'sha512: '+JSON.stringify(manifest.sha512),
  'releaseDate: '+JSON.stringify(manifest.releaseDate),
  ''
 ].join('\n'));
}
main().catch(error => {
 console.error(error.message);
 process.exitCode = 1;
});
