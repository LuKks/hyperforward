const DHT = require('@hyperswarm/dht')
const fs = require('fs')
const os = require('os')

module.exports = {
  maybeKeygen,
  parseAddressPort,
  parsePeers
}

function maybeKeygen (name) {
  if (!name) {
    return DHT.keyPair()
  }

  const path = os.homedir() + '/.hyperforward/'

  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true })
  }

  return {
    publicKey: Buffer.from(fs.readFileSync(path + name + '.pub', 'utf8').trim(), 'hex'),
    secretKey: Buffer.from(fs.readFileSync(path + name, 'utf8').trim(), 'hex')
  }
}

function parseAddressPort (hostname) {
  let [address, port] = hostname.split(':') // => [ '127.0.0.1', '4001' ]
  // valid ports: [tcp: 1-65535] [udp: 0-65535 (optional)]
  // + should support udp port with --udp
  port = parseInt(port)
  if (!address || !port) {
    return -1 // invalid address:port
  }
  if (port < 1 || port > 65535) {
    return -2 // invalid port range
  }
  return { address, port }
}

function parsePeers (names) {
  if (!names) {
    return -1
  }

  names = names.split(',') // => [ 'crst' ]
  names = names.map(name => {
    if (name === '*' || name.length > 21) {
      return name
    }

    const path = os.homedir() + '/.hyperforward/'

    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, { recursive: true })
    }

    const publicKey = fs.readFileSync(path + name + '.pub', 'utf8')
    return Buffer.from(publicKey.trim(), 'hex')
  })

  return names
}
