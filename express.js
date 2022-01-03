const express = require('express')
const app = express()

app.use(function (req, res, next) {
  console.log('req incoming')
  next()
})

app.get('/', function (req, res) {
  res.send('Hello World! ' + Math.random())
})

app.listen(2999, '127.0.0.1')
