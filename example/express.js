const express = require('express')
const app = express()

app.use(function (req, res, next) {
  console.log('req incoming')
  next()
})

app.get('/', function (req, res) {
  res.send('Random number: ' + Math.random())
})

const server = app.listen(2999) // 192.168.0.23

// server.keepAliveTimeout = 600 * 1000
// server.headersTimeout = 601 * 1000 // https://github.com/nodejs/node/issues/27363
