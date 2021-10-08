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

// hyperforward -LM 127.0.0.1:3000 --keys=crst --join=lks

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

let myLocalServer = net.createServer(function onconnection (rawStream) {
  console.log('myLocalServer onconnection');

  const swarm = hyperswarm({
    announceLocalAddress: true
  });
  let alreadyConnected = false;

  swarm.join(topic, {
    lookup: true,
    announce: false,
    maxPeers: 1,
  });

  rawStream.on('close', () => {
    console.log('rawStream closed');
    swarm.destroy();
  });

  swarm.once('connection', (socket, info) => {
    swarm.leave(topic, () => console.log('swarm leaved (connection)'));

    console.log('new connection!', 'socket', socket.remoteAddress, socket.remotePort, socket.remoteFamily, 'type', info.type, 'client', info.client, 'info peer', info.peer ? [info.peer.host, info.peer.port, 'local?', info.peer.local] : info.peer);

    // client server encrypted
    let socketSec = noisePeer(socket, true, {
      pattern: 'XK',
      staticKeyPair: clientKeys,
      remoteStaticKey: serverPublicKey
    });

    pump(rawStream, socketSec, rawStream/*, function (err) {
      if (err) {
        console.error('error:', err.message);
        socketSec.end();
        myLocalServer && myLocalServer.close();
        myLocalServer = undefined;
        swarm.destroy();
      }
    }*/);

    socketSec.on('close', () => {
      console.log('socketSec closed');
      swarm.destroy();
    });
  });

  /*swarm.on('disconnection', (socket, info) => {
    console.log('disconnection', 'socket?', socket ? true : false, 'type', info.type, 'client', info.client, 'info peer', info.peer ? [info.peer.host, info.peer.port, 'local?', info.peer.local] : info.peer);
    swarm.destroy();
  });*/

  swarm.on('updated', ({ key }) => {
    console.log('updated', key);

    if (!swarm.connections.size) {
      console.log('keep waiting an incoming connection..');
      // swarm.destroy();
    }
  });

  swarm.on('close', () => {
    console.log('swarm close');
  });
});

myLocalServer.listen(localReverse[1] || 0, localReverse[0], function () {
  let serverAddress = myLocalServer.address();
  console.log('local multiples forward:', { address: serverAddress.address, port: serverAddress.port });
});

process.once('SIGINT', function () {
  myLocalServer.once('close', function () {
    process.exit();
  });
  myLocalServer.close();
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
