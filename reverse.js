const noise = require('noise-network');
const net = require('net');
const fs = require('fs');
const { parsePeers, parseAddressPort, mimic, onstatickey, maybeKeygen, endAfterServerClose, serverClose, addNoiseLogs } = require('./util.js');
const { Listen, Remote, Connect, Local } = require('./index.js');
const argv = require('minimist')(process.argv.slice(2));
const homedir = require('os').homedir();

// clean args
argv.from = (argv.from || '').trim();
argv.peers = (argv.peers || '').trim();
argv.R = (argv.R || '').trim();
argv.D = (argv.D || '').trim();

// states
let isDynamic = !argv.R && argv.D && argv.peers;
let isRandom = !argv.from;

// parse and validate args
argv.from = maybeKeygen(argv.from);

argv.R = parseAddressPort(argv.R);
if (argv.R === 1) throw new Error('-R is invalid (address:port)');
if (argv.R === 2) throw new Error('-R port range is invalid (1-65535)');

argv.peers = parsePeers(argv.peers);
if (argv.peers === 1) throw new Error('--peers is required (name or public key, comma separated)');

// + maybe start a lookup for Client in case it already exists to connect even faster

const server = Remote(argv.from, argv.R, argv.peers, function () {
  console.log('The ' + (isRandom ? 'temporal ' : '') + 'public key is:');
  console.log(server.publicKey.toString('hex'));

  // let serverAddress = server.address();
  // console.log('Listening on:', serverAddress.address + ':' + serverAddress.port);
});

// + what happens if Remote lost internet? --reconnect

process.once('SIGINT', function () {
  console.log(Date.now(), 'SIGINT');
  serverClose(server, { isNoise: true, timeoutExit: 1000 });
});
