const fs = require('fs')
const path = require('path')
const os = require('os')
const { hyperkeys, errorAndExit } = require('../util.js')

module.exports = command

async function command (options) {
  let dir = (options.oldDir || '').trim()

  // old dir
  if (!dir) dir = path.join(os.homedir(), '.hyperforward')

  const files = getFiles(dir)
  const cache = {}

  for (let name of files) {
    const isPublicKey = name.endsWith('.pub')
    if (isPublicKey) {
      name = name.substring(0, name.length - 4)
    }

    if (cache[name]) continue
    if (!cache[name]) cache[name] = true

    const publicKey = readFileSync(path.join(dir, name + '.pub'))
    const secretKey = readFileSync(path.join(dir, name))

    const exists = hyperkeys.exists(name)

    if (publicKey && !exists.publicKey) {
      hyperkeys.set(name, { publicKey })
    }

    if (secretKey && !exists.secretKey) {
      hyperkeys.set(name, { secretKey })
    }

    // this is a bit confusing but it just to avoid doing double logs
    if (publicKey && secretKey && !exists.publicKey && !exists.secretKey) {
      console.log('Migrating public and secret key', name)
    } else if (publicKey && !exists.publicKey) {
      console.log('Migrating public key', name)
    } else if (secretKey && !exists.secretKey) {
      console.log('Migrating secret key', name)
    }

    if (publicKey && secretKey && exists.publicKey && exists.secretKey) {
      console.log('Could not migrate (' + name + ') public and secret key, the name is already used in the new directory.')
    } else if (publicKey && exists.publicKey) {
      console.log('Could not migrate (' + name + ') public key, the name is already used in the new directory.')
    } else if (secretKey && exists.secretKey) {
      console.log('Could not migrate (' + name + ') secret key, the name is already used in the new directory.')
    }
  }

  console.log()
  console.log('Done.')
  console.log('Manually check if everything is ok then delete the old directory.')
  console.log('OLD directory:', dir)
  console.log('NEW directory:', hyperkeys.dir)
}

function readFileSync (filename) {
  try {
    const content = fs.readFileSync(filename, 'utf8')
    return Buffer.from(content, 'hex')
  } catch (error) {
    return null
  }
}

function getFiles (source) {
  return fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => !dirent.isDirectory())
    .map(dirent => dirent.name)
}
