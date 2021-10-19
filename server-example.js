const Hyperswarm = require('hyperswarm');
const DHT = require('@hyperswarm/dht');
const noise = require('@lukks/noise-network');
const net = require('net');
const fs = require('fs');
const pump = require('pump');
const { onFirewall, maybeKeygen, addSocketLogs, serverClose, sleep } = require('./util.js');

process.env.DEBUG = 'p2p';
const debug = require('debug')('p2p');

const serverKeyPair = DHT.keyPair(Buffer.from('524ad00b147e1709e7fd99e2820f8258fd30ed043c631233ac35e17f9ec10333', 'hex'));
const clientKeyPair = DHT.keyPair(Buffer.from('c7f7b6cc2cd1869a4b8628deb49efc992109c9fbdfa55ab1cfa528117fff9acd', 'hex'));

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
  const swarm = new Hyperswarm({
    keyPair: serverKeyPair,
    firewall: onFirewall([clientKeyPair.publicKey])
  });

  swarm.dht.on('listening', () => {
    debug('swarm dht listening');
    debug('remoteServerAddress', swarm.dht._sockets.remoteServerAddress());
    debug('localServerAddress', swarm.dht._sockets.localServerAddress());
  });

  swarm.on('connection', (peer, peerInfo) => {
    console.log('----------');
    debug('peer', peer.rawStream.remoteAddress + ':' + peer.rawStream.remotePort, '(' + peer.rawStream.remoteFamily + ')');
    // debug('peerInfo', peerInfo);

    addSocketLogs('peer', peer, ['error', 'connect', 'handshake', 'connected', 'timeout', 'end'/*, 'drain'*/, 'finish', 'close']);

    let remote = net.connect(remoteForward.port, remoteForward.address);
    addSocketLogs('remote', remote, ['error', 'timeout', 'end', 'finish', 'close']);

    pump(peer, remote, peer);
    // mimic(peer, remote);
    // mimic(remote, peer);
  });

  const topic = Buffer.alloc(32).fill('fwd-test');
  const discovery = swarm.join(topic, { server: true, client: false });
  debug('discovery joined');
  await discovery.flushed(); // Waits for the topic to be fully announced on the DHT
  debug('discovery flushed');
}
