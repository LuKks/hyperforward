const DHT = require('@hyperswarm/dht')
const net = require('net')
const fetch = require('node-fetch')
const pump = require('pump')
const crypto = require('crypto')
const Mplex = require('libp2p-mplex')
const noisePeer = require('noise-peer')

const serverKeyPair = DHT.keyPair(Buffer.from('524ad00b147e1709e7fd99e2820f8258fd30ed043c631233ac35e17f9ec10333', 'hex'))
const clientKeyPair = DHT.keyPair(Buffer.from('c7f7b6cc2cd1869a4b8628deb49efc992109c9fbdfa55ab1cfa528117fff9acd', 'hex'))
const topic = Buffer.from('484d2f4bb623129fb9cc9625971f70aa37381216f8c4908af44c74b1ca9935b1', 'hex')

setup()

async function setup () {
  const localForward = { address: '127.0.0.1', port: '3001' }

  const onConnection = await startClientDht({ localForward })
  await startLocal(onConnection, { localForward })

  while (true) {
    simulateRequest(localForward)
    await sleep(1000)
  }
}

// client
async function startClientDht ({ localForward }) {
  const node = new DHT({
    keyPair: clientKeyPair
  })
  await node.ready()
  console.log('node ready', node.address())

  const peer = node.connect(serverKeyPair.publicKey)
  peer.on('open', function () {
    const { rawStream } = peer
    console.log('peer', rawStream.remoteAddress + ':' + rawStream.remotePort, '(' + rawStream.remoteFamily + ')')

    peer.on('data', console.log)

    const socket = net.connect(peer.rawStream.remotePort, peer.rawStream.remoteAddress)
    socket.write('hey!')
    socket.end()
  })

  return

  await sleep(5000)

  return async function (local) {
    console.log('local connection')

    const socket = net.connect(peer.rawStream.remotePort, peer.rawStream.remoteAddress)
    const noisy = noisePeer(socket, true, {
      pattern: 'XK',
      staticKeyPair: clientKeyPair,
      remoteStaticKey: serverKeyPair.publicKey
    })
    noisy.write('hey!')
    noisy.end()

    peer.write('hey')

    // pump(peer, local, peer)
  }
}

// local
function startLocal (onConnection, { localForward }) {
  return new Promise(resolve => {
    const tcp = net.createServer()
    tcp.on('close', () => console.log('tcp server closed'))
    tcp.on('connection', onConnection)
    tcp.listen(localForward.port, localForward.address, resolve)
  })
}

async function simulateRequest (localForward) {
  const started = Date.now()
  const response = await fetch('http://' + localForward.address + ':' + localForward.port)
  const data = await response.text()
  console.log(data, 'delay', Date.now() - started, 'ms')
}

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
