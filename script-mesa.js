/* ============================= */
/* -------- SOCKET INIT -------- */
/* ============================= */

const socket = io();

let state = {};

function cambiarModo(){

    const modo = document.getElementById("modoSelect").value;

    socket.emit("cambiarModo", modo);

    if(modo === "combate"){
        document.getElementById("pantallaCombate").style.display = "block";
        document.getElementById("pantallaFormas").style.display = "none";
    } else {
        document.getElementById("pantallaCombate").style.display = "none";
        document.getElementById("pantallaFormas").style.display = "block";
    }
}

const redEl = document.getElementById("nombreRojo");
const blueEl = document.getElementById("nombreAzul");


const params = new URLSearchParams(window.location.search);
const mesaId = params.get("mesa") || "1";

socket.on("joinMesa", mesaId => {

    socket.join(mesaId);

    if (!mesas[mesaId]) {
        mesas[mesaId] = crearEstadoInicial();
    }

    socket.mesaId = mesaId;

    socket.emit("state", mesas[mesaId]);
});

socket.on("connect", () => {
    socket.emit("joinMesa", mesaId);


});


let sonidoReproducido = false;

/* ============================= */
/* -------- CONTROLES ---------- */
/* ============================= */

function cargarCategoriaGeneral(){

    const modo = state.modo || "combate";

    if(modo === "combate"){
        cargarCategoria();
    } else {
        cargarCategoriaFormas();
    }
}

function iniciarCombate() {
    socket.emit("startFight");
}

function startTiebreak() {
    socket.emit("startTiebreak");
}

function siguienteCombate() {
    socket.emit("siguienteCombate");
}

function fault(color) {
    socket.emit("fault", color);
}

function cambiarJueces(n) {
    socket.emit("setJudges", parseInt(n));
}

async function cargarCategorias(){

    const res = await fetch("/categorias-disponibles");
    const categorias = await res.json();

    const select = document.getElementById("selectCategoria");

    select.innerHTML = ""; // 🔥 esto limpia antes de cargar

    categorias.forEach(cat=>{
        const option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
}

async function cargarCategoria(){

    const categoria = document.getElementById("selectCategoria").value;
    const mesaId = params.get("mesa") || "1";

   await fetch("/asignar-combate", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
        categoria,
        ronda: 0,
        combate: 0,
        mesaId: mesaId   // 🔥 AGREGAR ESTO
    })
});

    alert("Categoría cargada en mesa");
}

cargarCategorias();


/* ============================= */
/* -------- SONIDO ------------- */
/* ============================= */

function habilitarSonido() {
    const audio = document.getElementById("beepFin");

    audio.volume = 0;
    audio.play()
        .then(() => {
            audio.pause();
            audio.currentTime = 0;
            audio.volume = 1;
        })
        .catch(() => {});
}

/* ============================= */
/* -------- UPDATE UI ---------- */
/* ============================= */

