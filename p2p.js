const utp = require('utp-native')
const net = require('net')
const bind = require('bind-easy')

const HOME_IP = '190.246.133.196'
const MOBILE_IP = '186.12.32.218'

const { server, socket } = await bind.dual(11338)

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

// holepunch
send(peer, 'ping', 11337, MOBILE_IP)
send(peer, 'ping', 11338, MOBILE_IP)
socket.send('ping', 11337, MOBILE_IP)
socket.send('ping', 11338, MOBILE_IP)

function send (socket, data, port, address) {
  let buf = Buffer.from(data)
  socket.send(buf, 0, buf.length, port, address, function () {
    console.log('peer on send callback')
  })
}
