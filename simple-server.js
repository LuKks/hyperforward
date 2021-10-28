const DHT = require('@hyperswarm/dht')
const net = require('net')
const express = require('express')
const pump = require('pump')
const crypto = require('crypto')
const channels = require('stream-channels')

const serverKeyPair = DHT.keyPair(Buffer.from('524ad00b147e1709e7fd99e2820f8258fd30ed043c631233ac35e17f9ec10333', 'hex'))
const clientKeyPair = DHT.keyPair(Buffer.from('c7f7b6cc2cd1869a4b8628deb49efc992109c9fbdfa55ab1cfa528117fff9acd', 'hex'))
const topic = Buffer.from('484d2f4bb623129fb9cc9625971f70aa37381216f8c4908af44c74b1ca9935b1', 'hex')

setup()

async function setup () {
  const remoteForward = { address: '127.0.0.1', port: '3000' }

  await startRemote(remoteForward)

  await startServer({ remoteForward })
}

// server
async function startServer ({ remoteForward }) {
  // local bootstrap
  // const bootstrap = new DHT({ bind: 8331 })
  // await bootstrap.ready()
  // console.log('bootstrap ready', bootstrap.address())

  const node = new DHT({
    keyPair: serverKeyPair
  })
  await node.ready()
  console.log('node ready', node.port, node.address())

  const server = node.createServer({
    firewall: function (remotePublicKey, remoteHandshakePayload) {
      console.log('on firewall, public key:\n' + remotePublicKey.toString('hex'), remoteHandshakePayload)
      return !remotePublicKey.equals(clientKeyPair.publicKey)
    }
  })

  server.on('connection', function (peer) {
    const raw = peer.rawStream
    console.log('peer', raw.remoteAddress + ':' + raw.remotePort, '(' + raw.remoteFamily + ')')

    peer.on('data', console.log)

    // const remote = net.connect(remoteForward.port, remoteForward.address)
    // pump(peer, remote, peer)
  })

  await server.listen(serverKeyPair)
  console.log('server ready', server.address())
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
