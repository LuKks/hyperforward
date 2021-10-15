#!/usr/bin/env node
const argv = require('minimist')(process.argv.slice(2));

let command = argv._[0];
if (argv.R && argv.peers) {
  command = 'remote';
} else if (argv.L && argv.connect) {
  command = 'local';
} else if (argv.D && argv.peers) {
  command = 'dynamic-remote';
} else  if (argv.D && argv.connect) {
  command = 'dynamic-local';
}

require('./' + command + '.js');
