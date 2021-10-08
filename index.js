#!/usr/bin/env node

const argv = require('minimist')(process.argv.slice(2));

let command = argv._[0];
if (argv.R) {
  command = 'reverse';
} else if (argv.L) {
  command = 'local';
} else if (argv.LM) {
  command = 'localmultiple';
} else if (argv.LS) {
  command = 'localsmart';
}

require('./' + command + '.js');
