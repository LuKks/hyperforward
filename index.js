const DHT = require('@hyperswarm/dht')
const net = require('net')
const pump = require('pump')

module.exports = class Hyperforward {
  constructor () {
    this.dht = new DHT()
  }

  async remote (keyPair, hostname, publicKeys) {
    const server = this.dht.createServer({
      firewall: parseFirewall(publicKeys)
    })

    server.on('connection', function (socket) {
      pump(socket, net.connect(hostname.port, hostname.address), socket)
    })

    await server.listen(keyPair)

    return server
  }

  async local (keyPair, hostname, serverPublicKey) {
    const server = net.createServer()

    server.on('connection', (socket) => {
      pump(socket, this.dht.connect(serverPublicKey, { keyPair }), socket)
    })

    await listenTCP(server, hostname.port, hostname.address)

    return server
  }
}

// based on bind-easy
function listenTCP (server, port, address) {
  return new Promise(function (resolve, reject) {
    server.on('listening', onlistening)
    server.on('error', done)

    server.listen(port, address)

    function onlistening () {
      done(null)
    }

    function done (err) {
      server.removeListener('listening', onlistening)
      server.removeListener('error', done)

      if (err) reject(err)
      else resolve()
    }
  })
}

// parseFirewall() // () => false
// parseFirewall([]) // () => false
// parseFirewall(['pub1', 'pub2']) // function (..) {..}
function parseFirewall (publicKeys) {
  if (!publicKeys || !publicKeys.length) return () => false

  return function (remotePublicKey, remoteHandshakePayload) {
    for (const publicKey of publicKeys) {
      if (publicKey === '*' || remotePublicKey.equals(publicKey)) {
        return false
      }
    }
    return true
  }
}
