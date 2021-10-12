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

if (fs.existsSync(homedir + '/.ssh/noise_' + name)) {
  throw new Error('Can\'t add or change a public key already paired with a secret key (' + homedir + '/.ssh/noise_' + name + ')');
}

let publicKey = (argv._[2] || '').trim();
if (publicKey.length !== 64) {
  throw new Error('The public key must be 64 length of hex');
}

let alreadyExisted = fs.existsSync(homedir + '/.ssh/noise_' + name + '.pub');
fs.writeFileSync(homedir + '/.ssh/noise_' + name + '.pub', publicKey + '\n', 'utf8');

console.log('The ' + (alreadyExisted ? 'new' : '') + 'public key is named:');
console.log('[' + name + '] (' + publicKey + ')');
