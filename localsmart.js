const noise = require('noise-network');
const net = require('net');
const pump = require('pump');
const fs = require('fs');
const argv = require('minimist')(process.argv.slice(2));
const homedir = require('os').homedir();

console.log('argv', argv);

let keys = (argv.keys || '').trim();
keys = 'noise' + (keys ? '_' + keys : '');
console.log('keys', keys);

let join = (argv.join || '').trim();
join = 'noise' + (join ? '_' + join : '');
console.log('join', join);

let localReverse = (argv.S || '').trim().split(':');
console.log('local', localReverse);

const serverPublicKey = Buffer.from(fs.readFileSync(homedir + '/.ssh/' + join + '.pub', 'utf8'), 'hex');
const clientKeys = {
  publicKey: Buffer.from(fs.readFileSync(homedir + '/.ssh/' + keys + '.pub', 'utf8'), 'hex'),
  secretKey: Buffer.from(fs.readFileSync(homedir + '/.ssh/' + keys, 'utf8'), 'hex')
};
console.log('serverPublicKey', serverPublicKey);
console.log('clientKeys.publicKey', clientKeys.publicKey);

let server = net.createServer(function (rawStream) {
  console.log(Date.now(), 'server on connection');

  // reuse first socket or connect new one (tcp/utp)
  let client = noise.connect(serverPublicKey, clientKeys);
  client.on('error', (err) => console.log(Date.now(), 'client error', err));
  client.on('connect', () => console.log(Date.now(), 'client connect'));
  client.on('handshake', () => console.log(Date.now(), 'client handshake'));
  client.on('connected', () => console.log(Date.now(), 'client connected'));
  client.on('timeout', () => console.log(Date.now(), 'client timeout'));
  client.on('end', () => console.log(Date.now(), 'client ended'));
  client.on('drain', () => console.log(Date.now(), 'client drained'));
  client.on('finish', () => console.log(Date.now(), 'client finished'));
  client.on('close', () => console.log(Date.now(), 'client closed'));

  rawStream.on('error', (err) => console.log(Date.now(), 'rawStream error', err));
  rawStream.on('timeout', () => console.log(Date.now(), 'rawStream timeout'));
  rawStream.on('end', () => console.log(Date.now(), 'rawStream ended'));
  rawStream.on('drain', () => console.log(Date.now(), 'rawStream drained'));
  rawStream.on('finish', () => console.log(Date.now(), 'rawStream finished'));
  rawStream.on('close', () => console.log(Date.now(), 'rawStream closed'));

  // handle errors
  rawStream.on('error', client.destroy);
  client.on('error', rawStream.destroy);

  // automatic "end and destroy" after server.close()
  server.once('$closing', endAndDestroy);
  client.once('close', () => server.off('$closing', endAndDestroy));
  function endAndDestroy () {
    client.once('finish', client.destroy);
    client.end();
  }

  // mimic local to remote
  rawStream.on('data', (chunk) => client.write(chunk));
  rawStream.on('end', () => client.end());
  rawStream.on('finish', () => {
    rawStream.destroy();
    client.end();
  });
  rawStream.on('close', () => client.destroy());

  // mimic remote to local
  client.on('data', (chunk) => rawStream.write(chunk));
  client.on('end', () => {
    rawStream.end();
    // client.end();
  });
  client.on('finish', () => {
    client.destroy();
    rawStream.end();
  });
  client.on('close', () => rawStream.destroy());

  // reconnect

  // + will not allow reconnect (default behaviour)?
  // rawStream.on('close', () => server.close());
  // client.on('close', () => server.close());
});

server.listen(localReverse[1] || 0, localReverse[0], function () {
  let serverAddress = server.address();
  console.log(Date.now(), 'local forward:', { address: serverAddress.address, port: serverAddress.port });
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

/*
client.end() => remote 'end' -> client 'finish' -> remote reversed 'finish' -> remote reversed 'end' -> remote 'finish' -> client 'end' -> remote 'close' -> remote reversed 'close' -> client rawStream 'finish' -> client 'close' -> client rawStream -> 'close'

client.end() => remote 'end' -> client 'finish' -> remote reversed 'finish' -> remote reversed 'end' -> remote 'finish' -> client 'end' -> remote 'close' -> remote reversed 'close' -> client rawStream 'finish' -> client 'close' -> client rawStream -> 'close'
*/
