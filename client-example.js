const Hyperswarm = require('hyperswarm');
const DHT = require('@hyperswarm/dht');
const noise = require('@lukks/noise-network');
const net = require('net');
const fetch = require('node-fetch');
const fs = require('fs');
const pump = require('pump');
const { onFirewall, maybeKeygen, addSocketLogs, serverClose, sleep } = require('./util.js');

process.env.DEBUG = 'p2p';
const debug = require('debug')('p2p');

const serverKeyPair = DHT.keyPair(Buffer.from('524ad00b147e1709e7fd99e2820f8258fd30ed043c631233ac35e17f9ec10333', 'hex'));
const clientKeyPair = DHT.keyPair(Buffer.from('c7f7b6cc2cd1869a4b8628deb49efc992109c9fbdfa55ab1cfa528117fff9acd', 'hex'));

// setup
(async () => {
  const localForward = { address: '127.0.0.1', port: '3001' };
  // await startClient({ localForward });
  await startClientDht({ localForward });

  await sleep(500);
  simulateRequest(localForward);
  while (true) {
    await sleep(5000);
    simulateRequest(localForward);
  }
})();

// client
async function startClientDht ({ localForward }) {
  const tcp = net.createServer();
  tcp.on('close', () => debug('tcp server closed'));
  tcp.on('connection', onConnection);
  tcp.listen(localForward.port, localForward.address);

  const node = new DHT({
    ephemeral: false
  });
  debug('wait for node ready:');
  await node.ready();
  debug('address', node.address());
  // debug('nodes', node.nodes.toArray());

  async function onConnection (local) {
    addSocketLogs('local', local, ['error', 'open', 'timeout', 'end', 'finish', 'close']);

    console.log('----------');
    debug('local connection');

    let started = Date.now();
    let peer = node.connect(serverKeyPair.publicKey);
    debug('address after connect', node.address());
    // debug('nodes after connect', node.nodes.toArray());
    peer.on('open', function () {
      addSocketLogs('peer', peer, ['error', 'connect', 'handshake', 'connected', 'open', 'timeout', 'end'/*, 'drain'*/, 'finish', 'close']);

      // debug('peer', peer);
      debug('peer', peer.rawStream.remoteAddress + ':' + peer.rawStream.remotePort, '(' + peer.rawStream.remoteFamily + ')', 'delay', Date.now() - started);
      debug('address after connect', node.address());
      setTimeout(() => debug('nodes after peer', node.nodes.toArray()), 1000);

      pump(peer, local, peer);
    });
  }
}

async function simulateRequest (localForward) {
  let response = await fetch('http://' + localForward.address + ':' + localForward.port);
  let data = await response.text();
  console.log(data);
}
