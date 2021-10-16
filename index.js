const noise = require('@lukks/noise-network');
const net = require('net');
const fs = require('fs');
const { parsePeers, parseAddressPort, mimic, onstatickey, maybeKeygen, endAfterServerClose, serverClose, addNoiseLogs, addSocketLogs } = require('./util.js');

module.exports = {
  ListenNoise,
  ListenTCP,
  ConnectNoise,
  ConnectTCP,
  Remote,
  Local,
};

function ListenNoise (keyPair, peers, cb) {
  console.log('ListenNoise', { keyPair, peers, cb: !!cb });

  if (!cb) cb = () => {};

  const server = noise.createServer({ announceLocalAddress: true, lookup: false, validate: onstatickey(peers) });

  server.on('error', console.error);
  server.on('close', () => console.log('Listen closed'));
  server.on('connection', addNoiseLogs);

  server.listen(keyPair, cb);

  return server;
}

function ListenTCP (port, address, cb) {
  console.log('ListenTCP', { port, address, cb: !!cb });

  if (!cb) cb = () => {};

  const server = net.createServer(); // // topic.on('peer'

  server.on('error', console.error);
  server.on('close', () => console.log('ListenTCP closed'));
  server.on('connection', addSocketLogs);

  // + should support udp connect with --udp
  server.listen(port || 0, address, cb);

  return server;
}

function ConnectNoise (publicKey, keyPair) {
  console.log('ConnectNoise', { publicKey, keyPair });

  // + should support udp connect with --udp
  // + should add --timeout and --timeout-handshake
  // reuse first socket or connect new one (tcp/utp
  let peer = noise.connect(publicKey, keyPair);
  // + should try to directly connect based on a map of publicKey -> peer ip:port expired after 48 hours
  addNoiseLogs(peer);
  return peer;
}

function ConnectTCP (address, port) {
  console.log('ConnectTCP', { address, port });

  // + should support udp connect with --udp
  // + should add --timeout and --timeout-handshake
  // reuse first socket or connect new one (tcp/utp
  let socket = net.connect(port, address);
  addSocketLogs(socket);
  return socket;
}

function Remote ({ keyPair, remoteAddress, peers }) {
  console.log('Remote', { keyPair, remoteAddress, peers });

  return new Promise(resolve => {
    console.log('remote: listen noise');
    const server = ListenNoise(keyPair, peers, function (err) {
      console.log('remote: cb');

      server.topic.on('peer', (peer) => console.log('Remote: on peer', peer.host + ':' + peer.port, 'local?', peer.local, 'referrer?', !!peer.referrer, 'to', peer.to));

      err ? reject(err) : resolve(server);
    });

    console.log('remote: server on connection');
    server.on('connection', function (peer) {
      console.log(Date.now(), 'Peer handshake', peer.rawStream.remoteAddress + ':' + peer.rawStream.remotePort, '(' + peer.rawStream.remoteFamily + ')');

      let remote = ConnectTCP(remoteAddress.address, remoteAddress.port);
      endAfterServerClose(peer, server);

      mimic(peer, remote); // replicate peer actions to -> remote
      mimic(remote, peer); // replicate remote actions to -> peer
    });
  });
}

function Local ({ remotePublicKey, localAddress, keyPair }) {
  console.log('Local', { remotePublicKey, localAddress, keyPair });

  return new Promise((resolve, reject) => {
    console.log('local: listen tcp');
    const server = ListenTCP(localAddress.port, localAddress.address, function (err) {
      console.log('local: cb');
      err ? reject(err) : resolve(server);
    });

    // topic.on('peer', ...)

    console.log('local: server on connection');
    server.on('connection', function (local) {
      console.log(Date.now(), 'Local connection');

      let peer = ConnectNoise(remotePublicKey, keyPair);

      peer.rawStream.topic.on('peer', (peer) => console.log('Local: on peer', peer.host + ':' + peer.port, 'local?', peer.local, 'referrer?', !!peer.referrer, 'to', peer.to));

      peer.on('handshake', function () {
        if (peer.destroyed || peer.connected) return peer.destroy();

        console.log('Local: peer handshake', peer.rawStream._writable.remoteAddress + ':' + peer.rawStream._writable.remotePort, '(' + peer.rawStream._writable.remoteFamily + ')');

        endAfterServerClose(peer, server);
        mimic(local, peer); // replicate local actions to -> peer
        mimic(peer, local); // replicate peer actions to -> local
      });
    });

    // let mainPeer = ConnectNoise(remotePublicKey, keyPair);
    // endAfterServerClose(mainPeer, server);
  });
}
