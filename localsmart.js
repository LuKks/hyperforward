const noise = require('noise-network');
const net = require('net');
const pump = require('pump');
const fs = require('fs');
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

let localReverse = (argv.S || '').trim().split(':');
console.log('local', localReverse);

const serverPublicKey = Buffer.from(fs.readFileSync(homedir + '/.ssh/' + join + '.pub', 'utf8'), 'hex');
const clientKeys = {
  publicKey: Buffer.from(fs.readFileSync(homedir + '/.ssh/' + keys + '.pub', 'utf8'), 'hex'),
  secretKey: Buffer.from(fs.readFileSync(homedir + '/.ssh/' + keys, 'utf8'), 'hex')
};

console.log('serverPublicKey', serverPublicKey);
console.log('clientKeys.publicKey', clientKeys.publicKey);

let firstClient = noise.connect(serverPublicKey, clientKeys);
// console.log(Date.now(), 'connection', client.remoteAddress, client.remotePort, connection.remoteFamily, 'type', info.type, 'client', info.client, 'info peer', info.peer ? [info.peer.host, info.peer.port, 'local?', info.peer.local] : info.peer);
firstClient.on('error', (err) => console.log(Date.now(), 'firstClient error', err));
firstClient.on('connect', () => console.log(Date.now(), 'firstClient connect'));
firstClient.on('handshake', () => console.log(Date.now(), 'firstClient handshake'));
firstClient.on('connected', () => console.log(Date.now(), 'firstClient connected'));
firstClient.on('timeout', () => console.log(Date.now(), 'firstClient timeout'));
firstClient.on('end', () => console.log(Date.now(), 'firstClient ended'));
firstClient.on('drain', () => console.log(Date.now(), 'firstClient drained'));
firstClient.on('finish', () => console.log(Date.now(), 'firstClient finished'));
firstClient.on('close', () => console.log(Date.now(), 'firstClient closed'));

let reuseFirstSocket = true;
let myLocalServer = net.createServer(function onconnection (rawStream) {
  console.log(Date.now(), 'myLocalServer onconnection');

  rawStream.on('error', (err) => console.log(Date.now(), 'rawStream error', err));
  rawStream.on('error', rawStream.destroy);
  rawStream.on('timeout', () => console.log(Date.now(), 'rawStream timeout'));
  rawStream.on('end', () => console.log(Date.now(), 'rawStream ended'));
  rawStream.on('drain', () => console.log(Date.now(), 'rawStream drained'));
  rawStream.on('finish', () => console.log(Date.now(), 'rawStream finished'));
  rawStream.on('close', () => console.log(Date.now(), 'rawStream closed'));

  // reuse first socket or connect new one (tcp/utp)
  let client = reuseFirstSocket ? firstClient : noise.connect(serverPublicKey, clientKeys);
  if (!reuseFirstSocket) {
    client.on('error', (err) => console.log(Date.now(), 'client error', err));
    client.on('connect', () => console.log(Date.now(), 'client connect'));
    client.on('handshake', () => console.log(Date.now(), 'client handshake'));
    client.on('connected', () => console.log(Date.now(), 'client connected'));
    client.on('timeout', () => console.log(Date.now(), 'client timeout'));
    client.on('end', () => console.log(Date.now(), 'client ended'));
    client.on('drain', () => console.log(Date.now(), 'client drained'));
    client.on('finish', () => console.log(Date.now(), 'client finished'));
    client.on('close', () => console.log(Date.now(), 'client closed'));
    myLocalServer.once('close', function () {
      console.log(Date.now(), 'myLocalServer close, client');
      client.destroy();
    });
  }
  reuseFirstSocket = false;

  myLocalServer.once('close', function () {
    rawStream.destroy();
  });

  rawStream.on('end', () => client.end());
  rawStream.on('close', () => client.destroy());

  client.on('end', () => rawStream.end());
  rawStream.on('finish', () => rawStream.end());
  client.on('close', () => rawStream.destroy());

  rawStream.on('close', () => {
    // will not allow reconnect?
    myLocalServer.close();
  });

  rawStream.on('data', (chunk) => {
    console.log(Date.now(), 'rawStream data', chunk.length);
    client.write(chunk);
  });
  client.on('data', (chunk) => {
    console.log(Date.now(), 'client data pre', chunk.length);
    if (rawStream.ending || rawStream.ended || rawStream.finished || rawStream.destroyed || rawStream.closed) {
      return;
    }
    console.log(Date.now(), 'client data post', chunk.length);
    rawStream.write(chunk);
  });
});

myLocalServer.once('close', function () {
  console.log(Date.now(), 'myLocalServer close, firstClient');
  firstClient.destroy();
});

myLocalServer.listen(localReverse[1] || 0, localReverse[0], function () {
  let serverAddress = myLocalServer.address();
  console.log(Date.now(), 'local forward:', { address: serverAddress.address, port: serverAddress.port });
});

myLocalServer.on('close', () => {
  console.log(Date.now(), 'myLocalServer close');
  process.exit();
});

process.once('SIGINT', function () {
  firstClient.end(); // + should call destroy after callback
  // myLocalServer.close();

  setTimeout(() => {
    console.log(Date.now(), 'force exit');
    process.exit();
  }, 2000);
});
