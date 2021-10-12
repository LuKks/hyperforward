const noise = require('noise-network');
const net = require('net');
const fs = require('fs');
const argv = require('minimist')(process.argv.slice(2));
const homedir = require('os').homedir();

argv.keys = (argv.keys || '').trim();
argv.keys = 'noise' + (argv.keys ? '_' + argv.keys : ''); // => "noise_lks"

argv.clients = (argv.clients || '').trim().split(','); // => [ 'lks2' ]

argv.R = (argv.R || '').trim().split(':');
// valid ports: [tcp: 1-65535] [udp: 0-65535 (optional)]
// + should support udp port with --udp
argv.R[1] = parseInt(argv.R[1]);
if (!argv.R[0] || !argv.R[1]) {
  throw new Error('-R is invalid (address:port)');
}
if (argv.R[1] < 1 || argv.R[1] > 65535) {
  throw new Error('-R port is invalid (1-65535)');
}

const serverKeys = {
  publicKey: fs.readFileSync(homedir + '/.ssh/' + argv.keys + '.pub', 'utf8').trim(),
  secretKey: fs.readFileSync(homedir + '/.ssh/' + argv.keys, 'utf8').trim()
};
const clientPublicKeys = argv.clients.map(client => {
  // support names
  if (client.length <= 21) {
    return fs.readFileSync(homedir + '/.ssh/noise_' + client + '.pub', 'utf8').trim();
  }
  return client;
});

const server = noise.createServer({
  // authentication
  validate: function (remoteKey, done) {
    for (let i = 0; i < clientPublicKeys.length; i++) {
      let publicKey = clientPublicKeys[i];
      if (remoteKey.toString('hex') === publicKey) {
        console.log(Date.now(), 'server validate, allowed public key:\n', remoteKey.toString('hex'));
        return done();
      }
    }
    console.log(Date.now(), 'server validate, denied public key:\n', remoteKey.toString('hex'));
    return done(new Error('Unauthorized key'));
  }
});

server.on('error', (err) => console.error(err));

server.on('connection', function (client) {
  console.log(Date.now(), 'client connection');

  /*client.on('error', (err) => console.log(Date.now(), 'client error', err));
  client.on('connect', () => console.log(Date.now(), 'client connect'));
  client.on('handshake', () => console.log(Date.now(), 'client handshake'));
  client.on('connected', () => console.log(Date.now(), 'client connected'));
  client.on('timeout', () => console.log(Date.now(), 'client timeout'));
  client.on('end', () => console.log(Date.now(), 'client ended'));
  client.on('drain', () => console.log(Date.now(), 'client drained'));
  client.on('finish', () => console.log(Date.now(), 'client finished'));
  client.on('close', () => console.log(Date.now(), 'client closed'));*/

  // + should support udp connect with --udp
  let reversed = net.connect(argv.R[1], argv.R[0]);
  /*reversed.on('error', (err) => console.log(Date.now(), 'reversed error', err));
  reversed.on('timeout', () => console.log(Date.now(), 'reversed timeout'));
  reversed.on('end', () => console.log(Date.now(), 'reversed ended'));
  reversed.on('drain', () => console.log(Date.now(), 'reversed drained'));
  reversed.on('finish', () => console.log(Date.now(), 'reversed finished'));
  reversed.on('close', () => console.log(Date.now(), 'reversed closed'));*/

  // handle errors
  client.on('error', reversed.destroy);
  reversed.on('error', client.destroy);

  // automatic "end and destroy" after server.close()
  let clientEnd = () => {
    client.end();
  };
  server.once('$closing', clientEnd);
  client.once('close', () => server.off('$closing', clientEnd));

  // mimic remote to local
  client.on('data', (chunk) => reversed.write(chunk));
  client.on('end', () => reversed.end());
  client.on('finish', () => {
    client.destroy();
    // may have already ended
    reversed.end();
  });
  client.on('close', () => reversed.destroy());

  // mimic local to remote
  reversed.on('data', (chunk) => client.write(chunk));
  reversed.on('end', () => client.end());
  reversed.on('finish', () => {
    reversed.destroy();
    client.end();
  });
  reversed.on('close', () => client.destroy());
});

server.on('close', () => {
  console.log('server closed');
});

server.on('error', (err) => {
  console.log('server error', err);
});

server.listen(serverKeys, function () {
  console.log('Server is listening on:\n' + server.publicKey.toString('hex'));
});

// + what happens if Remote lost internet?
// + --reconnect

process.once('SIGINT', function () {
  console.log(Date.now(), 'SIGINT');

  // just in case event loop somehow is not empty
  setTimeout(() => process.exit(), 1000);
  server.once('close', () => process.exit());

  server.server.discovery.destroy({ force: true }); // fix: fast server close
  server.close();
  server.emit('$closing');
});
