const fs = require('fs');
const argv = require('minimist')(process.argv.slice(2));
const homedir = require('os').homedir();

let files = getFiles(homedir + '/.ssh/');
let publicKeys = files.filter(file => file.startsWith('noise_') && file.endsWith('.pub'));
let secretKeys = files.filter(file => file.startsWith('noise_') && !file.endsWith('.pub'));

console.log('My pair keys:');
let myPairKeys = false;
for (let i = 0, count = 0; i < publicKeys.length; i++) {
  let publicKey = publicKeys[i];
  let name = publicKey.substring(6, publicKey.length - 4);
  let secretKey = publicKey.substring(0, publicKey.length - 4);
  let hasSecretKey = secretKeys.indexOf(secretKey) > -1;
  if (hasSecretKey) {
    myPairKeys = true;
    count++;
    let hex = fs.readFileSync(homedir + '/.ssh/noise_' + name + '.pub', 'utf8').trim();
    console.log(count + ')', name, hex);
  }
}
if (!myPairKeys) {
  console.log('None');
}
console.log();

console.log('Known peers:');
let knownPeers = false;
for (let i = 0, count = 0; i < publicKeys.length; i++) {
  let publicKey = publicKeys[i];
  let name = publicKey.substring(6, publicKey.length - 4);
  let secretKey = publicKey.substring(0, publicKey.length - 4);
  let hasSecretKey = secretKeys.indexOf(secretKey) > -1;
  if (!hasSecretKey) {
    knownPeers = true;
    count++;
    let knownPublicKey = fs.readFileSync(homedir + '/.ssh/noise_' + name + '.pub', 'utf8').trim();
    console.log(count + ')', name, knownPublicKey/*filename that holds the public key*/);
  }
}
if (!knownPeers) {
  console.log('None');
}

function getFiles (source) {
  return fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => !dirent.isDirectory())
    .map(dirent => dirent.name);
}
