const SMC = require('simple-message-channels')

const a = new SMC({
  onmessage (channel, type, message) {
    console.log('A) Received a message on channel', channel) // a number
    console.log('A) Message type is', type) // a number
    console.log('A) And the message payload was', message) // a buffer
  }
})

const b = new SMC()

// produce a payload
const payload = b.send(0, 1, Buffer.from('hi'))

// somehow send it to the other instance (over a stream etc)
// can arrive chunked as long as it arrives in order
a.recv(payload)
