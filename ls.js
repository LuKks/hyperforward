const fs = require('fs')
const os = require('os')
const argv = require('minimist')(process.argv.slice(2))

const path = os.homedir() + '/.hyperforward/'

if (!fs.existsSync(path)) {
  fs.mkdirSync(path, { recursive: true });
}

const files = getFiles(os.homedir() + '/.hyperforward/')
const publicKeys = files.filter(file => file.endsWith('.pub')).map(publicKey => publicKey.substring(0, publicKey.length - 4))
const secretKeys = files.filter(file => !file.endsWith('.pub'))

// my key pairs (keys with private key)
console.log('My key pairs:')

for (let i = 0; i < secretKeys.length; i++) {
  const path = os.homedir() + '/.hyperforward/'
  const name = secretKeys[i]
  const publicKey = fs.readFileSync(path + name + '.pub', 'utf8').trim()
  console.log((i + 1) + ')', name, publicKey)
}

if (!secretKeys.length) {
  console.log('None')
}

console.log()

// known peers (keys without private key)
console.log('Known peers:')
let hasKnownPeers = false

for (let i = 0; i < publicKeys.length; i++) {
  const path = os.homedir() + '/.hyperforward/'
  const name = publicKeys[i]
  const hasSecretKey = secretKeys.indexOf(name) > -1

  if (!hasSecretKey) {
    hasKnownPeers = true

    const publicKey = fs.readFileSync(path + name + '.pub', 'utf8').trim()
    console.log((i + 1) + ')', name, publicKey)
  }
}

if (!hasKnownPeers) {
  console.log('None')
}

function getFiles (source) {
  return fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => !dirent.isDirectory())
    .map(dirent => dirent.name)
}
