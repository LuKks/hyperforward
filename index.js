#!/usr/bin/env node

const argv = require('minimist')(process.argv.slice(2));

// console.log('./' + argv._[0] + '.js');

require('./' + argv._[0] + '.js');
