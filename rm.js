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

let existPublicKey = fs.existsSync(homedir + '/.ssh/noise_' + name + '.pub');
let existSecretKey = fs.existsSync(homedir + '/.ssh/noise_' + name);
if (!existPublicKey && !existSecretKey) {
  throw new Error('The pair keys not exists (' + homedir + '/.ssh/noise_' + name + ' and .pub)');
}

if (existPublicKey) {
  try {
    fs.unlinkSync(homedir + '/.ssh/noise_' + name + '.pub');
    console.log('Public key is now deleted');
  } catch (err) {
    console.error(err);
  }
}

if (existSecretKey) {
  try {
    fs.unlinkSync(homedir + '/.ssh/noise_' + name);
    console.log('Secret key is now deleted');
  } catch (err) {
    console.error(err);
  }
}
