#!/usr/bin/env node

const hyperforward = require('./index.js')
const fs = require('fs')
const { maybeKeygen, parseAddressPort, parsePeers } = require('./util.js')
const argv = require('minimist')(process.argv.slice(2))

let command = argv._[0]

if (command === 'keygen') {
  console.log('Generating public/secret noise key pair.')

  const name = (argv._[1] || '').trim()

  const { publicKey, secretKey } = hyperforward.keygen(name)

  console.log('Your secret key has been saved in ' + hyperforward.path + name)
  console.log('Your public key has been saved in ' + hyperforward.path + name + '.pub')
  console.log('The public key is:')
  console.log(publicKey)

  return
}

if (command === 'add') {
  const name = (argv._[1] || '').trim()
  const publicKey = (argv._[2] || '').trim()

  const alreadyExists = fs.existsSync(hyperforward.path + name + '.pub')

  hyperforward.add(name, publicKey)

  console.log('The ' + (alreadyExists ? 'overwritten ' : '') + 'public key is named:')
  console.log('[' + name + '] (' + publicKey + ')')

  return
}

if (command === 'print') {
  const name = (argv._[1] || '').trim()

  const publicKey = hyperforward.print(name)
  if (publicKey === null) {
    throw new Error('The public key not exists (' + hyperforward.path + name + '.pub)')
  }

  console.log('The public key is:')
  console.log(publicKey)

  return
}

if (command === 'ls') {
  const { myKeyPairs, knownPeers } = hyperforward.ls()

  console.log('My key pairs:')
  for (const { name, publicKey } of myKeyPairs) {
    console.log(name, publicKey)
  }
  if (!myKeyPairs.length) {
    console.log('None')
  }

  console.log()

  console.log('Known peers:')
  for (const { name, publicKey } of knownPeers) {
    console.log(name, publicKey)
  }
  if (!knownPeers.length) {
    console.log('None')
  }

  return
}

if (command === 'rm') {
  const name = (argv._[1] || '').trim()

  const { deleted, existsPublicKey, existsSecretKey } = hyperforward.rm(name)
  if (!deleted) {
    throw new Error('The key pair not exists (' + hyperforward.path + name + ' and .pub)')
  }

  if (existsPublicKey) {
    console.log('Public key is now deleted:', hyperforward.path + name + '.pub')
  }
  if (existsSecretKey) {
    console.log('Secret key is now deleted:', hyperforward.path + name)
  }

  return
}

if (command === 'remote') {
  // clean args // + windows: replace to keep only alphanumeric chars
  const remoteHost = (argv._[1] || '').trim()
  argv.key = (argv.key || '').trim()
  argv.firewall = (argv.firewall || '').trim()

  // parse and validate args
  const myKeyPair = maybeKeygen(argv.key)

  const remoteAddress = parseAddressPort(remoteHost)
  if (remoteAddress === -1) throw new Error('Remote value is invalid (address:port)')
  if (remoteAddress === -2) throw new Error('Remote port range is invalid (1-65535)')

  let allowedPeers = parsePeers(argv.firewall)
  if (allowedPeers === -1) {
    // throw new Error('--firewall is required (*, names or public keys comma separated)')
    allowedPeers = ['*']
  }

  main()

  async function main () {
    const { node, server } = await hyperforward.remote(myKeyPair, remoteAddress, allowedPeers)

    console.log('Use this ' + (!argv.key ? 'temporal ' : '') + 'public key to connect:')
    console.log(myKeyPair.publicKey.toString('hex'))
    // console.log('Listening on:', server.address().address + ':' + server.address().port)
  }

  return
}

if (command === 'local') {
  // clean args // + windows: replace to keep only alphanumeric chars
  const localHost = (argv._[1] || '').trim()
  argv.key = (argv.key || '').trim()
  argv.connect = (argv.connect || '').trim()

  // parse and validate args
  const myKeyPair = maybeKeygen(argv.key)

  const localAddress = parseAddressPort(localHost)
  if (localAddress === -1) throw new Error('Local value is invalid (address:port)')
  if (localAddress === -2) throw new Error('Local port range is invalid (1-65535)')

  const serverPublicKey = parsePeers(argv.connect)
  if (serverPublicKey === -1) throw new Error('--connect is required (name or public key, comma separated)')

  main()

  async function main () {
    const { node, server } = await hyperforward.local(myKeyPair, localAddress, serverPublicKey)

    console.log('Ready to use, listening on:', server.address().address + ':' + server.address().port)
  }

  return
}

throw new Error('Command not found')
