const { hyperkeys, errorAndExit } = require('../util.js')

module.exports = command

async function command (name) {
  name = (name || '').trim()

  if (!name) errorAndExit('Name is required')

  const existed = hyperkeys.exists(name)
  if (existed.publicKey || existed.secretKey || existed.seedKey) {
    errorAndExit('Name already exists')
  }

  hyperkeys.create(name)
  const exists = hyperkeys.exists(name)
  const keys = hyperkeys.get(name)

  console.log('Generating new keys.')
  console.log('Your seed key has been saved in ' + exists.seedKey)
  console.log('The public key is:')
  console.log(keys.publicKey.toString('hex'))
}
