const fs = require('fs');
const noisePeer = require('noise-peer');
const argv = require('minimist')(process.argv.slice(2));
const homedir = require('os').homedir();

// # to print a public key:
// hyperforward print crst
// => e52fc62ec5ac755f5e6fb41f86db8bdea44a5fa918c44dbf3d4c1a0b1872130f

let name = (argv._[1] || '').trim();
if (!name.length) {
  throw new Error('hyperforward-print: name is required');
}
if (name.length > 21) {
  throw new Error('hyperforward-print: name max length must be 21');
}
name = 'noise' + (name ? '_' + name : '');

if (!fs.existsSync(homedir + '/.ssh/' + name + '.pub')) {
  throw new Error('hyperforward-print: public key not exists (' + homedir + '/.ssh/' + name + '.pub)');
}

let publicKey = fs.readFileSync(homedir + '/.ssh/' + name + '.pub', 'utf8').trim();
if (publicKey.length !== 64) {
  throw new Error('hyperforward-print: public key must be 64 length of hex');
}

console.log('public key of', name + ':');;
console.log(publicKey);
