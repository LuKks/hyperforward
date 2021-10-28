const DHT = require('@hyperswarm/dht')
const net = require('net')
const fetch = require('node-fetch')
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

setup()

async function setup () {
  const tunnel = utp()
  tunnel.on('message', function (buffer, rinfo) {
    console.log('tunnel on message', buffer.toString(), rinfo)
  })
  tunnel.bind(57331)

  const node = new DHT({ keyPair: clientKeyPair })
  await node.ready()
  console.log('address()', node.address(), 'host/port', node.host, node.port)

  const peer = node.connect(serverKeyPair.publicKey)
  peer.on('open', function () {
    const { rawStream } = peer
    console.log('peer', rawStream.remoteAddress + ':' + rawStream.remotePort, '(' + rawStream.remoteFamily + ')')

    // keep holepunching
    holepunch()
    const intervalId = setInterval(holepunch, 5000)
    function holepunch () {
      // + unencrypted
      // + assumed address?
      // + assumed port
      const buf = Buffer.from('holepunch')
      tunnel.send(buf, 0, buf.length, 57331, rawStream.remoteAddress)
    }
    peer.on('close', () => clearInterval(intervalId))
    peer.on('close', () => process.exit())

    const localForward = startLocalForward({ port: 3001, address: '127.0.0.1' }, function (socket) {
      console.log('local forward on connection')

      const started = Date.now()
      const peerTunnel = tunnel.connect(57331, rawStream.remoteAddress)
      const noisy = noisePeer(peerTunnel, true, {
        pattern: 'XX',
        staticKeyPair: noisyClientKeyPair,
        onstatickey: function (remoteKey, done) {
          if (remoteKey.equals(noisyServerKeyPair.publicKey)) return done()

          return done(new Error('Unauthorized key'))
        }
      })

      noisy.on('connected', function () {
        console.log('noisy connected directly', 'delay', Date.now() - started, 'ms')
        pump(noisy, socket, noisy)
      })
    })
    localForward.on('listening', () => console.log('ready to use!'))

    /*await */loop()
  })
}

async function loop () {
  while (true) {
    await simulateRequest({ address: '127.0.0.1', port: 3001 })
    await sleep(3000)
  }
}

function startLocalForward ({ port, address }, onConnection) {
  const tcp = net.createServer()
  tcp.on('close', () => console.log('tcp server closed'))
  tcp.on('connection', onConnection)
  tcp.listen(port, address)
  return tcp
}

async function simulateRequest (localForward) {
  const response = await fetch('http://' + localForward.address + ':' + localForward.port)
  const data = await response.text()
  console.log(data)
}

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
