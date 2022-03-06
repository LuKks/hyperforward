const DHT = require('@hyperswarm/dht')
const pump = require('pump')

const keyPairServer = {
  publicKey: Buffer.from('169c072f92ea4390cafdf4f6dcfa50f5945ec3a998c0a2f02ce7e89cdcd442d3', 'hex'),
  secretKey: Buffer.from('f163075924c53f46e33483b823b5ef19b2084bf9997db3984f18191d6a6709ba169c072f92ea4390cafdf4f6dcfa50f5945ec3a998c0a2f02ce7e89cdcd442d3', 'hex')
}
const keyPairClient = {
  publicKey: Buffer.from('19900889ffeefd5b822428825a7b8e97eb4fa6354635b48c8091926e7b8a7d76', 'hex'),
  secretKey: Buffer.from('3dd33a460693d334799ec06b2727ca8a5bc12ad0d5db259a18ed6b954a8a6e2c19900889ffeefd5b822428825a7b8e97eb4fa6354635b48c8091926e7b8a7d76', 'hex')
}

main()

async function main () {
  const node = new DHT()

  process.once('SIGINT', function () {
    node.destroy().then(function () {
      process.exit()
    })
  })

  await node.ready()

  const server = node.createServer()
  server.on('connection', socket => pump(socket, socket))
  await server.listen(keyPairServer)
}

function waitForEvent (eventName, emitter) {
  return new Promise(resolve => emitter.once(eventName, resolve))
}

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
