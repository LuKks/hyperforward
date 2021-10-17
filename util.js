const fs = require('fs');
const os = require('os');

module.exports = {
  parsePeers,
  parseAddressPort,
  mimic,
  mimic2,
  onFirewall,
  maybeKeygen,
  endAfterServerClose,
  destroyAfterServerClose,
  serverClose,
  addNoiseLogs,
  addSocketLogs
};

function parsePeers (peers) {
  if (!peers) {
    return 1;
  }
  peers = peers.split(','); // => [ 'crst' ]
  peers = peers.map(peer => {
    if (peer === '*' || peer.length > 21) {
      return peer;
    }
    let path = os.homedir() + '/.ssh/noise_' + peer + '.pub';
    let content = fs.readFileSync(path, 'utf8');
    return Buffer.from(content.trim(), 'hex');
  });
  return peers;
}

function parseAddressPort (hostname) {
  let [address, port] = hostname.split(':'); // => [ '127.0.0.1', '4001' ]
  // valid ports: [tcp: 1-65535] [udp: 0-65535 (optional)]
  // + should support udp port with --udp
  port = parseInt(port);
  if (!address || !port) {
    return 1; // invalid address:port
  }
  if (port < 1 || port > 65535) {
    return 2; // invalid port range
  }
  return { address, port };
}

function mimic (src, dst) {
  src.on('error', dst.destroy);
  src.on('data', (chunk) => dst.write(chunk));
  src.on('end', () => dst.end());
  src.on('finish', () => {
    src.destroy();
    // may have already ended
    dst.end();
  });
  src.on('close', () => dst.destroy());
}

function mimic2 (src, dst, opts) {
  src.on('error', src.destroy);
  src.on('data', (chunk) => dst.write(chunk));
  src.on('end', () => src.end());
  src.on('finish', () => {
    src.destroy();
    // may have already ended
    // dst.end();
  });
  // src.on('close', () => dst.destroy());
}

function onFirewall (clientPublicKeys) {
  return function (remotePublicKey, remoteHandshakePayload) {
    for (let i = 0; i < clientPublicKeys.length; i++) {
      let publicKey = clientPublicKeys[i];
      if (publicKey === '*') {
        return false;
      }
      if (remotePublicKey.equals(publicKey)) {
        console.log(Date.now(), 'onFirewall, allowed public key:\n' + remotePublicKey.toString('hex'), remoteHandshakePayload);
        return false;
      }
    }
    console.log(Date.now(), 'onFirewall, denied public key:\n' + remotePublicKey.toString('hex'), remoteHandshakePayload);
    return true;
  };
}

function maybeKeygen (peer) {
  if (!peer) {
    return noise.keygen();
  }
  return {
    publicKey: Buffer.from(fs.readFileSync(os.homedir() + '/.ssh/noise_' + peer + '.pub', 'utf8').trim(), 'hex'),
    secretKey: Buffer.from(fs.readFileSync(os.homedir() + '/.ssh/noise_' + peer, 'utf8').trim(), 'hex')
  };
}

function endAfterServerClose (socket, server) {
  let clientEnd = () => socket.end();
  server.once('$closing', clientEnd);
  socket.once('close', () => server.off('$closing', clientEnd));
}

function destroyAfterServerClose (socket, server) {
  let clientEnd = () => socket.destroy();
  server.once('$closing', clientEnd);
  socket.once('close', () => server.off('$closing', clientEnd));
}

function serverClose (server, { isNoise, timeoutForceExit }) {
  // just in case event loop somehow is not empty
  if (timeoutForceExit === undefined) timeoutForceExit = 1000;
  if (timeoutForceExit > 0) {
    setTimeout(() => process.exit(), timeoutForceExit);
    server.once('close', () => process.exit());
  }

  if (isNoise) {
    server.server.discovery.destroy({ force: true }); // fix: fast server close
  }
  server.close();
  server.emit('$closing');
  // + should get all sockets and end them instead of custom event
}

function addNoiseLogs (peer) {
  console.log('addNoiseLogs');

  peer.on('error', (err) => console.log(Date.now(), 'peer error', err));
  peer.on('connect', () => console.log(Date.now(), 'peer connect'));
  peer.on('handshake', () => console.log(Date.now(), 'peer handshake'));
  peer.on('connected', () => console.log(Date.now(), 'peer connected'));
  peer.on('timeout', () => console.log(Date.now(), 'peer timeout'));
  peer.on('end', () => console.log(Date.now(), 'peer ended'));
  // peer.on('drain', () => console.log(Date.now(), 'peer drained'));
  peer.on('finish', () => console.log(Date.now(), 'peer finished'));
  peer.on('close', () => console.log(Date.now(), 'peer closed'));
}

function addSocketLogs (socket) {
  console.log('addSocketLogs');

  socket.on('error', (err) => console.log(Date.now(), 'socket error', err));
  socket.on('timeout', () => console.log(Date.now(), 'socket timeout'));
  socket.on('end', () => console.log(Date.now(), 'socket ended'));
  // socket.on('drain', () => console.log(Date.now(), 'socket drained'));
  socket.on('finish', () => console.log(Date.now(), 'socket finished'));
  socket.on('close', () => console.log(Date.now(), 'socket closed'));
}
