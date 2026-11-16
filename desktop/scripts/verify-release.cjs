const {readdirSync, readFileSync} = require('node:fs');
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
}
main().catch(error => {
 console.error(error.message);
 process.exitCode = 1;
});
