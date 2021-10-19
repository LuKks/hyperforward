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
  await startClient({ localForward });

  simulateRequest(localForward);
  while (true) {
    await sleep(5000);
    await simulateRequest(localForward);
  }
})();

// client
async function startClient ({ localForward }) {
  let mainPeer;
  let useMain = false;

  const tcp = net.createServer();
  tcp.on('close', () => debug('tcp server closed'));
  tcp.on('connection', onConnection);
  tcp.listen(localForward.port, localForward.address);

  async function onConnection (local) {
    console.log('----------');
    debug('local connection');
    addSocketLogs('local', local, ['error', 'open', 'timeout', 'end', 'finish', 'close']);

    let dht;
    if (useMain && mainPeer) {
      dht = new DHT({
        // ephemeral: false,
        // adaptive: true,
        bootstrap: mainPeer ? [mainPeer.rawStream.remoteAddress + ':' + mainPeer.rawStream.remotePort] : undefined,
        // socket: udpSocket,
        nodes: mainPeer ? [{ host: mainPeer.rawStream.remoteAddress, port: mainPeer.rawStream.remotePort }] : undefined,
        // Optionally pass a port you prefer to bind to instead of a random one
        // bind: 0,
      });
      dht.on('listening', () => {
        debug('dht listening');
        debug('remoteServerAddress', dht._sockets.remoteServerAddress());
        debug('localServerAddress', dht._sockets.localServerAddress());
      });
      await sleep(300);
      debug(dht._sockets.localServerAddress());

      let peer = dht.connect(serverKeyPair.publicKey, {
        keyPair: clientKeyPair,
        // relayAddresses: [{ host: '', port: '' }]
      });
      addSocketLogs('peer', peer, ['error', 'connect', 'handshake', 'connected', 'open', 'timeout', 'end'/*, 'drain'*/, 'finish', 'close']);
      peer.on('error', noop);
      peer.on('open', () => {
        peer.removeListener('error', noop);

        debug('peer', peer.rawStream.remoteAddress + ':' + peer.rawStream.remotePort, '(' + peer.rawStream.remoteFamily + ')', 'hostport', peer.host, peer.port);
        addSocketLogs('peer', peer, ['error', 'connect', 'handshake', 'connected', 'open', 'timeout', 'end'/*, 'drain'*/, 'finish', 'close']);
        if (!mainPeer) {
          mainPeer = peer;
        }
        pump(peer, local, peer);        
      });
      function noop () {}
    }

    const swarm = new Hyperswarm({
      keyPair: clientKeyPair,
      firewall: onFirewall([serverKeyPair.publicKey]),
      bootstrap: (useMain && mainPeer) ? [dht._sockets.localServerAddress().host + ':' + dht._sockets.localServerAddress().port] : undefined
    });

    swarm.on('connection', (peer, peerInfo) => {
      debug('relayAddresses', swarm.server.relayAddresses);

      debug('peer', peer.rawStream.remoteAddress + ':' + peer.rawStream.remotePort, '(' + peer.rawStream.remoteFamily + ')', 'hostport', peer.host, peer.port);
      debug('peerInfo', peerInfo);
      addSocketLogs('peer', peer, ['error', 'connect', 'handshake', 'connected', 'open', 'timeout', 'end'/*, 'drain'*/, 'finish', 'close']);

      if (mainPeer) {
        swarm.leave(topic);
        useMain = true;
        pump(peer, local, peer);
      } else {
        mainPeer = peer;
        // keep it open
      }

      // mimic(local, peer);
      // mimic(peer, local);
    });

    // swarm.joinPeer(remotePublicKey);
    // swarm.leavePeer(remotePublicKey);

    const topic = Buffer.alloc(32).fill('fwd-test');
    swarm.join(topic, { server: false, client: true });
    debug('discovery joined');
    await swarm.flush(); // Waits for the swarm to connect to pending peers.
    debug('discovery flush');
    debug('relayAddresses', swarm.server.relayAddresses);
  }
}

async function simulateRequest (localForward) {
  let response = await fetch('http://' + localForward.address + ':' + localForward.port);
  let data = await response.text();
  console.log(data);
}
