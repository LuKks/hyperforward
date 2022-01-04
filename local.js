const DHT = require('@hyperswarm/dht')
const net = require('net')
const pump = require('pump')
const bind = require('bind-easy')
const argv = require('minimist')(process.argv.slice(2))
const { maybeKeygen, parseAddressPort, parsePeers } = require('./util.js')

// clean args // + windows: replace to keep only alphanumeric chars
argv.key = (argv.key || '').trim()
argv.L = (argv.L || '').trim()
argv.connect = (argv.connect || '').trim()

// parse and validate args
const myKeyPair = maybeKeygen(argv.key)

const local = parseAddressPort(argv.L)
if (local === -1) throw new Error('-L is invalid (address:port)')
if (local === -2) throw new Error('-L port range is invalid (1-65535)')

const serverPublicKey = parsePeers(argv.connect)
if (serverPublicKey === -1) throw new Error('--connect is required (name or public key, comma separated)')

// setup
const node = new DHT({
  keyPair: myKeyPair
})

main()

async function main () {
  // await node.ready()

  const server = await bind.tcp(local.port)

  server.on('connection', function (socket) {
    pump(socket, node.connect(serverPublicKey[0]), socket)
  })

  console.log('Ready to use, listening on:', server.address().address + ':' + server.address().port)
}

process.once('SIGINT', function () {
  node.destroy().then(function () {
    process.exit()
  })
})
