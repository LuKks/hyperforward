#!/usr/bin/env node

const { Command } = require('commander')

const list = ['remote', 'local', 'keygen', 'add', 'rm', 'print', 'ls', 'migrate']
const actions = {}
for (const name of list) {
  actions[name] = require('./actions/' + name + '.js')
}

const program = new Command()
const package = require('./package.json')

program
  .name('hyperforward')
  .description('CLI to forward P2P E2E encrypted connections')
  .version(package.version, '-v, --version', 'Output the current version')
  // .action(async function () {})

program.command('remote')
  .description('Create a P2P server that forwards to a remote hostname')
  .argument('<hostname>', 'ie. 127.0.0.1:3000')
  .option('--key <name>', 'Name (server keys)')
  .option('--firewall <names or public keys>', 'Names or public keys comma separated (clients allowance)')
  .action(actions.remote)

program.command('local')
  .description('Create a local server that forwards to a P2P server')
  .argument('<hostname>', 'ie. 127.0.0.1:3000')
  .option('--key <name>', 'Name (client keys)')
  .option('--connect <name or public key>', 'Name or public key of server')
  .action(actions.local)

program.command('keygen')
  .description('Create a seed key by name')
  .argument('<name>', 'Name')
  .action(actions.keygen)

program.command('add')
  .description('Add a known public key by name')
  .argument('<name>', 'Name')
  .argument('<public key>', 'Public key')
  .action(actions.add)

program.command('rm')
  .description('Remove a key by name')
  .argument('<name>', 'Name')
  .action(actions.rm)

program.command('print')
  .description('Print the public key by name')
  .argument('<name>', 'Name')
  .action(actions.print)

program.command('ls')
  .description('List my own keys and known peers')
  .action(actions.ls)

program.command('migrate')
  .description('Migrate old keys to the new directory and format')
  .option('--old-dir <old path>', 'Old directory path where keys are at')
  .action(actions.migrate)

program.parseAsync()
