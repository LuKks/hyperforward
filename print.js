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

if (!fs.existsSync(homedir + '/.ssh/noise_' + name + '.pub')) {
  throw new Error('The public key not exists (' + homedir + '/.ssh/noise_' + name + '.pub)');
}

let publicKey = fs.readFileSync(homedir + '/.ssh/noise_' + name + '.pub', 'utf8').trim();
if (publicKey.length !== 64) {
  throw new Error('The public key must be 64 length of hex');
}

console.log('The public key is:');
console.log(publicKey);
