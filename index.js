const Hyperswarm = require('hyperswarm');
const DHT = require('@hyperswarm/dht');
const noise = require('@lukks/noise-network');
const net = require('net');
const fs = require('fs');
const { parsePeers, parseAddressPort, mimic, mimic2, mimic3, onFirewall, maybeKeygen, endAfterServerClose, serverClose, addNoiseLogs, addSocketLogs } = require('./util.js');

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

  const server = noise.createServer({ announceLocalAddress: true, lookup: true, validate: onFirewall(peers) });

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

/*function Remote ({ keyPair, remoteAddress, peers }) {
  console.log('Remote', { keyPair, remoteAddress, peers });

  return new Promise(resolve => {
    console.log('remote: listen noise');

    const swarm1 = new Hyperswarm({
      keyPair,
      firewall: onFirewall(peers)
    });

    swarm1.on('connection', (peer, peerInfo) => {
      addNoiseLogs(peer);

      console.log('peer', peer.rawStream.remoteAddress + ':' + peer.rawStream.remotePort, '(' + peer.rawStream.remoteFamily + ')');
      // console.log('peerInfo', peerInfo);

      // endAfterServerClose(peer, server);

      let remote = connectRemote();
      // mimic3(peer, remote); // replicate peer actions to -> remote
      // mimic2(remote, peer); // replicate remote actions to -> peer

      function connectRemote () {
        // if already connected then off listeners
        if (remote) {
          unmimic();
        }

        // connect for first time or reconnect
        remote = ConnectTCP(remoteAddress.address, remoteAddress.port);

        // mimic (peer -> remote)

        peer.on('error', () => peer.destroy());
        remote.on('error', () => remote.destroy());

        peer.on('error', () => remote.destroy());
        peer.on('data', (chunk) => remote.write(chunk));
        peer.on('end', () => remote.end());
        peer.on('finish', () => peer.destroy());
        peer.on('finish', () => remote.end());
        peer.on('close', () => remote.destroy());

        // mimic but reuse peer (remote -> peer)
        // remote.on('error', () => peer.destroy());
        remote.on('data', (chunk) => peer.write(chunk));
        remote.on('end', () => remote.destroy()); // peer.destroy()
        remote.on('finish', () => remote.destroy());
        // remote.on('finish', () => peer.end());
        // remote.on('close', () => peer.destroy());

        // reconnect remote in case is closed
        remote.once('close', onRemoteClose);

        return remote;

        function onRemoteClose () {
          unmimic(peer, remote);

          if (peer.destroyed) {
            console.log('peer was destroyed, cant reconnect');
            return;
          }

          connectRemote(peer, remote);
        }
      }

      function unmimic () {
        peer.off('error', peer.destroy);
        peer.off('error', remote.destroy);
        peer.off('data', remote.write);
        peer.off('end', remote.end);
        peer.off('finish', peer.destroy);
        peer.off('finish', remote.end);
        peer.off('close', remote.destroy);

        remote.off('error', remote.destroy);
        remote.off('data', peer.write);
        remote.off('end', remote.destroy); // peer.destroy()
        remote.off('finish', remote.destroy);
        // remote.off('finish', peer.end);
        // remote.off('close', peer.destroy);
      }
    });

    const topic = Buffer.alloc(32).fill('hyperforward'); // A topic must be 32 bytes
    const discovery = swarm1.join(topic, { server: true, client: false });
    console.log('discovery joined');
    (async () => {
      await discovery.flushed(); // Waits for the topic to be fully announced on the DHT
      console.log('discovery flushed');
    })();
    // resolve();
  });
}*/

/*function Local ({ remotePublicKey, localAddress, keyPair }) {
  console.log('Local', { remotePublicKey, localAddress, keyPair });

  return new Promise((resolve, reject) => {
    const swarm2 = new Hyperswarm({
      keyPair,
      firewall: onFirewall([remotePublicKey])
    });

    const server = ListenTCP(localAddress.port, localAddress.address, function (err) {
      err ? reject(err) : resolve(server);
    });

    server.on('connection', function (local) {
      console.log(Date.now(), 'Local connection');

      swarm2.once('connection', (peer, peerInfo) => {
        console.log('peer', peer.rawStream.remoteAddress + ':' + peer.rawStream.remotePort, '(' + peer.rawStream.remoteFamily + ')');

        console.log('swarm2 connection');

        // endAfterServerClose(peer, server);
        mimic(local, peer); // replicate local actions to -> peer
        mimic(peer, local); // replicate peer actions to -> local
      });

      swarm2.joinPeer(remotePublicKey);
      swarm2.leavePeer(remotePublicKey);

      const topic = Buffer.alloc(32).fill('hyperforward'); // A topic must be 32 bytes
      // swarm2.join(topic, { server: false, client: true });
      console.log('discovery joined');
      (async () => {
        await swarm2.flush(); // Waits for the swarm to connect to pending peers.
        console.log('discovery flush');
      })();
    });
  });
}*/

