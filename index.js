/*
const hyperforward = require('hyperforward')

hyperforward.keygen('lukks')
*/

const DHT = require('@hyperswarm/dht')
const fs = require('fs')
const os = require('os')
const net = require('net')
const pump = require('pump')
const bind = require('bind-easy')
const prompt = require('./like-prompt.js')

// + fs promises
// + avoid checking so much?
// + organization using a "bin" and "lib" folder?

function Hyperforward () {
  if (!(this instanceof Hyperforward)) {
    return new Hyperforward()
  }

	this.path = os.homedir() + '/.hyperforward/'

  // ensure base folder exists
  if (!fs.existsSync(this.path)) {
    fs.mkdirSync(this.path, { recursive: true });
  }
}

Hyperforward.prototype.keygen = function (name) {
  // check format
  if (!name.length) {
    throw new Error('Name is required')
  }
  if (name.length > 21) {
    throw new Error('Name max length must be 21')
  }

  // avoid overwrite
  if (fs.existsSync(this.path + name + '.pub')) {
    throw new Error('The public key already exists (' + this.path + name + '.pub)')
  }
  if (fs.existsSync(this.path + name)) {
    throw new Error('The secret key already exists (' + this.path + name + ')')
  }

  // generate
  const keyPair = DHT.keyPair()
  const secretKey = keyPair.secretKey.toString('hex')
  const publicKey = keyPair.publicKey.toString('hex')

  // save
  fs.writeFileSync(this.path + name, secretKey + '\n')
  fs.writeFileSync(this.path + name + '.pub', publicKey + '\n')

  // + should use "seed" to easily avoid two files, etc

  return { publicKey, secretKey }
}

Hyperforward.prototype.add = function (name, publicKey) {
  // check format
  if (!name.length) {
    throw new Error('Name is required')
  }
  if (name.length > 21) {
    throw new Error('Name max length must be 21')
  }
  if (publicKey.length !== 64) {
    throw new Error('The public key must be 64 length of hex')
  }

  // avoid overwrite conflict
  if (fs.existsSync(this.path + name)) {
    throw new Error('Can\'t add or change a public key already paired with a secret key (' + this.path + name + ')')
  }

  // save
  fs.writeFileSync(this.path + name + '.pub', publicKey + '\n', 'utf8')
}

Hyperforward.prototype.print = function (name) {
  // check format
  if (!name.length) {
    throw new Error('Name is required')
  }
  if (name.length > 21) {
    throw new Error('Name max length must be 21')
  }

  // check if not exists
  if (!fs.existsSync(this.path + name + '.pub')) {
    // throw new Error('The public key not exists (' + this.path + name + '.pub)')
    return null
  }

  // check saved format
  const publicKey = fs.readFileSync(this.path + name + '.pub', 'utf8').trim()
  if (publicKey.length !== 64) {
    throw new Error('The public key should be 64 length of hex but it is ' + publicKey.length)
  }

  return publicKey
}

Hyperforward.prototype.ls = function () {
  const files = getFiles(this.path)
  const publicKeys = files.filter(file => file.endsWith('.pub')).map(publicKey => publicKey.substring(0, publicKey.length - 4))
  const secretKeys = files.filter(file => !file.endsWith('.pub'))

  // my key pairs (keys with private key)
  const myKeyPairs = []

  for (let i = 0; i < secretKeys.length; i++) {
    const name = secretKeys[i]
    const publicKey = fs.readFileSync(this.path + name + '.pub', 'utf8').trim()
    myKeyPairs.push({ name, publicKey })
  }

  // known peers (keys without private key)
  const knownPeers = []

  for (let i = 0; i < publicKeys.length; i++) {
    const name = publicKeys[i]
    const hasSecretKey = secretKeys.indexOf(name) > -1

    if (!hasSecretKey) {
      const publicKey = fs.readFileSync(this.path + name + '.pub', 'utf8').trim()
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

Hyperforward.prototype.rm = function (name) {
  // check format
  if (!name.length) {
    throw new Error('Name is required')
  }
  if (name.length > 21) {
    throw new Error('Name max length must be 21')
  }

  // not exists?
  let existsPublicKey = fs.existsSync(this.path + name + '.pub')
  let existsSecretKey = fs.existsSync(this.path + name)
  if (!existsPublicKey && !existsSecretKey) {
    // throw new Error('The key pair not exists (' + this.path + name + ' and .pub)')
    return { deleted: false, existsPublicKey, existsSecretKey }
  }

  // delete public key in case it exists
  if (existsPublicKey) {
    try {
      fs.unlinkSync(this.path + name + '.pub')
    } catch (error) {
      throw error
    }
  }

  // delete secret key in case it exists
  if (existsSecretKey) {
    try {
      fs.unlinkSync(this.path + name)
    } catch (error) {
      throw error
    }
  }

  return { deleted: true, existsPublicKey, existsSecretKey }
}

Hyperforward.prototype.remote = async function (keyPair, remoteAddress, allowedPeers) {
  // + should have a reusable dht in the constructor?

  // start node
  const node = new DHT({
    keyPair
  })

  // handle ctrl+c
  // + not ready for multiple instances in same process
  process.once('SIGINT', function () {
    node.destroy().then(function () {
      process.exit()
    })
  })

  // await node.ready()

  // remote forward
  const server = node.createServer({
    firewall (remotePublicKey, remoteHandshakePayload) {
      for (const publicKey of allowedPeers) {
        if (publicKey === '*' || remotePublicKey.equals(publicKey)) {
          return false
        }
      }
      return true
    }
  })

  server.on('connection', function (socket) {
    pump(socket, net.connect(remoteAddress.port, remoteAddress.address), socket)
  })

  await server.listen(keyPair)

  return { node, server }
}

Hyperforward.prototype.local = async function (myKeyPair, localAddress, serverPublicKey) {
  // start node
  const node = new DHT({
    keyPair: myKeyPair
  })

  // handle ctrl+c
  // + not ready for multiple instances in same process
  process.once('SIGINT', function () {
    node.destroy().then(function () {
      process.exit()
    })
  })

  // await node.ready()

  // local forward
  const server = await bind.tcp(localAddress.port, { address: localAddress.address, allowAny: false })

  server.on('connection', function (socket) {
    pump(socket, node.connect(Buffer.from(serverPublicKey[0], 'hex')), socket)
  })

  return { node, server }
}

module.exports = Hyperforward()
