const DHT = require('@hyperswarm/dht')
const net = require('net')
const pump = require('pump')
const bind = require('bind-easy')
const argv = require('minimist')(process.argv.slice(2))
const { maybeKeygen, parseAddressPort, parsePeers } = require('./util.js')

// clean args // + windows: replace to keep only alphanumeric chars
argv.key = (argv.key || '').trim()
argv.R = (argv.R || '').trim()
argv.allow = (argv.allow || '').trim()

// parse and validate args
const myKeyPair = maybeKeygen(argv.key)

const remote = parseAddressPort(argv.R)
if (remote === -1) throw new Error('-R is invalid (address:port)')
if (remote === -2) throw new Error('-R port range is invalid (1-65535)')

const allowedPeers = parsePeers(argv.allow)
if (allowedPeers === -1) throw new Error('--allow is required (*, names or public keys comma separated)')

// setup
const node = new DHT({
  keyPair: myKeyPair
})

main()

async function main () {
  // await node.ready()

  const server = node.createServer({
    firewall (remotePublicKey, remoteHandshakePayload) {
      for (const publicKey of allowedPeers) {
        if (publicKey === '*' || remotePublicKey.equals(publicKey)) {
          return false
        }
      }
      return true
    }
  })

  server.on('connection', function (socket) {
    pump(socket, net.connect(remote.port, remote.address), socket)
  })

  await server.listen(myKeyPair)

  console.log('Use this ' + (!argv.key ? 'temporal ' : '') + 'public key to connect:')
  console.log(myKeyPair.publicKey.toString('hex'))
  // console.log('Listening on:', server.address().address + ':' + server.address().port)
}

process.once('SIGINT', function () {
  node.destroy().then(function () {
    process.exit()
  })
})
