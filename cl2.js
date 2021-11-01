const DHT = require('@hyperswarm/dht')
const net = require('net')

const serverKeyPair = DHT.keyPair(Buffer.from('524ad00b147e1709e7fd99e2820f8258fd30ed043c631233ac35e17f9ec10333', 'hex'))
const clientKeyPair = DHT.keyPair(Buffer.from('c7f7b6cc2cd1869a4b8628deb49efc992109c9fbdfa55ab1cfa528117fff9acd', 'hex'))

const node = new DHT({ keyPair: clientKeyPair })

const peer = node.connect(serverKeyPair.publicKey)

peer.on('open', function () {
  console.log('peer', peer.rawStream.remoteAddress + ':' + peer.rawStream.remotePort)

  peer.on('error', console.error)

  // const socket = net.connect(peer.rawStream.remotePort, peer.rawStream.remoteAddress)
  // peer.write()
  // socket.emit('error', new Error('random'))
  // throw new Error('random')

  process.exit()
})
