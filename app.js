/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js WebServer + WebSocket Application
//------------------------------------------------------------------------------

// This application uses express as its web server
// for more info, see: http://expressjs.com
let express = require('express')

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
let cfenv = require('cfenv')

let http = require('http')

let ws = require('ws')

// get the app environment from Cloud Foundry
let appEnv = cfenv.getAppEnv()

// connected clients
let clients = {}
// player info
let players = []
// track active IP Addresses
let active = {}
//
let balls = {}

// create a new express server
let app = express()

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'))

// Sockets
let httpServer = http.createServer()

let wsServer = new ws.Server({
  server: httpServer
})

// WebSocketServer
wsServer.on('connection', function connection(client) {
  let id = client.upgradeReq.headers['sec-websocket-key']
  clients[id] = client

  // Client sent message
  client.on('message', function incoming(message, flags) {
    handleMessage(wsServer, message, id, client)
  })

  // Client terminated connection
  client.on('close', function incoming(code, message) {
    handleClose(wsServer, id)
  })

  // New client gets an ID from the server
  let message = JSON.stringify({
    id: 'ID',
    from: 'SERVER',
    data: {
      id: id,
      seq: wsServer.clients.length - 1
    }
  })
  client.send(message)
  console.log('%s SND <%s>', new Date().getTime(), message)
})

// Start
httpServer.on('request', app)
httpServer.listen(appEnv.port, function () {
  console.log("httpServer starting on " + appEnv.url)
})

// start server on the specified port and binding host
// app.listen(appEnv.port, '0.0.0.0', function () {
//   // print a message when the server starts listening
//   console.log("server starting on " + appEnv.url)
// })

function broadcast(server, message) {
  console.log('%s SND <%s> (%d clients)', new Date().getTime(), message, server.clients.length)
  server.clients.forEach(function each(client) {
    try {
      client.send(message)
    } catch (e) {
      console.log(e)
    }
  })
}

function forward(message, active) {
  console.log('%s FWD <%s> (%d clients)', new Date().getTime(), message, active.length)
  active.forEach(function each(id) {
    try {
      clients[id].send(message)
    } catch (e) {
      console.log(e)
    }
  })
}

function handleMessage(server, message, id, client) {
  let ip = client.upgradeReq.connection.remoteAddress
  console.log('%s REC <%s>', new Date().getTime(), message)
  let msg = JSON.parse(message)
  if (!active[ip]) {
    active[ip] = true
    switch (msg.id) {
      case 'JOIN':
        players.push({
          id: id, name: msg.data.name, screen: msg.data.screen
        })
        broadcast(server,
          JSON.stringify({
            id: 'PLAYERS',
            from: 'SERVER',
            data: {players: players}
          }))
        break
      case 'UPDATE':
        let idx = players.findIndex(v => v.id === id)
        players[idx] = msg.data.player
        broadcast(server,
          JSON.stringify({
            id: 'PLAYERS',
            from: 'SERVER',
            data: {players: players}
          }))
        break
      case 'ADD':
        balls[msg.data.id] = msg.data.attr
        break
      case 'PUSH':
        if (players.find(p => p.id === msg.data.to)) {
          forward(message, [msg.data.to])
        } else {
          // bounce back
          console.log('bounce')
          forward(message, [msg.from])
        }
        break
      case 'CHAT':
        broadcast(server, message)
        break
      default:
        console.log('%s ERR <%s>', new Date().getTime(), message)
    }
    active[ip] = false
  } else {
    client.send(JSON.stringify({
      id: 'FLOOD',
      from: 'SERVER',
      data: {}
    }))
  }
}

function handleClose(server, id) {
// console.log(code, message)
  delete clients[id]
  const idx = players.findIndex(p => p.id === id)
  players = players.filter(p => p.id !== id)
  // Broadcast: Client has left
  broadcast(server,
    JSON.stringify({
      id: 'EXIT',
      from: 'SERVER',
      data: {id: id, players: players}
    }))
  if (players.length > 0) {
    forward(JSON.stringify({id: 'PUSH', data: {attr: balls[id], to: players[idx % players.length].id}}), [players[idx % players.length].id])
  }
}

function guid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

let lut = []
for (let i = 0; i < 256; i++) {
  lut[i] = (i < 16 ? '0' : '') + (i).toString(16)
}

function guid7() {
  let d0 = Math.random() * 0xffffffff | 0
  let d1 = Math.random() * 0xffffffff | 0
  let d2 = Math.random() * 0xffffffff | 0
  let d3 = Math.random() * 0xffffffff | 0
  return lut[d0 & 0xff] + lut[d0 >> 8 & 0xff] + lut[d0 >> 16 & 0xff] + lut[d0 >> 24 & 0xff] + '-' +
    lut[d1 & 0xff] + lut[d1 >> 8 & 0xff] + '-' + lut[d1 >> 16 & 0x0f | 0x40] + lut[d1 >> 24 & 0xff] + '-' +
    lut[d2 & 0x3f | 0x80] + lut[d2 >> 8 & 0xff] + '-' + lut[d2 >> 16 & 0xff] + lut[d2 >> 24 & 0xff] +
    lut[d3 & 0xff] + lut[d3 >> 8 & 0xff] + lut[d3 >> 16 & 0xff] + lut[d3 >> 24 & 0xff]
}