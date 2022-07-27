const Hyperkeys = require('hyperkeys')
const Hyperforward = require('../index.js')
const goodbye = require('graceful-goodbye')
const { hyperkeys, parseHostname, name2keys, errorAndExit } = require('../util.js')

module.exports = command

async function command (hostname, options = {}) {
  // + windows: replace to keep only alphanumeric chars
  hostname = (hostname || '').trim()
  const name = (options.key || '').trim()
  const firewall = (options.firewall || '').trim()

  hostname = parseHostname(hostname)
  if (hostname === -1) errorAndExit('Remote value is invalid (address:port)')
  if (hostname === -2) errorAndExit('Remote port range is invalid (1-65535)')

  let keys = hyperkeys.get(name)
  if (name) {
    if (keys.publicKey && !keys.secretKey) errorAndExit('You don\'t have the seed or secret key of ' + name)
    if (!keys.publicKey && !keys.secretKey) errorAndExit('The keys does not exists')
  } else {
    keys = Hyperkeys.keyTriad()
  }

  const publicKeys = name2keys(firewall)

  const hyperforward = new Hyperforward()
  const server = await hyperforward.remote(keys, hostname, publicKeys)
  console.log('Use this ' + (!name ? 'temporal ' : '') + 'public key to connect:')
  console.log(keys.publicKey.toString('hex'))
  // console.log('Listening on:', server.address().address + ':' + server.address().port)

  goodbye(async function () {
    await server.close()
    await hyperforward.dht.destroy()
  })
}
