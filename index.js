const DHT = require('@hyperswarm/dht')
const fs = require('fs')
const os = require('os')
const net = require('net')
const pump = require('pump')
const bind = require('bind-easy')
const path = require('path')
const debug = require('debug')('hyperforward')

// + fs promises
// + avoid checking so much?
// + organization using a "bin" and "lib" folder?

// seed: Buffer.alloc(32).fill('aa')

function Hyperforward () {
  if (!(this instanceof Hyperforward)) {
    return new Hyperforward()
  }

  this.node = null
  this.folder = path.join(os.homedir(), '.hyperforward')

  // ensure base folder exists
  if (!fs.existsSync(this.folder)) {
    fs.mkdirSync(this.folder, { recursive: true })
  }
}

Hyperforward.prototype.setupNode = function () {
  if (this.node) {
    return
  }

  this.node = new DHT()

  // handle ctrl+c
  // + temp
  process.once('SIGINT', () => {
    this.node.destroy().then(function () {
      process.exit()
    })
  })
}

// keypath('crst') // => { publicKey: null, secretKey: null }
// keypath('crst') // => { publicKey: '/home/lucas/...', secretKey: null }
Hyperforward.prototype.keypath = function (name) {
  const filename = path.join(this.folder, name)

  let publicKey = fs.existsSync(filename + '.pub') || null
  let secretKey = fs.existsSync(filename) || null

  if (publicKey) publicKey = filename + '.pub'
  if (secretKey) secretKey = filename

  return { publicKey, secretKey }
}

// keyset('crst', { publicKey: '..' }) // writes key to disk
// keyset('crst', { publicKey: <Buffer ..> })
// keyset('crst', { secretKey: '..' })
// keyset('crst', { publicKey: '..', secretKey: '..' })
Hyperforward.prototype.keyset = function (name, keyPair = {}) {
  const filename = path.join(this.folder, name)

  if (keyPair.publicKey) {
    fs.writeFileSync(filename + '.pub', this.buf2hex(keyPair.publicKey) + '\n')
  }

  if (keyPair.secretKey) {
    fs.writeFileSync(filename, this.buf2hex(keyPair.secretKey) + '\n')
  }
}

// keyget('crst') // => { publicKey: null, secretKey: null }
// keyget('crst') // => { publicKey: <Buffer ..>, secretKey: null }
// keyget('crst', { format: 'hex' }) // => { publicKey: '..', secretKey: null }
Hyperforward.prototype.keyget = function (name, opts = {}) {
  let { publicKey, secretKey } = this.keypath(name)

  if (publicKey) publicKey = fs.readFileSync(publicKey, 'utf8').trim()
  if (secretKey) secretKey = fs.readFileSync(secretKey, 'utf8').trim()

  if (opts.format === 'hex') {
    return { publicKey, secretKey }
  }
  return this.hex2buf({ publicKey, secretKey })
}

// keyrm('crst')
Hyperforward.prototype.keyrm = function (name) {
  const { publicKey, secretKey } = this.keypath(name)

  if (publicKey) fs.unlinkSync(publicKey)
  if (secretKey) fs.unlinkSync(secretKey)
}

// keygen() // => { publicKey: <Buffer ..>, secretKey: <Buffer ..> }
// keygen({ format: 'hex' }) // => { publicKey: '..', secretKey: '..' }
Hyperforward.prototype.keygen = function (opts = {}) {
  const keyPair = DHT.keyPair()
  if (opts.format === 'hex') {
    return this.buf2hex(keyPair)
  }
  return keyPair
}

Hyperforward.prototype.buf2hex = function (key) {
  if (key && typeof key === 'object') {
    return {
      publicKey: this.buf2hex(key.publicKey),
      secretKey: this.buf2hex(key.secretKey)
    }
  }

  if (!key) {
    return key
  }

  return typeof key !== 'string' ? key.toString('hex') : key
}

Hyperforward.prototype.hex2buf = function (key) {
  if (key && typeof key === 'object') {
    return {
      publicKey: this.hex2buf(key.publicKey),
      secretKey: this.hex2buf(key.secretKey)
    }
  }

  if (!key) {
    return key
  }

  return typeof key === 'string' ? Buffer.from(key, 'hex') : key
}

