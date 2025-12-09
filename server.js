const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: '*' } });
const mesas = {};


app.use(express.static('public'));

let state = {
  faults: { red: 0, blue: 0 },
  judges: {},           
  judgeCount: 4,        
  timer: 60,
  running: false
};


io.on('connection', socket => {

  socket.on("state", s => {
    if (!s || !s.judges) return;
    state = s;
    update();
});


  socket.on("joinMesa", mesaId => {

    if (!socket.mesaId || !mesas[socket.mesaId]) return;


    socket.join(mesaId);

    if (!mesas[mesaId]) {
        mesas[mesaId] = crearEstadoInicial();
        generateJudges(mesas[mesaId].judgeCount, mesas[mesaId]);
    }

    socket.mesaId = mesaId; // guardamos la mesa en el socket

    socket.emit("state", mesas[mesaId]);
});


  // enviar estado inicial al conectarse
  socket.emit('state', state);

  // CAMBIAR CANTIDAD DE JUECES (única versión correcta)
  socket.on("setJudges", n => {

    if (!socket.mesaId || !mesas[socket.mesaId]) return;

    if (n === 3 || n === 4) {
        state.judgeCount = n;
        generateJudges(n);
      const state = mesas[socket.mesaId];
io.to(socket.mesaId).emit("state", state);

    }
  });

  // RESET
socket.on('reset', () => {

  if (!socket.mesaId || !mesas[socket.mesaId]) return;


    // Apagamos el timer PRIMERO
    state.running = false;

    // Reset faltas + puntos
    state.faults = { red: 0, blue: 0 };
    for (let j in state.judges) {
        state.judges[j].red = 0;
        state.judges[j].blue = 0;
    }

   const state = mesas[socket.mesaId];
io.to(socket.mesaId).emit("state", state);
   // avisamos inmediatamente
});



  // PUNTOS
  socket.on('punto', data => {

    if (!socket.mesaId || !mesas[socket.mesaId]) return;

    const j = parseInt(data.juez);

    if (!state.judges[j]) return;

    if (data.color === 'red')  state.judges[j].red++;
    if (data.color === 'blue') state.judges[j].blue++;

   const state = mesas[socket.mesaId];
io.to(socket.mesaId).emit("state", state);

  });

  // FALTAS
  socket.on('fault', color => {

    if (!socket.mesaId || !mesas[socket.mesaId]) return;

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

    if (!socket.mesaId || !mesas[socket.mesaId]) return;

    state.timer = t.value;
    state.running = t.running;
    const state = mesas[socket.mesaId];
io.to(socket.mesaId).emit("state", state);

  });
});


// intervalo del timer
setInterval(() => {

  for (const mesaId in mesas) {
    const state = mesas[mesaId];
    if (state.running && state.timer > 0) {
      state.timer--;
      io.to(mesaId).emit("state", state);
    }
  }
}, 1000);


function crearEstadoInicial() {
  return {
    faults: { red: 0, blue: 0 },
    judges: {},
    judgeCount: 4,
    timer: 60,
    running: false
  };
}

function generateJudges(n, state) {
    state.judges = {};
    for (let i = 1; i <= n; i++) {
        state.judges[i] = { red: 0, blue: 0 };
    }
}




http.listen(3000, () => console.log('Server TKD en 3000'));
