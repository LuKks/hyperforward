const hyperswarm = require('hyperswarm');
const crypto = require('crypto');
const net = require('net');
const pump = require('pump');
const noisePeer = require('noise-peer');
const fs = require('fs');
const sodium = require('sodium-native');
const argv = require('minimist')(process.argv.slice(2));
const homedir = require('os').homedir();

console.log('argv', argv);

// hyperforward -L 127.0.0.1:3000 --keys=crst --join=lks

let keys = (argv.keys || '').trim();
keys = 'noise' + (keys ? '_' + keys : '');
console.log('keys', keys);

let join = (argv.join || '').trim();
join = 'noise' + (join ? '_' + join : '');
console.log('join', join);

let localReverse = (argv.L || '').trim().split(':');
console.log('local', localReverse);

const serverPublicKey = Buffer.from(fs.readFileSync(homedir + '/.ssh/' + join + '.pub', 'utf8'), 'hex');
const clientKeys = {
  publicKey: Buffer.from(fs.readFileSync(homedir + '/.ssh/' + keys + '.pub', 'utf8'), 'hex'),
  secretKey: Buffer.from(fs.readFileSync(homedir + '/.ssh/' + keys, 'utf8'), 'hex')
};
const topic = discoveryKey(maybeConvertKey(serverPublicKey));

console.log('serverPublicKey', serverPublicKey);
console.log('clientKeys.publicKey', clientKeys.publicKey);
console.log('topic', topic);

const swarm = hyperswarm({
  announceLocalAddress: true
});

swarm.once('connection', (socket, info) => {
  console.log('new connection!', 'socket', socket.remoteAddress, socket.remotePort, socket.remoteFamily, 'type', info.type, 'client', info.client, 'info peer', info.peer ? [info.peer.host, info.peer.port, 'local?', info.peer.local] : info.peer);

  socket.on('error', socket.destroy);

  swarm.leave(topic, () => console.log('swarm leaved (connection)'));

  socket.on('error', (err) => console.log('raw socket error', err));
  socket.on('end', () => console.log('raw socket ended'));
  socket.on('close', () => console.log('raw socket closed'));

  // client server encrypted
  let socketSecure = noisePeer(socket, true, {
    pattern: 'XK',
    staticKeyPair: clientKeys,
    remoteStaticKey: serverPublicKey
  });

  let myLocalServer = net.createServer(function onconnection (rawStream) {
    console.log('myLocalServer onconnection');

    rawStream.on('error', (err) => {
      console.log('rawStream error', err);
    });
    rawStream.on('end', () => {
      console.log('rawStream ended', info.type);
    });
    rawStream.on('close', () => {
      console.log('rawStream closed');
    });

    socketSecure.on('end', () => {
      rawStream.end();
    });
    socketSecure.on('close', () => {
      rawStream.end(); // + should call destroy after end
    });

    rawStream.on('data', (chunk) => {
      console.log('rawStream data', chunk.length);
      socketSecure.write(chunk);
    });
    socketSecure.on('data', (chunk) => {
      console.log('socketSecure data', chunk.length);
      if (rawStream.ending || rawStream.ended || rawStream.finished || rawStream.destroyed || rawStream.closed) {
        return;
      }
      rawStream.write(chunk);
    });

    // pump(rawStream, socketSecure, rawStream);
  });

  myLocalServer.listen(localReverse[1] || 0, localReverse[0], function () {
    let serverAddress = myLocalServer.address();
    console.log('local forward:', { address: serverAddress.address, port: serverAddress.port });
  });

  socketSecure.on('error', (err) => {
    console.log('socketSecure error', err);
  });
  socketSecure.on('end', () => {
    console.log('socketSecure ended');
  });
  socketSecure.on('close', () => {
    console.log('socketSecure closed', info.type);
  });

  socket.on('end', () => {
    socketSecure.end();
  });
});

swarm.on('disconnection', (socket, info) => {
  console.log('disconnection', 'socket?', socket ? true : false, 'type', info.type, 'client', info.client, 'info peer', info.peer ? [info.peer.host, info.peer.port, 'local?', info.peer.local] : info.peer);
});

swarm.on('updated', ({ key }) => {
  console.log('updated', key);

  if (!swarm.connections.size) {
    console.log('keep waiting an incoming connection..');
    // swarm.destroy();
  }
});

swarm.on('close', () => {
  console.log('swarm close');
  process.exit();
});

swarm.join(topic, {
  lookup: true,
  announce: false,
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
