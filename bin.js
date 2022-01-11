#!/usr/bin/env node

const Hyperforward = require('./index.js')
const argv = require('minimist')(process.argv.slice(2))

const hyperforward = new Hyperforward()

const bin = {
  keygen () {
    const name = (argv._[1] || '').trim()

    const keyPair = hyperforward.keygen({ format: 'hex' })

    if (!name) {
      console.log('Generating public/secret noise key pair.')
      console.log('The public key is:')
      console.log(keyPair.publicKey)
      console.log('The secret key is:')
      console.log(keyPair.secretKey)
      return
    }

    if (name.length > 21) throw new Error('Name max length must be 21')

    /*
    Generating public/private rsa key pair.
    /home/lucas/.ssh/id_rsa already exists.
    Overwrite (y/n)?
    */

    // avoid overwrite
    const exists = hyperforward.keypath(name)
    if (exists.publicKey) throw new Error('The public key already exists (' + exists.publicKey + ')')
    if (exists.secretKey) throw new Error('The secret key already exists (' + exists.secretKey + ')')

    // write to disk
    hyperforward.keyset(name, keyPair)

    const path = hyperforward.keypath(name)

    console.log('Generating public/secret noise key pair.')
    console.log('Your secret key has been saved in ' + path.secretKey)
    console.log('Your public key has been saved in ' + path.publicKey)
    console.log('The public key is:')
    console.log(keyPair.publicKey)
  },

  add () {
    const name = (argv._[1] || '').trim()
    const publicKey = (argv._[2] || '').trim()

    if (!name) throw new Error('Name is required')
    if (name.length > 21) throw new Error('Name max length must be 21')
    if (publicKey.length !== 64) throw new Error('The public key must be 64 length of hex')

    // avoid overwrite conflict
    const exists = hyperforward.keypath(name)
    if (exists.secretKey) {
      throw new Error('Can\'t add or change a public key already paired with a secret key (' + exists.secretKey + ')')
    }

    // write to disk
    hyperforward.keyset(name, { publicKey })

    console.log('The ' + (exists.publicKey ? 'overwritten ' : '') + 'public key is named:')
    console.log('[' + name + '] (' + publicKey + ')')
  },

  print () {
    const name = (argv._[1] || '').trim()

    if (!name) throw new Error('Name is required')
    if (name.length > 21) throw new Error('Name max length must be 21')

    const exists = hyperforward.keypath(name)
    if (!exists.publicKey) {
      throw new Error('The public key not exists (' + exists.publicKey + ')')
    }

    const keyPair = hyperforward.keyget(name)
    if (keyPair.publicKey.length !== 64) {
      throw new Error('The public key should be 64 length of hex but it is ' + keyPair.publicKey.length)
    }

    console.log('The public key is:')
    console.log(keyPair.publicKey)
  },

  ls () {
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
  },

  rm () {
    const name = (argv._[1] || '').trim()

    if (!name) throw new Error('Name is required')
    if (name.length > 21) throw new Error('Name max length must be 21')

    const existed = hyperforward.keypath(name)
    if (!existed.publicKey && !existed.secretKey) {
      throw new Error('The key pair not exists')
    }

    hyperforward.keyrm(name)

    if (existed.publicKey) console.log('Public key is now deleted:', existed.publicKey)
    if (existed.secretKey) console.log('Secret key is now deleted:', existed.secretKey)
  },

  remote () {
    // clean args // + windows: replace to keep only alphanumeric chars
    let hostname = (argv._[1] || '').trim()
    const name = (argv.key || '').trim()
    let firewall = (argv.firewall || '').trim()

    // parse and validate args
    hostname = Hyperforward.parseHostname(hostname)
    if (hostname === -1) throw new Error('Remote value is invalid (address:port)')
    if (hostname === -2) throw new Error('Remote port range is invalid (1-65535)')

    if (name) {
      const exists = hyperforward.keypath(name)
      if (exists.publicKey && !exists.secretKey) {
        throw new Error('You don\'t have the secret key of ' + name)
      }
      if (!exists.publicKey && !exists.secretKey) {
        throw new Error('The key pair not exists')
      }
    }

    const keyPair = name ? hyperforward.keyget(name) : hyperforward.keygen()

    firewall = hyperforward.name2keys(firewall)

    hyperforward.remote(keyPair, hostname, firewall).then(function () {
      console.log('Use this ' + (!name ? 'temporal ' : '') + 'public key to connect:')
      console.log(keyPair.publicKey.toString('hex'))
      // console.log('Listening on:', server.address().address + ':' + server.address().port)
    })
  },

  local () {
    // clean args // + windows: replace to keep only alphanumeric chars
    let hostname = (argv._[1] || '').trim()
    const name = (argv.key || '').trim()
    let serverPublicKey = (argv.connect || '').trim()

    // parse and validate args
    hostname = Hyperforward.parseHostname(hostname)
    if (hostname === -1) throw new Error('Local value is invalid (address:port)')
    if (hostname === -2) throw new Error('Local port range is invalid (1-65535)')

    if (name) {
      const exists = hyperforward.keypath(name)
      if (exists.publicKey && !exists.secretKey) {
        throw new Error('You don\'t have the secret key of ' + name)
      }
      if (!exists.publicKey && !exists.secretKey) {
        throw new Error('The key pair not exists')
      }
    }

    const keyPair = name ? hyperforward.keyget(name) : hyperforward.keygen()

    serverPublicKey = hyperforward.name2keys(serverPublicKey)[0]
    if (!serverPublicKey) throw new Error('--connect is required (name or public key)')

    hyperforward.local(keyPair, hostname, serverPublicKey).then(function (server) {
      console.log('Ready to use, listening on:', server.address().address + ':' + server.address().port)
    })
  }
}

const command = argv._[0]
try {
  if (!bin[command]) {
    throw new Error('Command not found')
  }

  bin[command]()
} catch (error) {
  console.error('Error:', error.message)
}
