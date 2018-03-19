let webSocket
let ID
let me
let players = {}
let chat = []
let layer
let balls = []

function init() {
  console.log(location)
  createWebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host, onStatus, onReceive)
  layer = document.getElementById('layer2')
  console.log(layer)
  balls.push(createElement(layer, 'circle', {
    'cx': -600,
    'cy': -680,
    'r': 40,
    'fill': 'blue'
  }));
  bounce()
}

function bounce() {
  Velocity(balls, { cy: 680}, {
    duration: 1600,
    easing: 'easeInSine'
  })
  Velocity(balls, { cy: -680}, {
    duration: 1600,
    easing: 'easeOutSine',
    complete: bounce
  })
}

function keyPressName(evt) {
  let name = document.getElementById('name').value
  if (evt.keyCode === 13 && name !== "" && name !== me.name) {
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
  console.log(isOnline, ws)
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
