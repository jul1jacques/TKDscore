const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "data", "configuracion.json");

let configuracionTorneo = null;

let mesaFormas = {
    categoriaActual: null,
    rondaActual: 0,
    combateActual: 0,
    rojoNombre: "",
    azulNombre: ""
};

// Cargar configuración al iniciar
if (fs.existsSync(configPath)) {
    configuracionTorneo = JSON.parse(
        fs.readFileSync(configPath, "utf8")
    );
    console.log("CONFIG CARGADA DESDE ARCHIVO");
}

const multer = require("multer");
const XLSX = require("xlsx");

function clasificarCompetidores(lista, config) {

    if (!config || !config.pesos) {
        console.log("CONFIG RECIBIDA EN CLASIFICAR:", config);
        return {};
    }

    const categorias = {};

    lista.forEach(comp => {

        const edad = comp.edad;
        const cinturon = comp.graduacion;
        const genero = comp.genero;
        const pesoNumero = Number(comp.peso);

        if (!edad || !cinturon || !genero || !pesoNumero) return;

        const rangosGenero = config.pesos[genero] || [];

    let rangoPesoNombre = "sin-rango";

for (const rango of rangosGenero) {
    if (pesoNumero >= rango.min && pesoNumero <= rango.max) {
        rangoPesoNombre = `${rango.min}-${rango.max}kg`;
        break;
    }
}

        const clave = `${edad}-${cinturon}-${genero}-${rangoPesoNombre}`;

        if (!categorias[clave]) {
            categorias[clave] = [];
        }

        categorias[clave].push(comp);
    });

    return categorias;
}

const upload = multer({ dest: "uploads/" });

let torneo = {
    competidores: [],
    categoriasPropuestas: {},
    categoriasConfirmadas: {},
    brackets: {},
    campeones: {},
    combateActual: null
};

function guardarConfiguracion() {
    fs.writeFileSync(configPath, JSON.stringify(configuracionTorneo, null, 2));
}

console.log("Estoy ejecutando desde:");
console.log(__dirname);

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: '*' } });

app.use(express.static("public"));
app.use(express.json());

app.post("/subir-excel", upload.single("archivo"), (req, res) => {
  try {

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log("CONFIG EN SUBIR EXCEL:", configuracionTorneo);

    torneo.competidores = data;
torneo.categoriasPropuestas = clasificarCompetidores(data);

if (!configuracionTorneo) {
    return res.status(400).json({
        error: "No hay configuración cargada"
    });
}

  if (!configuracionTorneo) {
  console.log("No hay configuración cargada");
  torneo.categoriasPropuestas = {};
} else {
  torneo.categoriasPropuestas = clasificarCompetidores(
    data,
    configuracionTorneo
  );
}
    console.log("CATEGORIAS GENERADAS:", torneo.categoriasPropuestas);

  res.json({
  cantidad: data.length,
  categorias: torneo.categoriasPropuestas
    ? Object.keys(torneo.categoriasPropuestas).length
    : 0
});
  } catch (error) {
    console.error("ERROR SUBIR EXCEL:", error);
    res.status(500).json({ error: "Error procesando Excel" });
  }
});
// Estado global de mesas
const mesas = {};

function recalcularTotales(mesa) {
    let r = 0;
    let b = 0;

    for (const j in mesa.judges) {
        r += mesa.judges[j].red;
        b += mesa.judges[j].blue;
    }

    mesa.totalRed = r;
    mesa.totalBlue = b;
}

function crearEstadoInicial() {
    return {
        modo: "combate",
        faults: { red: 0, blue: 0 },
        judges: {},
        juecesConectados: {},
        totalRed: 0,
        totalBlue: 0,
        timer: configuracionTorneo.roundTime || 60,
        roundTime: configuracionTorneo.roundTime || 60,
        restTime: configuracionTorneo.restTime || 0,
        roundCount: configuracionTorneo.roundCount || 1,
        running: false,
        judgeCount: 4,
        phase: "idle"
    };
}

