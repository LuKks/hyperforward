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

if (fs.existsSync(path + name)) {
  throw new Error('Can\'t add or change a public key already paired with a secret key (' + path + name + ')')
}

const publicKey = (argv._[2] || '').trim()
if (publicKey.length !== 64) {
  throw new Error('The public key must be 64 length of hex')
}

const alreadyExists = fs.existsSync(path + name + '.pub')
fs.writeFileSync(path + name + '.pub', publicKey + '\n', 'utf8')

console.log('The ' + (alreadyExists ? 'new' : '') + 'public key is named:')
console.log('[' + name + '] (' + publicKey + ')')
