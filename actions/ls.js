const { hyperkeys, errorAndExit } = require('../util.js')

module.exports = command

async function command () {
  const { keyPairs, knownKeys } = hyperkeys.list()

  console.log('My key pairs:')
  for (const { name, publicKey } of keyPairs) {
    console.log(name, publicKey.toString('hex'))
  }
  if (!keyPairs.length) {
    console.log('None')
  }

  console.log()

  console.log('Known peers:')
  for (const { name, publicKey } of knownKeys) {
    console.log(name, publicKey.toString('hex'))
  }
  if (!knownKeys.length) {
    console.log('None')
  }
}
