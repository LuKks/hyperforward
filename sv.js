const DHT = require('@hyperswarm/dht')
const net = require('net')
const express = require('express')
const pump = require('pump')
const utp = require('utp-native')
const noisePeer = require('noise-peer')

const serverKeyPair = {
  publicKey: Buffer.from('ab3a2e881a06dbe1e577f08bb007cf98a38b0c6da8cf348128c02e3ac5c1ca88', 'hex'),
  secretKey: Buffer.from('6be6d3a7f99bb548f536f7ece183361eab9f787398ad6a1b5a55e5a9bf09f756ab3a2e881a06dbe1e577f08bb007cf98a38b0c6da8cf348128c02e3ac5c1ca88', 'hex')
}
const clientKeyPair = {
  publicKey: Buffer.from('e558a55a08009e8b503a5a25afdde15aa4c1cf7349e796a6a7c3b8f938d4b3b4', 'hex'),
  secretKey: Buffer.from('bc1f3fc29f08c0b609e6f83e3258d6cf6984934c00c609273042f151499ab8d8e558a55a08009e8b503a5a25afdde15aa4c1cf7349e796a6a7c3b8f938d4b3b4', 'hex')
}

const noisyServerKeyPair = {
  publicKey: Buffer.from('37b19dcb68c6e13405df5e155381d940945c5df5f5d52e9fa0391f24ff20ca2b', 'hex'),
  secretKey: Buffer.from('2340b47aacfb0e60a2d492769fd545b454388ec2a1838c6a6c9454dc308d7bac', 'hex')
}
const noisyClientKeyPair = {
  publicKey: Buffer.from('5a08a8267a6f709f08cf0b0ff9ab424c44d8464168bfc23ff7a462adcd7f0d4f', 'hex'),
  secretKey: Buffer.from('4f6dce65016b76750c66f086463d57d630c242d7cf915df67b2f16f2d153744d', 'hex')
}

startRemote().then(setup)

async function setup () {
  const tunnel = utp() // + tcp?
  tunnel.listen(7331)

  const node = new DHT({ keyPair: serverKeyPair })
  await node.ready()
  console.log('address()', node.address(), 'host/port', node.host, node.port)

  const server = node.createServer({
    firewall: function (remotePublicKey, remoteHandshakePayload) {
      console.log('on firewall, public key:\n' + remotePublicKey.toString('hex'), remoteHandshakePayload)
      return !remotePublicKey.equals(clientKeyPair.publicKey)
    }
  })

  server.on('connection', function (peer) {
    const { rawStream } = peer
    console.log('peer', rawStream.remoteAddress + ':' + rawStream.remotePort, '(' + rawStream.remoteFamily + ')')

    // keep holepunching
    const intervalId = setInterval(() => {
      // + unencrypted
      // + assumed address?
      // + assumed port
      const buf = Buffer.from('holepunch')
      tunnel.send(buf, 0, buf.length, 7331, rawStream.remoteAddress)
    }, 5000)
    peer.on('close', () => clearInterval(intervalId))
  })

  tunnel.on('connection', function (socket) {
    console.log('tunnel on connection', socket.remoteAddress, socket.remotePort, socket.remoteFamily)

    const noisy = noisePeer(socket, false, {
      pattern: 'XX',
      staticKeyPair: noisyServerKeyPair,
      onstatickey: function (remoteKey, done) {
        if (remoteKey.equals(noisyClientKeyPair.publicKey)) return done()

        return done(new Error('Unauthorized key'))
      }
    })

    noisy.on('connected', function () {
      pump(noisy, socket, noisy)
    })
  })

  await server.listen(serverKeyPair)
  console.log('server listening')
}

// remote (can be anything)
function startRemote () {
  return new Promise(resolve => {
    const app = require('express')();
    app.use((req, res, next) => debug('req incoming') & next());
    app.get('/', (req, res) => res.send('Hello World! ' + Math.random()));
    app.listen(3000, '127.0.0.1', resolve);
  });
}