function generateJudges(n, state) {
    state.judges = {};
    for (let i = 1; i <= n; i++) {
        state.judges[i] = { red: 0, blue: 0 };
    }
}

app.post("/reportar-ganador-formas", (req, res) => {

    const { categoria, ronda, combate, color } = req.body;

    const rounds = torneo.brackets[categoria];

    const combateActual = rounds[ronda][combate];

    if (!combateActual) {
        return res.status(400).json({ error: "Combate no encontrado" });
    }

    // Obtener ganador real
    const ganador =
        color === "red"
            ? combateActual.rojo
            : combateActual.azul;

    combateActual.ganador = ganador;

    mesaFormas.mostrarGanador = true;
mesaFormas.nombreGanador = ganador.nombre + " " + ganador.apellido;
mesaFormas.colorGanador = color;

    /* ===== PROPAGAR A SIGUIENTE RONDA ===== */

    const siguienteRonda = rounds[ronda + 1];

    if (siguienteRonda) {

        const indexSiguiente = Math.floor(combate / 2);

        if (combate % 2 === 0) {
            siguienteRonda[indexSiguiente].rojo = ganador;
        } else {
            siguienteRonda[indexSiguiente].azul = ganador;
        }
    }

    /* ===== AVANZAR COMBATE ===== */

    mesaFormas.combateActual++;

    const siguiente =
        rounds[ronda][mesaFormas.combateActual];

    if (siguiente) {

        mesaFormas.rojoNombre = siguiente.rojo
            ? siguiente.rojo.nombre + " " + siguiente.rojo.apellido
            : "";

        mesaFormas.azulNombre = siguiente.azul
            ? siguiente.azul.nombre + " " + siguiente.azul.apellido
            : "";

    } else {
        // Terminó la ronda → pasar a siguiente
        mesaFormas.rondaActual++;
        mesaFormas.combateActual = 0;

        const nuevo =
            rounds[mesaFormas.rondaActual]?.[0];

        if (nuevo) {
            mesaFormas.rojoNombre = nuevo.rojo
                ? nuevo.rojo.nombre + " " + nuevo.rojo.apellido
                : "";

            mesaFormas.azulNombre = nuevo.azul
                ? nuevo.azul.nombre + " " + nuevo.azul.apellido
                : "";
        }
    }

    io.emit("stateFormas", mesaFormas);

    socket.on("overlayFormasMostrado", () => {
    mesaFormas.mostrarGanador = false;
});

    res.json({ ok: true });
});

app.get("/categorias-propuestas", (req, res) => {
    res.json(torneo.categoriasPropuestas);
});

app.post("/asignar-combate-formas", (req,res)=>{

    const { categoria, ronda, combate } = req.body;

    const combateActual =
        torneo.brackets[categoria][ronda][combate];

    mesaFormas = {
        categoriaActual: categoria,
        rondaActual: ronda,
        combateActual: combate,
        rojoNombre: combateActual.rojo
            ? combateActual.rojo.nombre + " " + combateActual.rojo.apellido
            : "",
        azulNombre: combateActual.azul
            ? combateActual.azul.nombre + " " + combateActual.azul.apellido
            : ""
    };

    io.emit("stateFormas", mesaFormas);

    res.json({ok:true});
});

