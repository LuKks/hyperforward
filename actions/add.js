const { hyperkeys, errorAndExit } = require('../util.js')

module.exports = command

async function command (name, publicKey) {
  name = (name || '').trim()
  publicKey = (publicKey || '').trim()

  if (!name) errorAndExit('Name is required')
  if (!publicKey) errorAndExit('Public key is required')
  if (publicKey.length !== 64) errorAndExit('The public key must be 64 length of hex')

  // avoid overwrite conflict
  const exists = hyperkeys.exists(name)
  const keys = hyperkeys.get(name)
  if (keys.seedKey || keys.secretKey) errorAndExit('Can\'t add or change a public key with already a seed or secret key')

  hyperkeys.set(name, { publicKey: Buffer.from(publicKey, 'hex') })

  console.log('The ' + (exists.publicKey ? 'overwritten ' : '') + 'public key is named:')
  console.log('[' + name + '] (' + publicKey + ')')
}
