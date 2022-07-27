const { hyperkeys, errorAndExit } = require('../util.js')

module.exports = command

async function command (name) {
  name = (name || '').trim()

  if (!name) errorAndExit('Name is required')

  const existed = hyperkeys.exists(name)
  if (!existed.publicKey && !existed.secretKey && !existed.seedKey) {
    errorAndExit('The key name does not exists')
  }

  hyperkeys.remove(name)

  if (existed.publicKey) console.log('Public key is now deleted:', existed.publicKey)
  if (existed.secretKey) console.log('Secret key is now deleted:', existed.secretKey)
  if (existed.seedKey) console.log('Seed key is now deleted:', existed.seedKey)
}
