const fs = require('fs');
const os = require('os');

module.exports = {
  parsePeers,
  parseAddressPort,
  mimic,
  onstatickey,
  maybeKeygen,
  endAfterServerClose,
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

function mimic (src, dst, opts) {
  let { reuse } = opts || {};
  src.on('error', reuse ? src.destroy : dst.destroy);
  src.on('data', (chunk) => dst.write(chunk));
  src.on('end', () => (reuse ? src.destroy() || dst.end()));
  src.on('finish', () => {
    src.destroy();
    // may have already ended
    !reuse && dst.end();
  });
  !reuse && src.on('close', () => dst.destroy());
}

function onstatickey (clientPublicKeys) {
  return function (remoteKey, done) {
    for (let i = 0; i < clientPublicKeys.length; i++) {
      let publicKey = clientPublicKeys[i];
      if (publicKey === '*') {
        return done();
      }
      if (remoteKey.equals(publicKey)) {
        console.log(Date.now(), 'onstatickey, allowed public key:\n' + remoteKey.toString('hex'));
        return done();
      }
    }
    console.log(Date.now(), 'onstatickey, denied public key:\n' + remoteKey.toString('hex'));
    return done(new Error('Unauthorized key'));
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

function serverClose (server, { isNoise, timeoutExit }) {
  // just in case event loop somehow is not empty
  if (timeoutExit > 0) {
    setTimeout(() => process.exit(), timeoutExit);
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
  socket.on('error', (err) => console.log(Date.now(), 'socket error', err));
  socket.on('timeout', () => console.log(Date.now(), 'socket timeout'));
  socket.on('end', () => console.log(Date.now(), 'socket ended'));
  // socket.on('drain', () => console.log(Date.now(), 'socket drained'));
  socket.on('finish', () => console.log(Date.now(), 'socket finished'));
  socket.on('close', () => console.log(Date.now(), 'socket closed'));
}
