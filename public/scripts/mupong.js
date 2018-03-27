let webSocket
let ID
let me
let players = {}
let chat = []
let balls = []
let engine, paddle
let ballId = null

const ballOpts = {
  label: 'ball',
  // density: 0.1,
  restitution: 1.0,
  friction: 0.00,
  frictionAir: 0.00000,
  render: {fillStyle: '#808080', strokeStyle: 'transparent'},
  collisionFilter: {
    group: 0,
    mask: 0x0001
  }
}

// module aliases

function init() {
  console.log(location)
  createWebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host, onStatus, onReceive)

// create an engine
  engine = Matter.Engine.create()
  engine.world.gravity.y = 0

  // create a renderer
  let render = Matter.Render.create({
    element: document.getElementById('matter'),
    engine: engine,
    options: {
      width: window.innerWidth,
      height: window.innerHeight,
      background: 'transparent',
      wireframeBackground: 'transparent',
      wireframes: false,
      showAngleIndicator: true,
      showCollisions: true,
      showVelocity: true
    }
  })

// walls and sensors
  const off = 0
  const w = window.innerWidth - off * 2
  const h = window.innerHeight - off * 2
  paddle = Matter.Bodies.rectangle(w / 2 + off, h / 2 + off, 40, 200, {
    isStatic: true,
    label: 'paddle',
    render: {
      fillStyle: '#808080',
      strokeStyle: 'transparent'
    },
    collisionFilter: {
      group: 0,
      category: 0x0001
    }
  })
  let wT = Matter.Bodies.rectangle(w / 2 + off, -10 + off, w + 200, 20, {isStatic: true, label: 'bounceT'})
  let wB = Matter.Bodies.rectangle(w / 2 + off, h + 10 + off, w + 200, 20, {isStatic: true, label: 'bounceB'})
  let wL = Matter.Bodies.rectangle(-10 + off, h / 2 + off, 20, h + 200, {isStatic: true, isSensor: true, label: 'passL'})
  let wR = Matter.Bodies.rectangle(w + 10 + off, h / 2 + off, 20, h + 200, {isStatic: true, isSensor: true, label: 'passR'})

// add all of the bodies to the world
  Matter.World.add(engine.world, [paddle, wB, wT, wL, wR])

  Matter.Events.on(engine, 'collisionStart', function (event) {
    var pairs = event.pairs
    pairs.forEach(pair => {
        const hit = pair.bodyA.label === 'ball' ? pair.bodyB : pair.bodyA;
        const ball = pair.bodyA.label === 'ball' ? pair.bodyA : pair.bodyB;
        if (hit.label === 'passL' && ball.velocity.x < 0) {
          balls.find(b => b.ball === ball).push()
        }
        if (hit.label === 'passR' && ball.velocity.x > 0) {
          balls.find(b => b.ball === ball).push()
        }
      }
    )
  })

  Matter.Events.on(engine, 'collisionEnd', function (event) {
    var pairs = event.pairs
    pairs.forEach(pair => {
        const hit = pair.bodyA.label === 'ball' ? pair.bodyB : pair.bodyA;
        const ball = pair.bodyA.label === 'ball' ? pair.bodyA : pair.bodyB;
        if (hit.label === 'passL' && ball.velocity.x < 0) {
          Matter.World.remove(engine.world, ball);
          // console.log('DEL', ball)
        }
        if (hit.label === 'passR' && ball.velocity.x > 0) {
          Matter.World.remove(engine.world, ball);
          // console.log('DEL', ball)
        }
      }
    )
  })
  // run the engine
  Matter.Engine.run(engine)

// run the renderer
  Matter.Render.run(render)

  document.addEventListener('keydown', function (evt) {
    switch (evt.key) {
      case 'ArrowUp':
        evt.preventDefault();
        if (paddle.position.y > 100) {
          Matter.Body.setPosition(paddle, {x: paddle.position.x, y: paddle.position.y - 20});
        }
        break
      case 'ArrowDown':
        evt.preventDefault();
        if (paddle.position.y < window.innerHeight - 100) {
          Matter.Body.setPosition(paddle, {x: paddle.position.x, y: paddle.position.y + 20});
        }
        break
      default:
      // console.log(evt.key)
    }
  })
}

function Ball(attr) {
  this.attr = attr
  this.ball = Matter.Bodies.circle(this.attr.x, this.attr.y, this.attr.r, ballOpts)
  // this.ball.label = this.attr.name
  this.ball.render.fillStyle = this.attr.color
  this.ball.collisionFilter.group = -this.attr.id - 1
  Matter.World.add(engine.world, [this.ball])
  Matter.Body.setVelocity(this.ball, {x: this.attr.dx, y: this.attr.dy});
  console.log(this.ball.collisionFilter)
  // Matter.Body.applyForce(this.ball, {x: this.attr.x, y: this.attr.y}, {x: this.attr.dx, y: this.attr.dy})

  this.push = function () {
    let attr = {id: this.attr.id, name: this.attr.name, x: this.ball.velocity.x < 0 ? window.innerWidth + this.attr.r : -this.attr.r, y: this.ball.position.y, dx: this.ball.velocity.x, dy: this.ball.velocity.y, r: this.attr.r, color: this.attr.color, count: this.attr.count + 1}
    // console.log('PUSH', attr)
    doSend('PUSH', {attr: attr})
  }
}

function getRandomColor() {
  let letters = '0123456789ABCDEF'
  let color = '#'
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)]
  }
  return color
}

function keyPressName(evt) {
  let name = document.getElementById('name').value
  if (evt.keyCode === 13 && name !== "" && name !== me.name) {
    if (me.name === 'Nobody') {
      doSend('ADD', {attr: {name: name, x: 0, y: Math.round(Math.random() * window.innerHeight), dx: Math.random() > 0.5 ? 10 : 10, dy: 10 + Math.random() * 10, r: 60, color: getRandomColor(), count: 0}})
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
  // console.log("REC", msg)
  switch (msg.id) {
    case 'ID':
      // connected and server provides ID
      ID = msg.data.id
      doSend('JOIN', {name: 'Nobody', screen: {w: window.innerWidth, h: window.innerHeight}})
      break
    case 'PLAYERS':
      players = msg.data.players
      me = players.find(p => p.id === ID)
      document.getElementById('players').innerHTML = players.map(p => '<li>' + p.name + ' (' + p.screen.w + 'x' + p.screen.h + ')')
      break
    case 'PUSH':
      const ball = new Ball(msg.data.attr)
      balls.push(ball)
      if (0 === paddle.collisionFilter.group) {
        paddle.collisionFilter.group = -msg.data.attr.id - 1
        paddle.render.fillStyle = msg.data.attr.color
        console.log(paddle.collisionFilter)
        // doSend('CHAT', {chat: JSON.stringify(paddle.collisionFilter)})
        // doSend('CHAT', {chat: JSON.stringify(ball.ball.collisionFilter)})
      }
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
    // console.log("SND ", msg)
    webSocket.send(JSON.stringify(msg))
  }
}

function onStatus(isOnline, ws) {
  document.getElementById('info').innerHTML = 'Hallo Team - ' + (isOnline ? 'Connected!' : 'Disconnected!')
  webSocket = ws
  // if (!isOnline) {
  //   if (engineID) {
  //     clearInterval(engineID)
  //     engineID = null
  //   }
  // } else {
  //   if (!engineID) {
  //     engineID = setInterval(engine, 20, {balls: balls})
  //   }
  // }
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