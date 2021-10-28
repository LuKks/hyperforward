const Hyperswarm = require('hyperswarm');
const DHT = require('@hyperswarm/dht');
const noise = require('@lukks/noise-network');
const net = require('net');
const fs = require('fs');
const pump = require('pump');
const { onFirewall, maybeKeygen, addSocketLogs, serverClose, sleep } = require('./util.js');

process.env.DEBUG = 'p2p';
const debug = require('debug')('p2p');

const serverKeyPair = {
  publicKey: Buffer.from('9425dcb79c1eb89c4ec7f346610eb1c23e3eb73a07e852b71f60bd5a36514f0e', 'hex'),
  secretKey: Buffer.from('6a629df6f04b026bf4c87fba9c40dfd20cf7b4e3f479278f045a05cbcb96a6739425dcb79c1eb89c4ec7f346610eb1c23e3eb73a07e852b71f60bd5a36514f0e', 'hex')
}
const clientKeyPair = {
  publicKey: Buffer.from('14b80ff4aaf92e4334c4c6700ef7f3a4b332ea632de94acbae08f04f30ad03e1', 'hex'),
  secretKey: Buffer.from('b881f4fa9f6231ca37d7bd28d0851cf9194fd97d3423c97f7e2ff4815072c35814b80ff4aaf92e4334c4c6700ef7f3a4b332ea632de94acbae08f04f30ad03e1', 'hex')
}

// setup
(async () => {
  await startRemote();

  /*const node = new DHT({ bootstrap: [] });
  node.on('bootstrap', () => debug('node bootstrap'));
  node.on('listening', () => debug('node listening', node.host, node.port, node.firewalled));*/

  const remoteForward = { address: '127.0.0.1', port: '3000' };
  await startServer({ remoteForward });
})();

// remote (can be anything)
function startRemote () {
  return new Promise(resolve => {
    const app = require('express')();
    app.use((req, res, next) => debug('req incoming') & next());
    app.get('/', (req, res) => res.send('Hello World! ' + Math.random()));
    app.listen(3000, '127.0.0.1', resolve);
  });
}

// server
async function startServer ({ remoteForward }) {
  const node = new DHT({
    ephemeral: false,
    // adaptive: false,
    // bind: 50001
  });
  await node.ready();
  debug('address', node.address());

  // create a server to listen for secure connections
  const server = node.createServer({
    firewall: onFirewall([clientKeyPair.publicKey])
  });

  server.on('connection', function (peer) {
    addSocketLogs('peer', peer, ['error', 'connect', 'handshake', 'connected', 'open', 'timeout', 'end'/*, 'drain'*/, 'finish', 'close']);

    console.log('----------');
    // debug('peer', peer);
    debug('peer', peer.rawStream.remoteAddress + ':' + peer.rawStream.remotePort, '(' + peer.rawStream.remoteFamily + ')');

    // node.addNode({ host: peer.rawStream.remoteAddress, port: peer.rawStream.remotePort });

    let remote = net.connect(remoteForward.port, remoteForward.address);
    addSocketLogs('remote', remote, ['error', 'timeout', 'end', 'finish', 'close']);

    pump(peer, remote, peer);
  });

  // this makes the server accept connections on this keypair
  await server.listen(serverKeyPair);
  debug('address after listen', node.address());
  // debug('nodes after listen', node.toArray());
}