app.post("/reportar-ganador-formas", (req, res) => {

    const { categoria, ronda, combate, color } = req.body;

    const rounds = torneo.brackets[categoria];

    const combateActual = rounds[ronda][combate];

    if (!combateActual) {
        return res.status(400).json({ error: "Combate no encontrado" });
    }

    // Obtener ganador real
    const ganador =
        color === "red"
            ? combateActual.rojo
            : combateActual.azul;

    combateActual.ganador = ganador;

    /* ===== PROPAGAR A SIGUIENTE RONDA ===== */

    const siguienteRonda = rounds[ronda + 1];

    if (siguienteRonda) {

        const indexSiguiente = Math.floor(combate / 2);

        if (combate % 2 === 0) {
            siguienteRonda[indexSiguiente].rojo = ganador;
        } else {
            siguienteRonda[indexSiguiente].azul = ganador;
        }
    }

    /* ===== AVANZAR COMBATE ===== */

    mesaFormas.combateActual++;

    const siguiente =
        rounds[ronda][mesaFormas.combateActual];

    if (siguiente) {

        mesaFormas.rojoNombre = siguiente.rojo
            ? siguiente.rojo.nombre + " " + siguiente.rojo.apellido
            : "";

        mesaFormas.azulNombre = siguiente.azul
            ? siguiente.azul.nombre + " " + siguiente.azul.apellido
            : "";

    } else {
        // Terminó la ronda → pasar a siguiente
        mesaFormas.rondaActual++;
        mesaFormas.combateActual = 0;

        const nuevo =
            rounds[mesaFormas.rondaActual]?.[0];

        if (nuevo) {
            mesaFormas.rojoNombre = nuevo.rojo
                ? nuevo.rojo.nombre + " " + nuevo.rojo.apellido
                : "";

            mesaFormas.azulNombre = nuevo.azul
                ? nuevo.azul.nombre + " " + nuevo.azul.apellido
                : "";
        }
    }

    io.emit("stateFormas", mesaFormas);

avanzarLibres(categoria);

res.json({ ok: true });
});

app.post("/confirmar-torneo", (req, res) => {

    torneo.categoriasConfirmadas = torneo.categoriasPropuestas;
    torneo.brackets = {};

    for (let cat in torneo.categoriasConfirmadas) {
        const lista = torneo.categoriasConfirmadas[cat];
        torneo.brackets[cat] = generarBracket(lista);
    }

    res.json({
        mensaje: "Torneo confirmado",
        categoriasFinales: Object.keys(torneo.categoriasConfirmadas).length
    });
});


app.post("/reportar-ganador", express.json(), (req, res) => {

    try {

        const { categoria, ronda, combate, color } = req.body;

        console.log("REPORTAR GANADOR:");
        console.log("Categoria:", categoria);
        console.log("Ronda:", ronda);
        console.log("Combate:", combate);
        console.log("Color:", color);

        const bracket = torneo.brackets[categoria];
        const match = bracket[ronda][combate];

        const ganador = color === "red" ? match.rojo : match.azul;
        match.ganador = ganador;

        if (bracket[ronda + 1]) {

            const siguienteMatch = bracket[ronda + 1][Math.floor(combate / 2)];

            if (combate % 2 === 0)
                siguienteMatch.rojo = ganador;
            else
                siguienteMatch.azul = ganador;

        } else {
            torneo.campeones[categoria] = ganador;
        }

        res.json({ mensaje: "Ganador avanzado" });

    } catch (error) {
        console.error("ERROR REPORTAR GANADOR:", error);
        res.status(500).json({ error: "Error interno" });
    }
});


app.get("/brackets", (req, res) => {
    res.json(torneo.brackets);
});

app.post("/fusionar-categorias", express.json(), (req, res) => {

    const { origen, destino } = req.body;

    if (!torneo.categoriasPropuestas[origen] || 
        !torneo.categoriasPropuestas[destino]) {
        return res.status(400).json({ error: "Categoría inválida" });
    }

    const generoOrigen = origen.split(" - ")[2];
    const generoDestino = destino.split(" - ")[2];

    if (generoOrigen !== generoDestino) {
        return res.status(400).json({ error: "No se pueden fusionar géneros distintos" });
    }

    torneo.categoriasPropuestas[destino] = [
        ...torneo.categoriasPropuestas[destino],
        ...torneo.categoriasPropuestas[origen]
    ];

    delete torneo.categoriasPropuestas[origen];

    res.json({ mensaje: "Fusionadas correctamente" });
});