// + temp
Hyperforward.prototype.ls = function () {
  const files = getFiles(this.folder)
  const publicKeys = files.filter(file => file.endsWith('.pub')).map(publicKey => publicKey.substring(0, publicKey.length - 4))
  const secretKeys = files.filter(file => !file.endsWith('.pub'))

  // my key pairs (keys with private key)
  const myKeyPairs = []

  for (let i = 0; i < secretKeys.length; i++) {
    const name = secretKeys[i]
    const filename = path.join(this.folder, name)
    const publicKey = fs.readFileSync(filename + '.pub', 'utf8').trim()
    myKeyPairs.push({ name, publicKey })
  }

  // known peers (keys without private key)
  const knownPeers = []

  for (let i = 0; i < publicKeys.length; i++) {
    const name = publicKeys[i]
    const filename = path.join(this.folder, name)
    const hasSecretKey = secretKeys.indexOf(name) > -1

    if (!hasSecretKey) {
      const publicKey = fs.readFileSync(filename + '.pub', 'utf8').trim()
      knownPeers.push({ name, publicKey })
    }
  }

  return { myKeyPairs, knownPeers }

  function getFiles (source) {
    return fs.readdirSync(source, { withFileTypes: true })
      .filter(dirent => !dirent.isDirectory())
      .map(dirent => dirent.name)
  }
}

Hyperforward.prototype.remote = async function (keyPair, hostname, publicKeys) {
  debug('remote keyPair', keyPair)
  debug('remote hostname', hostname)
  debug('remote publicKeys', publicKeys)

  this.setupNode()

  const server = this.node.createServer({
    firewall: Hyperforward.parseFirewall(publicKeys)
  })

  server.on('connection', function (socket) {
    pump(socket, net.connect(hostname.port, hostname.address), socket)
  })

  await server.listen(keyPair)

  return server
}

Hyperforward.prototype.local = async function (keyPair, hostname, serverPublicKey) {
  debug('local keyPair', keyPair)
  debug('local hostname', hostname)
  debug('local serverPublicKey', serverPublicKey)

  this.setupNode()

  const server = await bind.tcp(hostname.port, { address: hostname.address, allowAny: false })

  server.on('connection', (socket) => {
    pump(socket, this.node.connect(serverPublicKey, { keyPair }), socket)
  })

  return server
}

// name2keys('') // => (() => false)
// name2keys(null) // => (() => false)
// name2keys(true) // => (() => false)
// name2keys('crst') // => [<Buffer ..>]
// name2keys('crst,lukks') // => [<Buffer ..>, <Buffer ..>]
// name2keys('crst,lukks', { format: 'hex' }) // => ['..', '..']
// name2keys(['crst', 'lukks']) // => [<Buffer ..>, <Buffer ..>]
Hyperforward.prototype.name2keys = function (keys, opts = {}) {
  if (!keys || typeof keys === 'boolean') {
    return []
  }

  if (!Array.isArray(keys)) {
    keys = keys.toString() // in case: --firewall 50
    keys = keys.split(',') // => [ 'crst', 'lukks' ]
  }

  const publicKeys = []

  for (const key of keys) {
    // public key
    if (key.length > 21) {
      publicKeys.push(this.hex2buf(key))
      continue
    }

    // name
    const { publicKey } = this.keyget(key)
    if (!publicKey) {
      throw new Error('Key ' + key + ' not exists')
    }
    // + opts.prompt

    publicKeys.push(publicKey)
  }

  if (opts.format === 'hex') {
    return publicKeys.map(this.buf2hex)
  }

  return publicKeys
}

// parseFirewall() // () => false
// parseFirewall([]) // () => false
// parseFirewall(['pub1', 'pub2']) // function (..) {..}
Hyperforward.parseFirewall = function (publicKeys) {
  if (!publicKeys || !publicKeys.length) {
    return () => false
  }

  return function (remotePublicKey, remoteHandshakePayload) {
    for (const publicKey of publicKeys) {
      if (publicKey === '*' || remotePublicKey.equals(publicKey)) {
        return false
      }
    }
    return true
  }
}

Hyperforward.parseHostname = function (hostname) {
  let [address, port] = hostname.split(':') // => [ '127.0.0.1', '4001' ]
  // valid ports: [tcp: 1-65535] [udp: 0-65535 (optional)]
  // + should support udp port with --udp
  port = parseInt(port)
  if (!address || !port) {
    return -1 // invalid address:port
  }
  if (port < 1 || port > 65535) {
    return -2 // invalid port range
  }
  return { address, port }
}

module.exports = Hyperforward
