const fs = require('fs');
const argv = require('minimist')(process.argv.slice(2));
const homedir = require('os').homedir();

let name = (argv._[1] || '').trim();
if (!name.length) {
  throw new Error('Name is required');
}
if (name.length > 21) {
  throw new Error('Name max length must be 21');
}

let files = getFiles(homedir + '/.ssh/');
let publicKeys = files.filter(file => file.startsWith('noise_') === 0 && file.endsWith('.pub'));
let secretKeys = files.filter(file => file.startsWith('noise_') === 0 && !file.endsWith('.pub'));

console.log('List of my pair keys: (only prints public keys)');
for (let publicKey of publicKeys) {
  let secretKey = publicKey.substr(0, publicKey.length - 4);
  let hasSecretKey = secretKeys.indexOf(secretKey) > -1;
  if (hasSecretKey) {
    console.log(publicKey);
  }
}

console.log('List of known peers:');
for (let publicKey of publicKeys) {
  let secretKey = publicKey.substr(0, publicKey.length - 4);
  let hasSecretKey = secretKeys.indexOf(secretKey) > -1;
  if (!hasSecretKey) {
    console.log(publicKey);
  }
}

function getFiles (source) {
  return fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => !dirent.isDirectory())
    .map(dirent => dirent.name);
}
