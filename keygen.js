const fs = require('fs');
const noisePeer = require('noise-peer');
const argv = require('minimist')(process.argv.slice(2));
const os = require('os');

// # create your main pair keys:
// hyperforward keygen
// => will generate ~/.ssh/noise.pub and ~/.ssh/noise

// # to create more pair keys in the same system need to set a name (like srv, lks, crst, etc):
// hyperforward keygen srv
// => will generate ~/.ssh/noise_srv.pub and ~/.ssh/noise_srv

let name = (argv._[1] || '').trim();
if (name.length > 21) {
  throw new Error('hyperforward-keygen: name max length must be 21');
}
name = 'noise' + (name ? '_' + name : '');

const homedir = os.homedir();

if (fs.existsSync(homedir + '/.ssh/' + name + '.pub')) {
  throw new Error('hyperforward-keygen: public key already exists (' + homedir + '/.ssh/' + name + '.pub)');
}
if (fs.existsSync(homedir + '/.ssh/' + name)) {
  throw new Error('hyperforward-keygen: secret key already exists (' + homedir + '/.ssh/' + name + ')');
}

let pairKeys = noisePeer.keygen();
// + encrypt secret key with password

let publicKey = pairKeys.publicKey.toString('hex');
let secretKey = pairKeys.secretKey.toString('hex');

fs.writeFileSync(homedir + '/.ssh/' + name + '.pub', publicKey, 'utf8');
fs.writeFileSync(homedir + '/.ssh/' + name, secretKey, 'utf8');
