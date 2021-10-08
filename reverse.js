const hyperswarm = require('hyperswarm');
const crypto = require('crypto');
const net = require('net');
const pump = require('pump');
const noisePeer = require('noise-peer');
const fs = require('fs');
const sodium = require('sodium-native');
const argv = require('minimist')(process.argv.slice(2));
const homedir = require('os').homedir();

console.log('argv', argv); // argv { _: [], R: '127.0.0.1:3000', clients: 'crst' }

// [1]
// create your main pair keys (also ask a friend to do the same):
// hyperforward keygen
// => will generate ~/.ssh/noise.pub and ~/.ssh/noise

// []
// from now, to create more pair keys in the same system need to set a name (like srv, lks, crst, etc):
// hyperforward keygen srv
// => will generate ~/.ssh/noise_srv.pub and ~/.ssh/noise_srv

// []
// to print a public key:
// hyperforward print crst
// => e52fc62ec5ac755f5e6fb41f86db8bdea44a5fa918c44dbf3d4c1a0b1872130f

// [2]
// for easy usage, save your friend's public key with a custom name (crst has to do the same):
// hyperforward add crst e52fc62ec5ac755f5e6fb41f86db8bdea44a5fa918c44dbf3d4c1a0b1872130f
// => will generate ~/.ssh/noise_crst.pub

// let's say I (lks) have a react app or backend in the port 3000,
// and I would like to share it with a friend (crst):

// [3]
// # I create reverse forward allowing only specific clients (comma separated, by name or pubkey)
// hyperforward -R 127.0.0.1:3000 --keys=lks --clients=crst

// [4]
// # later only crst can receive the forward
// hyperforward -L 127.0.0.1:3000 --keys=crst --join=lks

let keys = (argv.keys || '').trim();
keys = 'noise' + (keys ? '_' + keys : '');
console.log('keys', keys);

let clients = (argv.clients || '').trim().split(',');
console.log('clients', clients);

let reverse = (argv.R || '').trim().split(':');

const serverKeys = {
  publicKey: Buffer.from(fs.readFileSync(homedir + '/.ssh/' + keys + '.pub', 'utf8'), 'hex'),
  secretKey: Buffer.from(fs.readFileSync(homedir + '/.ssh/' + keys, 'utf8'), 'hex')
};
const clientPublicKeys = clients.map(client => {
  if (client.length > 21) {
    return Buffer.from(client, 'hex');
  } else {
    return Buffer.from(fs.readFileSync(homedir + '/.ssh/noise_' + client + '.pub', 'utf8'), 'hex');
  }
});
const topic = discoveryKey(maybeConvertKey(serverKeys.publicKey));

console.log('serverKeys.publicKey', serverKeys.publicKey);
console.log('clientPublicKeys', clientPublicKeys);
console.log('topic', topic);

// [setting for "servers" in local networks with firewall]
// allow IN traffic from all interfaces on localAddress:49737
// 192.168.0.2 49737 ALLOW IN Anywhere
const swarm = hyperswarm({
  // announcePort: 49736, // this port is only used when the swarm has announce enabled
  // port: 49737, // peer port
  preferredPort: 49737, // preferred peer port
  announceLocalAddress: true
});

/*swarm.on('peer', (peer) => {
  console.log('peer', peer.host, peer.port, 'local?', peer.local);
});*/

swarm.on('connection', (socket, info) => {
  console.log('connection', 'socket', socket.remoteAddress, socket.remotePort, socket.remoteFamily, 'type', info.type, 'client', info.client, 'info peer', info.peer ? [info.peer.host, info.peer.port, 'local?', info.peer.local] : info.peer);

  let socketSecure = noisePeer(socket, false, {
    pattern: 'XK',
    staticKeyPair: serverKeys,
    onstatickey: function (remoteKey, done) {
      // console.log('onstatickey', remoteKey);
      for (let i = 0; i < clientPublicKeys.length; i++) {
        let publicKey = clientPublicKeys[i];
        if (remoteKey.equals(publicKey)) return done();
      }
      return done(new Error('Unauthorized key'));
    }
  });

  socketSecure.rawStream.setKeepAlive(true, 1000);

  socketSecure.on('close', () => {
    console.log('socketSecure closed');
    // swarm.destroy();
  });

  let reversed = net.connect(reverse[1], reverse[0]);
  reversed.on('close', () => {
    console.log('reversed closed');
    // swarm.destroy();
  });

  pump(socketSecure, reversed, socketSecure);

  reversed.setKeepAlive(true, 1000);
});

swarm.on('disconnection', (socket, info) => {
  console.log('disconnection', 'socket?', socket ? true : false, 'type', info.type, 'client', info.client, 'info peer', info.peer ? [info.peer.host, info.peer.port, 'local?', info.peer.local] : info.peer);
});

swarm.on('updated', ({ key }) => {
  console.log('updated', key);
});

swarm.on('close', () => {
  console.log('swarm close');
  process.exit();
});

swarm.join(topic, {
  lookup: false,
  announce: true
});

process.once('SIGINT', function () {
  swarm.once('close', function () {
    process.exit();
  });
  swarm.destroy();
  setTimeout(() => process.exit(), 2000);
});

function createHash (algo, name) {
  return crypto.createHash(algo).update(name).digest();
}

function discoveryKey (publicKey) {
  const buf = Buffer.alloc(32);
  const str = Buffer.from('hyperforward');
  sodium.crypto_generichash(buf, str, publicKey);
  return buf
}

function maybeConvertKey (key) {
  return typeof key === 'string' ? Buffer.from(key, 'hex') : key;
}

function maybeConvertKeyPair (keys) {
  return {
    publicKey: maybeConvertKey(keys.publicKey),
    secretKey: maybeConvertKey(keys.secretKey)
  };
}
