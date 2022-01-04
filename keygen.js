const DHT = require('@hyperswarm/dht')
const fs = require('fs')
const os = require('os')
const argv = require('minimist')(process.argv.slice(2))

console.log('Generating public/secret noise key pair.')
// + Enter file in which to save the key (/home/lucas/.ssh/id_rsa):
// + Enter passphrase (empty for no passphrase):
// + Enter same passphrase again: 
// Your identification has been saved in customname
// Your public key has been saved in customname.pub
// The key fingerprint is:

const name = (argv._[1] || '').trim()
if (!name.length) {
  throw new Error('Name is required')
}
if (name.length > 21) {
  throw new Error('Name max length must be 21')
}

const path = os.homedir() + '/.hyperforward/'

if (fs.existsSync(path + name + '.pub')) {
  throw new Error('The public key already exists (' + path + name + '.pub)')
}
if (fs.existsSync(path + name)) {
  throw new Error('The secret key already exists (' + path + name + ')')
}

// + encrypt secret key with password?
const keyPair = DHT.keyPair()
const secretKey = keyPair.secretKey.toString('hex')
const publicKey = keyPair.publicKey.toString('hex')

fs.writeFileSync(path + name, secretKey + '\n')
fs.writeFileSync(path + name + '.pub', publicKey + '\n')

console.log('Your identification has been saved in ' + path + name)
console.log('Your public key has been saved in ' + path + name + '.pub')
console.log('The public key is:')
console.log(publicKey)