/*
function Remote ({ keyPair, remoteAddress, peers }) {
  console.log('Remote', { keyPair, remoteAddress, peers });

  return new Promise(resolve => {
    console.log('remote: listen noise');

    const node = new DHT();

    const server = node.createServer({
      firewall: onFirewall(peers)
    });
    server.on('connection', function (peer) {
      addNoiseLogs(peer);
      console.log('peer', peer.rawStream.remoteAddress + ':' + peer.rawStream.remotePort, '(' + peer.rawStream.remoteFamily + ')');
      // console.log('peerInfo', peerInfo);

      console.log('My public key', peer.publicKey);
      console.log('Peer public key', peer.remotePublicKey);

      // endAfterServerClose(peer, server);

      let remote = ConnectTCP(remoteAddress.address, remoteAddress.port);
      mimic(peer, remote); // replicate peer actions to -> remote
      mimic(remote, peer); // replicate remote actions to -> peer
    });
    await server.listen(keyPair);

    console.log(server.address());
    console.log(node.remoteAddress());

    // const topic = Buffer.alloc(32).fill('hyperforward'); // A topic must be 32 bytes

    // resolve();
  });
}
*/

function Remote ({ keyPair, remoteAddress, peers }) {
  console.log('Remote', { keyPair, remoteAddress, peers });

  return new Promise((resolve, reject) => {
    const swarm = new Hyperswarm({
      keyPair,
      firewall: onFirewall(peers)
    });

    swarm.on('connection', (peer, peerInfo) => {
      addNoiseLogs(peer);
      console.log('peer', peer.rawStream.remoteAddress + ':' + peer.rawStream.remotePort, '(' + peer.rawStream.remoteFamily + ')');
      // console.log('peerInfo', peerInfo);

      console.log('My public key', peer.publicKey);
      console.log('Peer public key', peer.remotePublicKey);

      // endAfterServerClose(peer, server);

      let remote = ConnectTCP(remoteAddress.address, remoteAddress.port);
      mimic(peer, remote); // replicate peer actions to -> remote
      mimic(remote, peer); // replicate remote actions to -> peer

    });

    const topic = Buffer.alloc(32).fill('hyperforward'); // A topic must be 32 bytes
    // swarm.join(topic, { server: false, client: true });
    console.log('discovery joined');
    (async () => {
      await swarm.flush(); // Waits for the swarm to connect to pending peers.
      console.log('discovery flush');
    })();
  });
}

function Local ({ remotePublicKey, localAddress, keyPair }) {
  console.log('Local', { remotePublicKey, localAddress, keyPair });

  return new Promise((resolve, reject) => {
    const swarm = new Hyperswarm({
      keyPair,
      firewall: onFirewall([remotePublicKey])
    });

    const server = ListenTCP(localAddress.port, localAddress.address, function (err) {
      err ? reject(err) : resolve(server);
    });

    server.on('connection', function (local) {
      console.log(Date.now(), 'Local connection');

      swarm.once('connection', (peer, peerInfo) => {
        addNoiseLogs(peer);
        console.log('peer', peer.rawStream.remoteAddress + ':' + peer.rawStream.remotePort, '(' + peer.rawStream.remoteFamily + ')');

        // endAfterServerClose(peer, server);
        mimic2(local, peer); // mimic2, replicate local actions to -> peer
        mimic(peer, local); // replicate peer actions to -> local
      });

      swarm.joinPeer(remotePublicKey);
      swarm.leavePeer(remotePublicKey);

      const topic = Buffer.alloc(32).fill('hyperforward'); // A topic must be 32 bytes
      // swarm.join(topic, { server: false, client: true });
      console.log('discovery joined');
      (async () => {
        await swarm.flush(); // Waits for the swarm to connect to pending peers.
        console.log('discovery flush');
      })();      
    });
  });
}

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
