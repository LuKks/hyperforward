const Hyperkeys = require('hyperkeys')
const Hyperforward = require('../index.js')
const goodbye = require('graceful-goodbye')
const { hyperkeys, parseHostname, name2keys, errorAndExit } = require('../util.js')

module.exports = command

async function command (hostname, options = {}) {
  // + windows: replace to keep only alphanumeric chars
  hostname = (hostname || '').trim()
  const name = (options.key || '').trim()
  let serverPublicKey = (options.connect || '').trim()

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

  serverPublicKey = name2keys(serverPublicKey)[0]
  if (!serverPublicKey) errorAndExit('--connect is required (name or public key)')

  const hyperforward = new Hyperforward()
  const server = await hyperforward.local(keys, hostname, serverPublicKey)
  console.log('Ready to use, listening on:', server.address().address + ':' + server.address().port)

  goodbye(async function () {
    server.close() // + optionally: could wait for 'close' event? and/or add graceful-http
    await hyperforward.dht.destroy()
  })
}
