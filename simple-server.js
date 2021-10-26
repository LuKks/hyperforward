const DHT = require('@hyperswarm/dht')
const net = require('net')
const express = require('express')
const pump = require('pump')

const serverKeyPair = DHT.keyPair(Buffer.from('524ad00b147e1709e7fd99e2820f8258fd30ed043c631233ac35e17f9ec10333', 'hex'))
const clientKeyPair = DHT.keyPair(Buffer.from('c7f7b6cc2cd1869a4b8628deb49efc992109c9fbdfa55ab1cfa528117fff9acd', 'hex'))

setup()

async function setup () {
  const remoteForward = { address: '127.0.0.1', port: '3000' }

  await startRemote(remoteForward)

  await startServer({ remoteForward })
}

// server
async function startServer ({ remoteForward }) {
  const node = new DHT({
    ephemeral: false,
    keyPair: serverKeyPair
  })
  await node.ready()
  console.log('node ready', node.address())

  const server = node.createServer({
    firewall: function (remotePublicKey, remoteHandshakePayload) {
      console.log('on firewall, allowed public key:\n' + remotePublicKey.toString('hex'), remoteHandshakePayload)
      return !remotePublicKey.equals(clientKeyPair.publicKey)
    }
  })

  server.on('connection', function (peer) {
    console.log('peer', peer.rawStream.remoteAddress + ':' + peer.rawStream.remotePort, '(' + peer.rawStream.remoteFamily + ')')

    const remote = net.connect(remoteForward.port, remoteForward.address)
    pump(peer, remote, peer)
  })

  await server.listen(serverKeyPair)
  console.log('address after listen', node.address())
}

// remote (can be anything)
function startRemote (remoteForward) {
  return new Promise(resolve => {
    const app = express()
    app.use((req, res, next) => console.log('req incoming') & next())
    app.get('/', (req, res) => res.send('Hello World! ' + Math.random()))
    app.listen(remoteForward.port, remoteForward.address, resolve)
  })
}
