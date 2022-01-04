const fs = require('fs')
const os = require('os')
const argv = require('minimist')(process.argv.slice(2))

const name = (argv._[1] || '').trim()
if (!name.length) {
  throw new Error('Name is required')
}
if (name.length > 21) {
  throw new Error('Name max length must be 21')
}

const path = os.homedir() + '/.hyperforward/'

let existsPublicKey = fs.existsSync(path + name + '.pub')
let existsSecretKey = fs.existsSync(path + name)
if (!existsPublicKey && !existsSecretKey) {
  throw new Error('The pair keys not exists (' + path + name + ' and .pub)')
}

if (existsPublicKey) {
  try {
    fs.unlinkSync(path + name + '.pub')
    console.log('Public key is now deleted:', path + name + '.pub')
  } catch (err) {
    console.error(err)
  }
}

if (existsSecretKey) {
  try {
    fs.unlinkSync(path + name)
    console.log('Secret key is now deleted:', path + name)
  } catch (err) {
    console.error(err);
  }
}
