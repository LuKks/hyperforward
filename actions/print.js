const { hyperkeys, errorAndExit } = require('../util.js')

module.exports = command

async function command (name) {
  name = (name || '').trim()

  if (!name) errorAndExit('Name is required')

  const keys = hyperkeys.get(name)
  if (!keys.publicKey) errorAndExit('The public key not exists')
  if (keys.publicKey.length !== 32) errorAndExit('The public key should be 32 bytes (ie. 64 length in hex) but it is ' + publicKey.length)
  // + maybe this integrity check about the length should be directly in hyperkeys

  console.log('The public key is:')
  console.log(keys.publicKey.toString('hex'))
}