function generarBracket(lista) {

    const jugadores = [...lista].sort(() => Math.random() - 0.5);

    const rondas = [];

    const primera = [];
    for (let i = 0; i < jugadores.length; i += 2) {
        primera.push({
            rojo: jugadores[i],
            azul: jugadores[i+1] || null,
            ganador: null
        });
    }

    rondas.push(primera);

    let cantidad = primera.length;

    while (cantidad > 1) {
        const siguiente = [];
        for (let i = 0; i < cantidad; i += 2) {
            siguiente.push({
                rojo: null,
                azul: null,
                ganador: null
            });
        }
        rondas.push(siguiente);
        cantidad = siguiente.length;
    }

    return rondas;
}

app.post("/asignar-combate", express.json(), (req, res) => {

    try {

        console.log("BODY:", req.body);

        const { categoria, ronda, combate, mesaId } = req.body;

        console.log("Categoria:", categoria);
        console.log("Ronda:", ronda);
        console.log("Combate:", combate);
        console.log("MesaId:", mesaId);

        

        if (!torneo.brackets[categoria]) {
            console.log("NO EXISTE CATEGORIA EN BRACKETS");
            return res.status(400).json({ error: "Categoria inválida" });
        }

        if (!torneo.brackets[categoria][ronda]) {
            console.log("NO EXISTE RONDA");
            return res.status(400).json({ error: "Ronda inválida" });
        }

        if (!torneo.brackets[categoria][ronda][combate]) {
            console.log("NO EXISTE COMBATE");
            return res.status(400).json({ error: "Combate inválido" });
        }

        if (!mesas[mesaId]) {
            console.log("NO EXISTE MESA");
            return res.status(400).json({ error: "Mesa inválida" });
        }

        const pelea = torneo.brackets[categoria][ronda][combate];
        const mesa = mesas[mesaId];

        mesa.categoriaActual = categoria;
        mesa.rondaActual = ronda;

const combateActual =
    torneo.brackets[categoria][ronda][combate];

mesa.rojoNombre = combateActual.rojo
    ? combateActual.rojo.nombre + " " + combateActual.rojo.apellido
    : "";

mesa.azulNombre = combateActual.azul
    ? combateActual.azul.nombre + " " + combateActual.azul.apellido
    : "";
            // 🔥 Aplicar configuración de combate según categoría

const partes = categoria.split(" - ");
const edad = partes[0];
const grupo = partes[1];

const configCombate = configuracionTorneo.combate?.[edad]?.[grupo];

if (configCombate) {
    mesa.roundTime = parseInt(configCombate.roundTime);
    mesa.restTime = parseInt(configCombate.rest);
    mesa.roundCount = parseInt(configCombate.rounds);
    mesa.judgeCount = parseInt(configCombate.judges);

    mesa.timer = parseInt(configCombate.roundTime);
}

        io.to(mesaId).emit("state", mesa);

        res.json({ ok: true });

    } catch (err) {
        console.log("ERROR EN ASIGNAR:", err);
        res.status(500).json({ error: "Error interno" });
    }
});


app.get("/categorias-disponibles", (req,res)=>{
    res.json(Object.keys(torneo.brackets));
});