function update() {

const timerEl = document.getElementById("timer");

if(state.modo === "formas"){
    timerEl.style.display = "none";
} else {
    timerEl.style.display = "block";
}

   if (state.modo === "formas") {

    document.getElementById("pantallaCombate").style.display = "none";
    document.getElementById("pantallaFormas").style.display = "block";

} else {

    document.getElementById("pantallaCombate").style.display = "block";
    document.getElementById("pantallaFormas").style.display = "none";
}

    if(!state.running && state.phase !== "finished" && state.phase !== "idle"){
    document.getElementById("phaseLabel").innerText = "⏸ PAUSA";
}

    document.getElementById("infoCombate").innerText =
    state.categoriaActual
        ? state.categoriaActual + " - Combate " + (state.combateActual + 1)
        : "";

document.getElementById("nombreRojo").innerText =
    state.rojoNombre || "";

document.getElementById("nombreAzul").innerText =
    state.azulNombre || "";

    if (!state.timer && state.timer !== 0) return;

    /* ===== TIMER ===== */
    const m = Math.floor(state.timer / 60);
    const s = state.timer % 60;

    document.getElementById("timer").innerText =
        String(m).padStart(2, "0") + ":" +
        String(s).padStart(2, "0");

    /* ===== SONIDO FIN ===== */
 if (state.timer === 0 && !sonidoReproducido) {
    const audio = document.getElementById("beepFin");
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(()=>{});
    }
    sonidoReproducido = true;
}
    if (state.timer > 0) {
        sonidoReproducido = false;
    }

    /* ===== FASE ===== */
    const phaseLabel = document.getElementById("phaseLabel");

    if (state.phase === "round1") phaseLabel.innerText = "ROUND 1";
    else if (state.phase === "rest") phaseLabel.innerText = "DESCANSO";
    else if (state.phase === "round2") phaseLabel.innerText = "ROUND 2";
    else if (state.phase === "tiebreak") phaseLabel.innerText = "DESEMPATE";
    else if (state.phase === "finished") phaseLabel.innerText = "FINALIZADO";
    else phaseLabel.innerText = "";

    /* ===== FALTAS ===== */
    document.getElementById("faltasRed").innerText =
        "Faltas: " + getFaltaEmoji(state.faults?.red || 0);

    document.getElementById("faltasBlue").innerText =
        "Faltas: " + getFaltaEmoji(state.faults?.blue || 0);

    /* ===== JUECES ===== */


    let rWins = 0;
    let bWins = 0;
    let rTotal = 0;
    let bTotal = 0;

    const container = document.getElementById("judgesContainer");
    container.innerHTML = "";

    if (!state.judges) return;

    const positions4 = ["top-left", "top-right", "bottom-left", "bottom-right"];
    const positions3 = ["top-left", "top-right", "bottom-center"];

    const judgeKeys = Object.keys(state.judges);
    const positions = (judgeKeys.length === 4) ? positions4 : positions3;

    judgeKeys.forEach((j, index) => {

        const R = state.judges[j].red;
        const B = state.judges[j].blue;

        const box = document.createElement("div");
        box.className = "judgeBox " + positions[index];
        box.innerHTML = "J" + j + "<br>" + R + " - " + B;

        if (R > B) {
            box.style.background = "#e33";
            rWins++;
        } else if (B > R) {
            box.style.background = "#39f";
            bWins++;
        } else {
            box.style.background = "#ddd";
        }

        rTotal += R;
        bTotal += B;

        container.appendChild(box);
    });

    document.getElementById("countRed").innerText = rWins;
    document.getElementById("countBlue").innerText = bWins;
    document.getElementById("totalRed").innerText = rTotal;
    document.getElementById("totalBlue").innerText = bTotal;


   if (state.mostrarOverlay) {

    const overlay = document.getElementById("winnerOverlay");
    const text = document.getElementById("winnerText");

    if (state.winner === "RED") {
        text.innerText = " GANADOR ROJO ";
        text.className = "winnerRed";
    } 
    else if (state.winner === "BLUE") {
        text.innerText = " GANADOR AZUL ";
        text.className = "winnerBlue";
    }

    overlay.classList.remove("hidden");

    setTimeout(() => {
        overlay.classList.add("hidden");
        socket.emit("overlayMostrado"); // 👈 avisamos al server
    }, 3000);
}
}

    /* ===== RESULTADO ===== */

  const resultado = document.getElementById("resultadoFinal");
const tiebreakBtn = document.getElementById("btnTiebreak");

if (resultado) {
    resultado.innerText = "";
}

if (tiebreakBtn) {
    tiebreakBtn.style.display = "none";
}

 if (
    state.phase === "finished" &&
    state.winner &&
    state.winner !== "DRAW" &&
    !state.ganadorReportado
) {

    state.ganadorReportado = true;

    fetch("/reportar-ganador", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
            categoria: state.categoriaActual,
            ronda: state.rondaActual,
            combate: state.combateActual,
            color: state.winner === "RED" ? "red" : "blue"
        })
    });
}


document.addEventListener("keydown", function(e){

    // Tecla P para pausar / reanudar
    if(e.key === "p" || e.key === "P"){

        socket.emit("pausarReanudar");

    }

});






/* ============================= */
/* -------- SOCKET LISTEN ------ */
/* ============================= */

socket.on("state", s => {
    state = s;
    update();
});

/* ============================= */
/* -------- UTILS -------------- */
/* ============================= */

function getFaltaEmoji(count) {
    const filled = "⚫".repeat(count);
    const empty = "⚪".repeat(3 - count);
    return filled + empty;
}