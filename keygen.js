const fs = require('fs');
const noise = require('noise-network');
const argv = require('minimist')(process.argv.slice(2));
const os = require('os');

console.log('Generating public/secret noise key pair.');
// + Enter file in which to save the key (/home/lucas/.ssh/id_rsa):
// + Enter passphrase (empty for no passphrase):
// + Enter same passphrase again: 
// Your identification has been saved in customname
// Your public key has been saved in customname.pub
// The key fingerprint is:

let name = (argv._[1] || '').trim();
if (!name.length) {
  throw new Error('Name is required');
}
if (name.length > 21) {
  throw new Error('Name max length must be 21');
}

const homedir = os.homedir();

if (fs.existsSync(homedir + '/.ssh/noise_' + name + '.pub')) {
  throw new Error('The public key already exists (' + homedir + '/.ssh/noise_' + name + '.pub)');
}
if (fs.existsSync(homedir + '/.ssh/noise_' + name)) {
  throw new Error('The secret key already exists (' + homedir + '/.ssh/noise_' + name + ')');
}

let pairKeys = noise.keygen();
// + encrypt secret key with password

let secretKey = pairKeys.secretKey.toString('hex');
fs.writeFileSync(homedir + '/.ssh/noise_' + name, secretKey + '\n');
console.log('Your identification has been saved in ' + homedir + '/.ssh/noise_' + name);

let publicKey = pairKeys.publicKey.toString('hex');
fs.writeFileSync(homedir + '/.ssh/noise_' + name + '.pub', publicKey + '\n');
console.log('Your public key has been saved in ' + homedir + '/.ssh/noise_' + name + '.pub');

console.log('The public key is:');
console.log(publicKey);
