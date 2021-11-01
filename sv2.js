const DHT = require('@hyperswarm/dht')
const net = require('net')

const serverKeyPair = DHT.keyPair(Buffer.from('524ad00b147e1709e7fd99e2820f8258fd30ed043c631233ac35e17f9ec10333', 'hex'))
const clientKeyPair = DHT.keyPair(Buffer.from('c7f7b6cc2cd1869a4b8628deb49efc992109c9fbdfa55ab1cfa528117fff9acd', 'hex'))

const node = new DHT({ keyPair: serverKeyPair })

const server = node.createServer({
  firewall: function (remotePublicKey, remoteHandshakePayload) {
    console.log('on firewall, public key:\n' + remotePublicKey.toString('hex'))
    return !remotePublicKey.equals(clientKeyPair.publicKey)
  }
})

server.on('connection', function (peer) {
  console.log('peer', peer.rawStream.remoteAddress + ':' + peer.rawStream.remotePort)
  peer.on('error', console.error)
})

server.listen(serverKeyPair).then(() => console.log('server listening'))