// █████████████████████████████████████████████
//  SOCKET.IO - TODA LA LÓGICA DEBE IR AQUÍ ADENTRO
// █████████████████████████████████████████████
io.on('connection', socket => {



   socket.on("cambiarModoMesa", ({ mesaId, modo }) => {

    console.log("CAMBIAR MODO:", mesaId, modo);

    if (!mesas[mesaId]) return;
    
    mesa.modo = modo;
io.to(mesaId).emit("state", mesa);

    mesas[mesaId].modo = modo;

    io.to(mesaId).emit("state", mesas[mesaId]);
    io.emit("estadoMesas", mesas);
});
    socket.on("disconnect", () => {
    if (socket.mesaId && socket.juezId && mesas[socket.mesaId]) {
        delete mesas[socket.mesaId].juecesConectados[socket.juezId];
        io.emit("estadoMesas", mesas);
    }
});

socket.on("obtenerConfiguracion", () => {
    if (configuracionTorneo) {
        socket.emit("configuracionActual", configuracionTorneo);
    } else {
        socket.emit("configuracionActual", null);
    }
});

socket.on("startFight", () => {
    const mesa = mesas[socket.mesaId];
    if (!mesa) return;

    mesa.phase = "round1";
    mesa.timer = mesa.roundTime;
    mesa.running = true;

    io.to(socket.mesaId).emit("state", mesa);
});

socket.on("overlayMostrado", () => {
    const mesa = mesas[socket.mesaId];
    if (!mesa) return;

    mesa.mostrarOverlay = false;
});

function generateJudges(n, mesa) {
    mesa.judges = {};

    for (let i = 1; i <= n; i++) {
        mesa.judges[i] = { red: 0, blue: 0 };
    }

    mesa.numJudges = n;
}

    socket.on("juezJoin", ({ mesaId, juezId }) => {
    if (!mesaId || !juezId) return;
    if (!mesas[mesaId]) return;

    socket.mesaId = mesaId;
    socket.juezId = juezId;

    mesas[mesaId].juecesConectados[juezId] = true;

    io.emit("estadoMesas", mesas);
});


    // SUPERVISOR
    socket.on("supervisor", () => {
        socket.emit("estadoMesas", mesas);
    });

    // Unirse a una mesa
    socket.on('joinMesa', mesaId => {
        if (!mesaId) return;

        socket.join(mesaId);
        socket.mesaId = mesaId;

     if (!mesas[mesaId]) {

    mesas[mesaId] = crearEstadoInicial();

    // 🔥 Aplicar configuración del torneo
    mesas[mesaId].roundTime = configuracionTorneo.roundTime || 60;
    mesas[mesaId].restTime = configuracionTorneo.restTime || 0;
    mesas[mesaId].roundCount = configuracionTorneo.roundCount || 1;

    generateJudges(mesas[mesaId].judgeCount, mesas[mesaId]);
}

        socket.emit('state', mesas[mesaId]);

if(torneo.combateActual){

    mesas[mesaId].rojoNombre =
        torneo.combateActual.rojo.Nombre + " " + torneo.combateActual.rojo.Apellido;

    mesas[mesaId].azulNombre =
        torneo.combateActual.azul 
        ? torneo.combateActual.azul.Nombre + " " + torneo.combateActual.azul.Apellido
        : "Libre";
}
        
    });

socket.on("pausarReanudar", () => {

    const mesa = mesas[socket.mesaId];
    if (!mesa) {
        console.log("NO HAY MESA");
        return;
    }

    console.log("ANTES:", mesa.running, "PHASE:", mesa.phase);

    mesa.running = !mesa.running;

    console.log("DESPUES:", mesa.running);

    io.to(socket.mesaId).emit("state", mesa);
});

    // Cambiar jueces
    socket.on("setJudges", n => {
        if (!socket.mesaId || !mesas[socket.mesaId]) return;
        const mesa = mesas[socket.mesaId];

        if (n === 3 || n === 4) {
            mesa.judgeCount = n;
            generateJudges(n, mesa);

            io.to(socket.mesaId).emit("state", mesa);
            io.emit("estadoMesas", mesas);
        }
    });

    // RESET
    socket.on("reset", () => {
        const mesa = mesas[socket.mesaId];

        mesa.faults = { red: 0, blue: 0 };

        for (let j in mesa.judges) {
            mesa.judges[j].red = 0;
            mesa.judges[j].blue = 0;
        }

        recalcularTotales(mesa);

        io.to(socket.mesaId).emit("state", mesa);
        io.emit("estadoMesas", mesas);
    });


    socket.on("siguienteCombate", () => {

        const mesa = mesas[socket.mesaId];

        mesa.mostrarOverlay = false;
        mesa.winner = null;

        mesa.ganadorReportado = false;

        mesa.overlayMostrado = false;

    console.log("ANTES:");
console.log("rondaActual:", mesa.rondaActual);
console.log("combateActual:", mesa.combateActual);

    if(!mesa) return;

    const bracket = torneo.brackets[mesa.categoriaActual];
    if(!bracket) return;

    let ronda = mesa.rondaActual;
    let combate = mesa.combateActual + 1;

    // Si no existe ese combate, pasar a siguiente ronda
    if(!bracket[ronda] || !bracket[ronda][combate]){
        ronda++;
        combate = 0;

        // Si tampoco existe la siguiente ronda → terminó la llave
        if(!bracket[ronda] || !bracket[ronda][combate]){
            console.log("LLAVE TERMINADA");
            return;
        }
    }

    // Actualizar estado
    mesa.rondaActual = ronda;
    mesa.combateActual = combate;

    const pelea = bracket[ronda][combate];

    // Resetear
    mesa.judges = {};
    generateJudges(mesa.judgeCount, mesa);
    mesa.faults = { red:0, blue:0 };
    mesa.timer = mesa.roundTime;
    mesa.running = false;

    mesa.rojoNombre = pelea.rojo
        ? pelea.rojo.Nombre + " " + pelea.rojo.Apellido
        : "Libre";

    mesa.azulNombre = pelea.azul
        ? pelea.azul.Nombre + " " + pelea.azul.Apellido
        : "Libre";

    io.to(socket.mesaId).emit("state", mesa);

    console.log("Avanzó a:", ronda, combate);
});

    // PUNTOS
 socket.on("punto", ({ juez, color }) => {

    const mesa = mesas[socket.mesaId];
    if (!mesa) return;

    mesa.judges[juez][color]++;

    recalcularTotales(mesa);

    io.to(socket.mesaId).emit("state", mesa);   // ← ESTO ES CLAVE
    io.emit("estadoMesas", mesas);              // supervisor
});

    // FALTAS
    socket.on("fault", color => {
        const mesa = mesas[socket.mesaId];

        mesa.faults[color]++;

        if (mesa.faults[color] === 3) {
            for (let j in mesa.judges) {
                mesa.judges[j][color]--;
            }
            mesa.faults[color] = 0;
        }

        recalcularTotales(mesa);

        io.to(socket.mesaId).emit("state", mesa);
        io.emit("estadoMesas", mesas);
    });

    // TIMER
    socket.on('timer', t => {
        if (!socket.mesaId || !mesas[socket.mesaId]) return;

        const mesa = mesas[socket.mesaId];
        mesa.timer = t.value;
        mesa.running = t.running;

        io.to(socket.mesaId).emit("state", mesa);
        io.emit("estadoMesas", mesas);
    });
});

