const DHT = require('@hyperswarm/dht')
const net = require('net')
const pump = require('pump')
const bind = require('bind-easy')

const serverKeyPair = DHT.keyPair(Buffer.from('524ad00b147e1709e7fd99e2820f8258fd30ed043c631233ac35e17f9ec10333', 'hex'))
const clientKeyPair = DHT.keyPair(Buffer.from('c7f7b6cc2cd1869a4b8628deb49efc992109c9fbdfa55ab1cfa528117fff9acd', 'hex'))

const node = new DHT({
  keyPair: clientKeyPair
})

setup()

async function setup () {
  await node.ready()

  // local forward
  const server = await bind.tcp(3001)

  server.on('connection', function (socket) {
    pump(socket, node.connect(serverKeyPair.publicKey), socket)
  })

  console.log('Client mode. hyperswarm-http-server available on:')
  console.log('  http://127.0.0.1:' + server.address().port)
}

process.once('SIGINT', function () {
  node.destroy().then(function () {
    process.exit()
  })
})
