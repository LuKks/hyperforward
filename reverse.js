const noise = require('noise-network');
const net = require('net');
const pump = require('pump');
const fs = require('fs');
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

console.log('serverKeys.publicKey', serverKeys.publicKey);
console.log('clientPublicKeys', clientPublicKeys);

// [setting for "servers" in local networks with firewall]
// allow IN traffic from all interfaces on localAddress:49737
// 192.168.0.2 49737 ALLOW IN Anywhere
const server = noise.createServer({
  // authentication
  validate: function (remoteKey, done) {
    // console.log('server validate', remoteKey.toString('hex'));
    for (let i = 0; i < clientPublicKeys.length; i++) {
      let publicKey = clientPublicKeys[i];
      if (remoteKey.equals(publicKey)) return done();
    }
    return done(new Error('Unauthorized key'));
  }
});

server.on('connection', function (client) {
  // console.log(Date.now(), 'connection', connection.remoteAddress, connection.remotePort, connection.remoteFamily, 'type', info.type, 'client', info.client, 'info peer', info.peer ? [info.peer.host, info.peer.port, 'local?', info.peer.local] : info.peer);
  console.log(Date.now(), 'client connection');

  client.on('error', (err) => console.log(Date.now(), 'client error', err));
  client.on('connect', () => console.log(Date.now(), 'client connect'));
  client.on('handshake', () => console.log(Date.now(), 'client handshake'));
  client.on('connected', () => console.log(Date.now(), 'client connected'));
  client.on('timeout', () => console.log(Date.now(), 'client timeout'));
  client.on('end', () => console.log(Date.now(), 'client ended'));
  client.on('drain', () => console.log(Date.now(), 'client drained'));
  client.on('finish', () => console.log(Date.now(), 'client finished'));
  client.on('close', () => console.log(Date.now(), 'client closed'));

  let reversed = net.connect(reverse[1], reverse[0]/*, { allowHalfOpen: true }*/);
  reversed.on('error', (err) => console.log(Date.now(), 'reversed error', err));
  reversed.on('error', reversed.destroy);
  reversed.on('timeout', () => console.log(Date.now(), 'reversed timeout'));
  reversed.on('end', () => console.log(Date.now(), 'reversed ended'));
  reversed.on('drain', () => console.log(Date.now(), 'reversed drained'));
  reversed.on('finish', () => console.log(Date.now(), 'reversed finished'));
  reversed.on('close', () => console.log(Date.now(), 'reversed closed'));

  reversed.on('end', () => client.end());
  reversed.on('close', () => client.destroy());

  client.on('end', () => reversed.end());
  reversed.on('finish', () => reversed.end());
  client.on('close', () => reversed.destroy());

  client.on('data', (chunk) => {
    console.log(Date.now(), 'client data pre', chunk.length);
    if (!reversed || reversed.ending || reversed.ended || reversed.finished || reversed.destroyed || reversed.closed) {
      // reconnect
      // + should wait for on connect to reversed.write?
      return;
    }
    console.log(Date.now(), 'client data post', chunk.length);
    reversed.write(chunk);
  });
  reversed.on('data', (chunk) => {
    console.log(Date.now(), 'reversed data pre', /*chunk, chunk.toString('utf8'), */chunk.length);
    if (!client || client.ending || client.ended || client.finished || client.destroyed || client.closed) {
      // reconnect?
      // + should wait for on connect to client.write?
      return;
    }
    console.log(Date.now(), 'reversed data post', chunk.length);
    client.write(chunk);
  });

  console.log(Date.now(), 'after ready connection client', client.ending, client.ended, client.finished, client.destroyed, client.closed);

  // pump(client, reversed, client);
});

server.listen(serverKeys, function () {
  console.log('Server is listening on:', server.publicKey.toString('hex'), 'alias:', server.alias);
});

server.on('close', () => {
  console.log(Date.now(), 'server close');
  process.exit();
});

process.once('SIGINT', function () {
  server.close();
  setTimeout(() => {
    console.log(Date.now(), 'force exit');
    process.exit();
  }, 2000);
});
