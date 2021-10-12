const noise = require('noise-network');
const net = require('net');
const fs = require('fs');
const argv = require('minimist')(process.argv.slice(2));
const homedir = require('os').homedir();

argv.from = (argv.from || '').trim();

argv.connect = (argv.connect || '').trim();
if (!argv.connect) {
  throw new Error('--connect is required (name or public key, comma separated)');
}
argv.connect = argv.connect.split(','); // => [ 'crst' ]

argv.L = (argv.L || '').trim().split(':'); // => [ '127.0.0.1', '4001' ]
// valid ports: [tcp: 1-65535] [udp: 0-65535 (optional)]
// + should support udp port with --udp
argv.L[1] = parseInt(argv.L[1]);
if (!argv.L[0] || !argv.L[1]) {
  throw new Error('-L is invalid (address:port)');
}
if (argv.L[1] < 1 || argv.L[1] > 65535) {
  throw new Error('-L port is invalid (1-65535)');
}

const serverPublicKeys = argv.connect.map(connect => {
  if (connect === '*' || connect.length > 21) {
    return connect;
  }
  if (connect.length <= 21) {
    return Buffer.from(fs.readFileSync(homedir + '/.ssh/noise_' + connect + '.pub', 'utf8').trim(), 'hex');
  }
});

let clientKeys;
if (argv.from) {
  clientKeys = {
    publicKey: Buffer.from(fs.readFileSync(homedir + '/.ssh/noise_' + argv.from + '.pub', 'utf8').trim(), 'hex'),
    secretKey: Buffer.from(fs.readFileSync(homedir + '/.ssh/noise_' + argv.from, 'utf8').trim(), 'hex')
  };
} else {
  clientKeys = noise.keygen();
}

// + maybe start a lookup for Remote in case it doesn't exists alert the user

const server = net.createServer();

server.on('error', (err) => console.log('server error', err));
server.on('close', () => console.log('server closed'));
server.on('connection', function (rawStream) {
  console.log(Date.now(), 'connected to server');

  // reuse first socket or connect new one (tcp/utp)
  // + should add --timeout and --timeout-handshake
  let client = noise.connect(serverPublicKeys[0], clientKeys);
  client.on('error', (err) => console.log(Date.now(), 'client error', err));
  client.on('connect', () => console.log(Date.now(), 'client connect'));
  client.on('handshake', () => console.log(Date.now(), 'client handshake'));
  client.on('connected', () => console.log(Date.now(), 'client connected'));
  client.on('timeout', () => console.log(Date.now(), 'client timeout'));
  client.on('end', () => console.log(Date.now(), 'client ended'));
  // client.on('drain', () => console.log(Date.now(), 'client drained'));
  client.on('finish', () => console.log(Date.now(), 'client finished'));
  client.on('close', () => console.log(Date.now(), 'client closed'));

  rawStream.on('error', (err) => console.log(Date.now(), 'rawStream error', err));
  rawStream.on('timeout', () => console.log(Date.now(), 'rawStream timeout'));
  rawStream.on('end', () => console.log(Date.now(), 'rawStream ended'));
  // rawStream.on('drain', () => console.log(Date.now(), 'rawStream drained'));
  rawStream.on('finish', () => console.log(Date.now(), 'rawStream finished'));
  rawStream.on('close', () => console.log(Date.now(), 'rawStream closed'));

  // handle errors
  rawStream.on('error', client.destroy);
  client.on('error', rawStream.destroy);

  // automatic "end and destroy" after server.close()
  let clientEnd = () => client.end();
  server.once('$closing', clientEnd);
  client.once('close', () => server.off('$closing', clientEnd));

  // mimic local to remote
  rawStream.on('data', (chunk) => client.write(chunk));
  rawStream.on('end', () => client.end());
  rawStream.on('finish', () => {
    rawStream.destroy();
    // may have already ended
    client.end();
  });
  rawStream.on('close', () => client.destroy());

  // mimic remote to local
  client.on('data', (chunk) => rawStream.write(chunk));
  client.on('end', () => rawStream.end());
  client.on('finish', () => {
    client.destroy();
    rawStream.end();
  });
  client.on('close', () => rawStream.destroy());
});

server.listen(argv.L[1] || 0, argv.L[0], function () {
  console.log('The ' + (argv.from ? '' : 'temporal ') + 'public key is:');
  console.log(clientKeys.publicKey.toString('hex'));

  let serverAddress = server.address();
  console.log('Listening on:', serverAddress.address + ':' + serverAddress.port);
});

// + what happens if Client lost internet?
// + --reconnect

process.once('SIGINT', function () {
  console.log(Date.now(), 'SIGINT');

  // just in case event loop somehow is not empty
  setTimeout(() => process.exit(), 1000);
  server.once('close', () => process.exit());

  // server.server.discovery.destroy({ force: true }); // fix: fast server close
  server.close();
  server.emit('$closing');
  // + should get all sockets and end them instead of custom event
});