// TIMER GENERAL
setInterval(() => {

    io.emit("estadoMesas", mesas);

    for (const mesaId in mesas) {

        const mesa = mesas[mesaId];

        if (!mesa.running) continue;

        // ⏱️ Si todavía hay tiempo, descontar
        if (mesa.timer > 0) {
            mesa.timer--;
            io.to(mesaId).emit("state", mesa);
            continue;
        }

        // ===== CAMBIO DE FASE =====

        if (mesa.phase === "round1") {

            if (mesa.roundCount === 1) {

                finalizarCombate(mesa);

            } else if (mesa.restTime > 0) {

                mesa.phase = "rest";
                mesa.timer = mesa.restTime;

            } else {

                mesa.phase = "round2";
                mesa.timer = mesa.roundTime;

            }

        } 
        else if (mesa.phase === "rest") {

            mesa.phase = "round2";
            mesa.timer = mesa.roundTime;

        } 
        else if (mesa.phase === "round2") {

            finalizarCombate(mesa);

        }

        io.to(mesaId).emit("state", mesa);
        io.emit("estadoMesas", mesas);
    }

}, 1000);


// ===== FINALIZAR COMBATE LIMPIO =====

function finalizarCombate(mesa) {

    mesa.phase = "finished";
    mesa.running = false;

    if (mesa.totalRed > mesa.totalBlue) {
        mesa.winner = "RED";
    }
    else if (mesa.totalBlue > mesa.totalRed) {
        mesa.winner = "BLUE";
    }
    else {
        mesa.winner = "DRAW";
    }

    mesa.mostrarOverlay = true; // para animación
}


http.listen(3000, () => console.log("Server TKD en puerto 3000"));
