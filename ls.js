const fs = require('fs');
const argv = require('minimist')(process.argv.slice(2));
const homedir = require('os').homedir();

let files = getFiles(homedir + '/.ssh/');
let publicKeys = files.filter(file => file.startsWith('noise_') && file.endsWith('.pub'));
let secretKeys = files.filter(file => file.startsWith('noise_') === 0 && !file.endsWith('.pub'));

console.log('List of my pair keys: (only prints public keys)');
let myPairKeys = false;
for (let publicKey of publicKeys) {
  let name = publicKey.substring(6, publicKey.length - 4);
  let secretKey = publicKey.substring(0, publicKey.length - 4);
  let hasSecretKey = secretKeys.indexOf(secretKey) > -1;
  if (hasSecretKey) {
    myPairKeys = true;
    console.log(name);
  }
}
if (!myPairKeys) {
  console.log('Empty');
}
console.log();

console.log('List of known peers:');
let knownPeers = false;
for (let publicKey of publicKeys) {
  let name = publicKey.substring(6, publicKey.length - 4);
  let secretKey = publicKey.substring(0, publicKey.length - 4);
  let hasSecretKey = secretKeys.indexOf(secretKey) > -1;
  if (!hasSecretKey) {
    knownPeers = true;
    console.log(name);
  }
}
if (!knownPeers) {
  console.log('Empty');
}

function getFiles (source) {
  return fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => !dirent.isDirectory())
    .map(dirent => dirent.name);
}
