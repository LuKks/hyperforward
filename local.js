const noise = require('noise-network');
const net = require('net');
const fs = require('fs');
const { parsePeers, parseAddressPort, mimic, onstatickey, maybeKeygen, endAfterServerClose, serverClose, addNoiseLogs } = require('./util.js');
const { Listen, Remote, Connect, Local } = require('./index.js');
const argv = require('minimist')(process.argv.slice(2));
const homedir = require('os').homedir();

// clean args
argv.from = (argv.from || '').trim();
argv.connect = (argv.connect || '').trim();
argv.L = (argv.L || '').trim();
argv.D = (argv.D || '').trim();

// states
let isDynamic = !argv.L && argv.D && argv.connect;
let isRandom = !argv.from;

// parse and validate args
argv.from = maybeKeygen(argv.from);

argv.L = parseAddressPort(argv.L);
if (argv.L === 1) throw new Error('-L is invalid (address:port)');
if (argv.L === 2) throw new Error('-L port range is invalid (1-65535)');

argv.connect = parsePeers(argv.connect);
if (argv.connect === 1) throw new Error('--connect is required (name or public key, comma separated)');

// + maybe start a lookup for Remote in case it doesn't exists alert the user

const server = Local(argv.connect[0], argv.L, argv.from, function () {
  console.log('The ' + (isRandom ? 'temporal ' : '') + 'public key is:');
  console.log(argv.from.publicKey.toString('hex'));

  let serverAddress = server.address();
  console.log('Listening on:', serverAddress.address + ':' + serverAddress.port);
});

// + what happens if Local lost internet?--reconnect

process.once('SIGINT', function () {
  console.log(Date.now(), 'SIGINT');
  serverClose(server, { isNoise: false, timeoutExit: 1000 });
});
