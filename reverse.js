const noise = require('noise-network');
const net = require('net');
const pump = require('pump');
const fs = require('fs');
const argv = require('minimist')(process.argv.slice(2));
const homedir = require('os').homedir();

console.log('argv', argv); // argv { _: [], R: '127.0.0.1:3000', clients: 'crst' }

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
  reversed.on('timeout', () => console.log(Date.now(), 'reversed timeout'));
  reversed.on('end', () => console.log(Date.now(), 'reversed ended'));
  reversed.on('drain', () => console.log(Date.now(), 'reversed drained'));
  reversed.on('finish', () => console.log(Date.now(), 'reversed finished'));
  reversed.on('close', () => console.log(Date.now(), 'reversed closed'));

  // handle errors
  client.on('error', reversed.destroy);
  reversed.on('error', client.destroy);

  // automatic "end and destroy" after server.close()
  let clientEnd = () => client.end();
  server.once('$closing', clientEnd);
  client.once('close', () => server.off('$closing', clientEnd));

  client.on('data', (chunk) => reversed.write(chunk));
  client.on('end', () => {
    // client.end();
    reversed.end();
  });
  client.on('finish', () => {
    client.destroy();
    // reversed may have already ended
    reversed.end();
  });
  client.on('close', () => reversed.destroy());

  reversed.on('data', (chunk) => client.write(chunk));
  reversed.on('finish', () => {
    reversed.destroy();
    client.end();
  });
  reversed.on('end', () => client.end());
  reversed.on('close', () => client.destroy());

  // + will not allow reconnect (default behaviour)?
  // client.on('close', () => server.close());
  // reversed.on('close', () => server.close());
});

server.listen(serverKeys, function () {
  console.log('Server is listening on:', server.publicKey.toString('hex'), 'alias:', server.alias);
});

function serverClose (server) {
  console.log(Date.now(), 'server.end()');
  server.close(); // stop accepting new connections

  console.log(Date.now(), 'emit $closing');
  server.emit('$closing');
}

process.once('SIGINT', function () {
  console.log(Date.now(), 'SIGINT');

  server.once('close', () => {
    console.log('server closed');
    process.exit();
  });
  serverClose(server);

  setTimeout(() => {
    console.log(Date.now(), 'force exit');
    process.exit();
  }, 2000);
});
