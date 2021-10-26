const DHT = require('@hyperswarm/dht');
const net = require('net');
const fetch = require('node-fetch');
const pump = require('pump');

const serverKeyPair = DHT.keyPair(Buffer.from('524ad00b147e1709e7fd99e2820f8258fd30ed043c631233ac35e17f9ec10333', 'hex'));
const clientKeyPair = DHT.keyPair(Buffer.from('c7f7b6cc2cd1869a4b8628deb49efc992109c9fbdfa55ab1cfa528117fff9acd', 'hex'));

// setup
(async () => {
  const localForward = { address: '127.0.0.1', port: '3001' };

  const onConnection = await startClientDht({ localForward });
  await startLocal(onConnection, { localForward });

  simulateRequest(localForward);
  while (true) {
    await sleep(5000);
    await simulateRequest(localForward);
  }
})();

// client
async function startClientDht ({ localForward }) {
  const node = new DHT({
    ephemeral: false
  });
  await node.ready();
  console.log('node ready', node.address());

  return function (local) {
    console.log('local connection');

    let started = Date.now();
    let peer = node.connect(serverKeyPair.publicKey);
    peer.on('open', function () {
      console.log('peer', peer.rawStream.remoteAddress + ':' + peer.rawStream.remotePort, '(' + peer.rawStream.remoteFamily + ')', 'delay', Date.now() - started);

      pump(peer, local, peer);
    });
  }
}

// local
function startLocal (onConnection, { localForward }) {
  return new Promise(resolve => {
    const tcp = net.createServer();
    tcp.on('close', () => console.log('tcp server closed'));
    tcp.on('connection', onConnection);
    tcp.listen(localForward.port, localForward.address, resolve);
  });
}

async function simulateRequest (localForward) {
  let response = await fetch('http://' + localForward.address + ':' + localForward.port);
  let data = await response.text();
  console.log(data);
}
