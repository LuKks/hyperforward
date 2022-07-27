const Hyperkeys = require('hyperkeys')

const hyperkeys = new Hyperkeys()

module.exports = {
  hyperkeys,
  parseHostname,
  name2keys,
  errorAndExit
}

function parseHostname (hostname) {
  let [address, port] = hostname.split(':') // => [ '127.0.0.1', '4001' ]
  // valid ports: [tcp: 1-65535] [udp: 0-65535 (optional)]
  // + should support udp port with --udp
  port = parseInt(port)
  if (!address || !port) return -1 // invalid address:port
  if (port < 1 || port > 65535) return -2 // invalid port range
  return { address, port }
}

// name2keys('') // => []
// name2keys(null) // => []
// name2keys(true) // => []
// name2keys('crst') // => [<Buffer ..>]
// name2keys('crst,lukks') // => [<Buffer ..>, <Buffer ..>]
// name2keys(['crst', 'lukks']) // => [<Buffer ..>, <Buffer ..>]
function name2keys (names, opts = {}) {
  if (!names || typeof names === 'boolean') return []

  if (!Array.isArray(names)) {
    names = names.toString() // in case: --firewall 50
    names = names.split(',') // => [ 'crst', 'lukks' ]
  }

  const publicKeys = []

  for (const name of names) {
    const keys = hyperkeys.get(name)

    // key name doesn't exists but it seems like a public key
    if (!keys.publicKey && name.length === 64) {
      publicKeys.push(Buffer.from(name, 'hex'))
      continue
    }

    if (!keys.publicKey) {
      // + opts.prompt
      errorAndExit('Key ' + name + ' not exists')
    }

    publicKeys.push(keys.publicKey)
  }

  return publicKeys
}

function errorAndExit (message) {
  console.error('Error:', message)
  process.exit(1)
}
