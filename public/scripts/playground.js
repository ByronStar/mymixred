let webSocket
let ID
let me
let players = {}
let chat = []
let layer
let balls = []
let engineID
let xMax = 1280
let yMax = 720

function init() {
  console.log(location)
  createWebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host, onStatus, onReceive)
  layer = document.getElementById('layer2')
  console.log(layer)
  //bounce()
}

function Ball(name, cx, cy, r, color, count) {
  this.name = name
  this.cx = cx
  this.cy = cy
  this.r = r
  this.color = color
  this.count = count
  this.g = createElement(layer, 'g', {transform: 'translate(' + this.cx + ',' + this.cy + ')'})
  this.ball = createElement(this.g, 'circle', {
    'cx': 0,
    'cy': 0,
    'r': this.r,
    'fill': this.color
  })
  this.label = createElement(this.g, 'text', {x: 0, y: 6, style: "text-anchor: middle; font-size: 24px"})
  this.label.textContent = this.name
  this.info = createElement(this.g, 'text', {x: 0, y: 30, style: "text-anchor: middle; font-size: 24px"})
  this.info.textContent = this.count

  this.setName = function (name) {
    this.name = name
    this.label.textContent = this.name
  }

  this.countUp = function () {
    this.count++
    this.info.textContent = this.count
  }

  this.moveBy = function (dx, dy) {
    this.cx += dx
    this.cy += dy
    this.g.setAttribute('transform', 'translate(' + this.cx + ',' + this.cy + ')')
    // this.ball.setAttribute('cx', this.cx)
    // this.ball.setAttribute('cy', this.cy)
  }
}

function engine(cfg) {
  let m = 5
  cfg.balls.forEach((ball, i) => {
    if (ball.cx - ball.r - m <= -xMax && ball.cx - ball.r > -xMax) {
      // console.log('ADD', ball.cx)
      doSend('PUSH', {ball: {name: ball.name, cx: ball.cx, cy: ball.cy, r: ball.r, color: ball.color, count: ball.count}, to: players[(players.length + players.findIndex(p => p.id === ID) - 1) % players.length].id})
      // clearInterval(engineID)
    } else {
      if (ball.cx + ball.r <= -xMax) {
        // console.log('DEL', ball.cx)
        balls.splice(i, 1)
      }
    }
    ball.moveBy(-m, 0)
  })
}

function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#F0';
  for (var i = 0; i < 4; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function bounce() {
  Velocity(balls, {cy: 680}, {
    duration: 1600,
    easing: 'easeInSine'
  })
  Velocity(balls, {cy: -680}, {
    duration: 1600,
    easing: 'easeOutSine',
    complete: bounce
  })
}

function keyPressName(evt) {
  let name = document.getElementById('name').value
  if (evt.keyCode === 13 && name !== "" && name !== me.name) {
    if (me.name === 'Nobody') {
      balls[0].setName(name)
      engineID = setInterval(engine, 20, {balls: balls})
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
      balls.push(new Ball('Me', 0, Math.random()*1400-700, 60, getRandomColor(), 0))
      break
    case 'PLAYERS':
      players = msg.data.players
      me = players.find(p => p.id === ID)
      document.getElementById('players').innerHTML = players.map(p => "<li>" + p.name + ' (' + p.screen.w + 'x' + p.screen.h + ')')
      break
    case 'PUSH':
      balls.push(new Ball(msg.data.ball.name, 1280 + msg.data.ball.r, msg.data.ball.cy, msg.data.ball.r, msg.data.ball.color, msg.data.ball.count + 1))
      break
    case 'CHAT':
      chat.push(msg.data.chat)
      document.getElementById('chat').innerHTML = chat.join("\n")
      break
    case 'EXIT':
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
