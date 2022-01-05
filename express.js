const express = require('express')
const app = express()

app.use(function (req, res, next) {
  console.log('req incoming')
  next()
})

app.get('/', function (req, res) {
  res.send('Hello World! ' + Math.random())
})

const server = app.listen(2999, '0.0.0.0')

server.keepAliveTimeout = 600 * 1000
server.headersTimeout = 601 * 1000
