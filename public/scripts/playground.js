let webSocket
let ID
let me
let players = {}
let chat = []
let layer
let balls = []
let engineID = null
let xMax = 1280
let yMax = 720

function init() {
  console.log(location)
  createWebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host, onStatus, onReceive)
  layer = document.getElementById('layer2')
  engineID = setInterval(engine, 20, {balls: balls})
}

function Ball(attr) {
  this.attr = attr
  this.g = createElement(layer, 'g', {transform: 'translate(' + this.attr.x + ',' + this.attr.y + ')'})
  this.ball = createElement(this.g, 'circle', {
    'x': 0,
    'y': 0,
    'r': this.attr.r,
    'fill': this.attr.color
  })
  this.label = createElement(this.g, 'text', {x: 0, y: 6, style: "text-anchor: middle; font-size: 24px"})
  this.label.textContent = this.attr.name
  this.info = createElement(this.g, 'text', {x: 0, y: 30, style: "text-anchor: middle; font-size: 24px"})
  this.info.textContent = this.attr.count

  this.setName = function (name) {
    this.attr.name = name
    this.label.textContent = this.attr.name
  }

  this.countUp = function () {
    this.attr.count++
    this.info.textContent = this.attr.count
  }

  this.moveBy = function (dx, dy) {
    this.attr.x += dx
    this.attr.y += dy
    this.g.setAttribute('transform', 'translate(' + this.attr.x + ',' + this.attr.y + ')')
  }
}

function engine(cfg) {
  cfg.balls.forEach((ball, i) => {
    const attr = ball.attr
    if (attr.y - attr.r + attr.dy <= -yMax || attr.y + attr.r + attr.dy >= yMax) {
      attr.dy = -attr.dy
    }
    if (attr.dx < 0 && attr.x - attr.r + attr.dx <= -xMax && attr.x - attr.r > -xMax || attr.dx > 0 && attr.x + attr.r + attr.dx >= xMax && attr.x + attr.r > xMax) {
      // console.log('ADD', attr.x)
      doSend('PUSH', {attr: ball.attr, to: players[(players.length + players.findIndex(p => p.id === ID) - 1) % players.length].id})
      // clearInterval(engineID)
    } else {
      if (attr.x + attr.r <= -xMax) {
        // console.log('DEL', attr.x)
        balls.splice(i, 1)
      }
    }
    ball.moveBy(attr.dx, attr.dy)
  })
}

function getRandomColor() {
  let letters = '0123456789ABCDEF'
  let color = '#F0'
  for (let i = 0; i < 4; i++) {
    color += letters[Math.floor(Math.random() * 16)]
  }
  return color
}

function bounce() {
  Velocity(balls, {y: 680}, {
    duration: 1600,
    easing: 'easeInSine'
  })
  Velocity(balls, {y: -680}, {
    duration: 1600,
    easing: 'easeOutSine',
    complete: bounce
  })
}

function keyPressName(evt) {
  let name = document.getElementById('name').value
  if (evt.keyCode === 13 && name !== "" && name !== me.name) {
    if (me.name === 'Nobody') {
      const ball = new Ball({name: name, x: 0, y: Math.random() * 1400 - 700, dx: -10, dy: Math.round(Math.random() * 70 - 35), r: 60, color: getRandomColor(), count: 0})
      balls.push(ball)
      doSend('ADD', {attr: ball.attr, id: ID})
    }
    me.name = name
    doSend('UPDATE', {player: me})
  }
}

function keyPressChat(evt) {
  let msg = document.getElementById('message').value
  if (evt.keyCode === 13 && msg !== "") {
    doSend('CHAT', {chat: me.name + ': ' + msg})
    document.getElementById('message').value = ""
  }
}

function onReceive(data) {
  let ts = new Date().getTime()
  let msg = JSON.parse(data)
  // calcLag(msg, ts)
  console.log("REC", msg)
  switch (msg.id) {
    case 'ID':
      // connected and server provides ID
      ID = msg.data.id
      doSend('JOIN', {name: 'Nobody', screen: {w: window.innerWidth, h: window.innerHeight}})
      break
    case 'PLAYERS':
      players = msg.data.players
      me = players.find(p => p.id === ID)
      document.getElementById('players').innerHTML = players.map(p => "<li>" + p.name + ' (' + p.screen.w + 'x' + p.screen.h + ')')
      break
    case 'PUSH':
      msg.data.attr.x = msg.data.attr.dx < 0 ? xMax + msg.data.attr.r : -xMax - msg.data.attr.r
      balls.push(new Ball(msg.data.attr))
      break
    case 'CHAT':
      chat.push(msg.data.chat)
      document.getElementById('chat').innerHTML = chat.join("\n")
      break
    case 'EXIT':
      players = msg.data.players
      me = players.find(p => p.id === ID)
      document.getElementById('players').innerHTML = players.map(p => "<li>" + p.name + ' (' + p.screen.w + 'x' + p.screen.h + ')')
      break
    default:
      console.log('???', msg)
      break
  }
}

function doSend(msgid, data) {
  if (webSocket && webSocket.readyState === WebSocket.OPEN) {
    let msg = {id: msgid, from: ID, ts: new Date().getTime(), data: data}
    console.log("SND ", msg)
    webSocket.send(JSON.stringify(msg))
  }
}

function onStatus(isOnline, ws) {
  document.getElementById('info').innerHTML = 'Hallo Team - ' + (isOnline ? 'Connected!' : 'Disconnected!')
  webSocket = ws
  if (!isOnline) {
    if (engineID) {
      clearInterval(engineID)
      engineID = null
    }
  } else {
    if (!engineID) {
      engineID = setInterval(engine, 20, {balls: balls})
    }
  }
  // console.log(isOnline, ws)
}

function createWebSocket(wsUri, onChange, onReceive) {
  try {
    const ws = new WebSocket(wsUri, 'echo-protocol')

    ws.onopen = function (evt) {
      onChange(true, ws)
    }

    ws.onclose = function (evt) {
      onChange(false, null)
    }

    ws.onerror = function (evt) {
      onChange(false, null)
      console.log('ERR', evt)
    }

    ws.onmessage = function (evt) {
      // console.log(evt.currentTarget, evt.srcElement, ws)
      onReceive(evt.data)
    }

  } catch (e) {
    console.log(e)
  }
}

function createElement(parent, type, attrs) {
  let elem = document.createElementNS(parent.namespaceURI, type)
  for (let attr in attrs) {
    elem.setAttribute(attr, attrs[attr])
  }
  parent.appendChild(elem)
  return elem
}
