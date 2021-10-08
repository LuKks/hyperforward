#!/usr/bin/env node

const argv = require('minimist')(process.argv.slice(2));

console.log(argv);

let command = argv._[0];
if (argv.R) {
  command = 'reverse';
} else if (argv.L && !argv.S && !argv.M) {
  command = 'local';
} else if (argv.L && argv.M) {
  command = 'localmultiple';
} else if (argv.L && argv.S) {
  command = 'localsmart';
}

require('./' + command + '.js');
