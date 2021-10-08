const fs = require('fs');
const noisePeer = require('noise-peer');
const argv = require('minimist')(process.argv.slice(2));
const homedir = require('os').homedir();

// # for easy usage, save your friend's public key with a custom name:
// hyperforward add crst e52fc62ec5ac755f5e6fb41f86db8bdea44a5fa918c44dbf3d4c1a0b1872130f
// => will only generate ~/.ssh/noise_crst.pub

let name = (argv._[1] || '').trim();
if (!name.length) {
  throw new Error('hyperforward-add: name is required');
}
if (name.length > 21) {
  throw new Error('hyperforward-add: name max length must be 21');
}
name = 'noise' + (name ? '_' + name : '');

if (fs.existsSync(homedir + '/.ssh/' + name + '.pub')) {
  throw new Error('hyperforward-add: public key already exists (' + homedir + '/.ssh/' + name + '.pub)');
}

let publicKey = (argv._[2] || '').trim();
if (publicKey.length !== 64) {
  throw new Error('hyperforward-add: public key must be 64 length of hex');
}

fs.writeFileSync(homedir + '/.ssh/' + name + '.pub', publicKey, 'utf8');
