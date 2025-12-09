const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: '*' } });

app.use(express.static('public'));

let state = {
  faults: { red: 0, blue: 0 },
  judges: {},           
  judgeCount: 4,        
  timer: 60,
  running: false
};


io.on('connection', socket => {

  // enviar estado inicial al conectarse
  socket.emit('state', state);

  // CAMBIAR CANTIDAD DE JUECES (única versión correcta)
  socket.on("setJudges", n => {
    if (n === 3 || n === 4) {
        state.judgeCount = n;
        generateJudges(n);
        io.emit("state", state);
    }
  });

  // RESET
socket.on('reset', () => {

    // Apagamos el timer PRIMERO
    state.running = false;

    // Reset faltas + puntos
    state.faults = { red: 0, blue: 0 };
    for (let j in state.judges) {
        state.judges[j].red = 0;
        state.judges[j].blue = 0;
    }

    io.emit('state', state);   // avisamos inmediatamente
});



  // PUNTOS
  socket.on('punto', data => {
    const j = parseInt(data.juez);

    if (!state.judges[j]) return;

    if (data.color === 'red')  state.judges[j].red++;
    if (data.color === 'blue') state.judges[j].blue++;

    io.emit('state', state);
  });

  // FALTAS
  socket.on('fault', color => {
    state.faults[color]++;
    if (state.faults[color] === 3) {
      for (let j in state.judges) {
        state.judges[j][color]--;
      }
      state.faults[color] = 0;
    }
    io.emit('state', state);
  });

  // TIMER
  socket.on('timer', t => {
    state.timer = t.value;
    state.running = t.running;
    io.emit('state', state);
  });
});


// intervalo del timer
setInterval(() => {
  if (state.running && state.timer > 0) {
    state.timer--;
    io.emit('state', state);
  }
}, 1000);

function generateJudges(n) {
    state.judges = {};
    for (let i = 1; i <= n; i++) {
        state.judges[i] = { red: 0, blue: 0 };
    }
}

generateJudges(state.judgeCount);

http.listen(3000, () => console.log('Server TKD en 3000'));
