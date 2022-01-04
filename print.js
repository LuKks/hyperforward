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

if (!fs.existsSync(path + name + '.pub')) {
  throw new Error('The public key not exists (' + path + name + '.pub)')
}

const publicKey = fs.readFileSync(path + name + '.pub', 'utf8').trim()
if (publicKey.length !== 64) {
  throw new Error('The public key must be 64 length of hex')
}

console.log('The public key is:')
console.log(publicKey)
