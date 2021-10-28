const utp = require('utp-native')

const peer = utp()

peer.on('error', function (err) {
  console.log('peer on error', err)
})

peer.on('listening', function () {
  console.log('peer on listening')
})

peer.on('connection', function (client) {
  console.log('peer on connection')
  client.on('data', function (chunk) {
    console.log('client on data', chunk)
  })
})

peer.on('close', function () {
  console.log('peer on close')
})

peer.on('message', function (buffer, rinfo) {
  console.log('peer on message', buffer, rinfo)
})

peer.bind(11337/*, '0.0.0.0'*/, function () {
  console.log('peer on bind')
})

// holepunch to home
// send(peer, 'ping', 11337, '190.246.133.196')

// holepunch to 4g
// send(peer, 'ping', 11337, '186.12.32.218')

function send (socket, data, port, address) {
  let buf = Buffer.from(data)
  socket.send(buf, 0, buf.length, port, address, function () {
    console.log('peer on send callback')
  })
}
