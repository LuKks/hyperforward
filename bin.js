#!/usr/bin/env node
const argv = require('minimist')(process.argv.slice(2))

let command = argv._[0]

if (argv.R && argv.allow) {
  command = 'remote'
} else if (argv.L && argv.connect) {
  command = 'local'
}

try {
  require('./' + command + '.js')
} catch (error) {
  console.error('Error:', error.message)
}
