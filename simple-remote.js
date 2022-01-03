const DHT = require('@hyperswarm/dht')
const net = require('net')
const pump = require('pump')
const bind = require('bind-easy')

const serverKeyPair = DHT.keyPair(Buffer.from('524ad00b147e1709e7fd99e2820f8258fd30ed043c631233ac35e17f9ec10333', 'hex'))
const clientKeyPair = DHT.keyPair(Buffer.from('c7f7b6cc2cd1869a4b8628deb49efc992109c9fbdfa55ab1cfa528117fff9acd', 'hex'))

/*
n pending, readyState, connecting
0 true open false
1 true opening true
2 false open false
3 true closed false
*/

const node = new DHT({
  keyPair: serverKeyPair
})

setup()

async function setup () {
  await node.ready()

  const server = node.createServer()

  server.on('connection', function (socket) {
    console.log('Remote public key', socket.remotePublicKey)
    console.log('Local public key', socket.publicKey) // same as keyPair.publicKey

    pump(socket, net.connect(1090, '127.0.0.1'), socket)
  })

  // const keyPair = DHT.keyPair()
  // console.log('keyPair', keyPair)
  await server.listen(serverKeyPair)
}

process.once('SIGINT', function () {
  node.destroy().then(function () {
    process.exit()
  })
})

/*
async function setup () {
  const node = new DHT({
    keyPair: serverKeyPair
  })
  await node.ready()

  const server = node.createServer()

  server.on('connection', function (socket) {
    console.log('Remote public key', socket.remotePublicKey)
    console.log('Local public key', socket.publicKey) // same as keyPair.publicKey

    // connect
    const remote = new net.Socket()
    remote.connect({ port: 2999, host: '127.0.0.1' })

    // forward data
    socket.on('data', function (chunk) {
      // reconnect
      if (remote.destroyed) {
        console.log('reconnecting remote')
        remote.connect({ port: 2999, host: '127.0.0.1' })
      }

      remote.write(chunk)
    })

    remote.on('data', function (chunk) {
      socket.write(chunk)
    })

    // auto close
    socket.on('close', function () {
      remote.destroy()
    })

    remote.on('end', function () {
      remote.end(function () {
        console.log('remote end callback (1)')
        remote.destroy()
      })
    })

    remote.on('finish', function () {
      console.log('remote finish (2)')
      remote.destroy()
    })

    // destroy on errors
    socket.on('error', function () {
      socket.destroy()
    })

    remote.on('error', function () {
      remote.destroy()
    })
  })

  // const keyPair = DHT.keyPair()
  // console.log('keyPair', keyPair)
  await server.listen(serverKeyPair)
}
*/
