const socket = io();

const params = new URLSearchParams(window.location.search);
const mesaId = params.get("mesa");

if (!mesaId) {
  alert("Falta el número de mesa en el link");
}

socket.emit("joinMesa", mesaId);
const socket = io();
let state = {};
let time = 60;

const params = new URLSearchParams(window.location.search);
const mesaId = params.get("mesa") || "1"; // si no hay, usa mesa 1

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("judgeSelect").addEventListener("change", e => {
        socket.emit("setJudges", Number(e.target.value));
    });
});

socket.emit("joinMesa", mesaId);

document.addEventListener('keydown', e => {

    if (e.key === ' ') {
        socket.emit("timer", {value: state.timer, running: !state.running});
    }

    if (e.key === 'm') {
        const selected = parseInt(document.getElementById("roundTime").value);
        socket.emit("timer", { value: selected, running: true });
    }

});

function fault(color){
  socket.emit('fault',color);
}

function setRoundTime() {
    const select = document.getElementById("roundTime");
    const newTime = parseInt(select.value);
    time = newTime;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const m = Math.floor(time / 60);
    const s = time % 60;
    document.getElementById("timer").textContent =
        `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

socket.on('state', s => {
  state = s;
  update();
});

function getFaltaEmoji(count){
    const filled = "⚫".repeat(count);
    const empty = "⚪".repeat(3 - count);
    return filled + empty;
}

function resetCombate(){
    const selected = parseInt(document.getElementById("roundTime").value);

    // 1) Resetear todo
    socket.emit("reset");

    // 2) Después de reset, enviar tiempo nuevo con running=false
    socket.emit("timer", { value: selected, running: false });

    document.getElementById("alertaPenalizacion").style.display = "none";
}




function update(){

   // Mostrar siempre el timer según state.timer
const m = Math.floor(state.timer / 60);
const s = state.timer % 60;
document.getElementById("timer").innerText =
    String(m).padStart(2,'0') + ":" + String(s).padStart(2,'0');


    document.getElementById("faltasRed").innerText =
        "Faltas: " + getFaltaEmoji(state.faults.red);

    document.getElementById("faltasBlue").innerText =
        "Faltas: " + getFaltaEmoji(state.faults.blue);

    let rWins = 0;
    let bWins = 0;
    let rTotal = 0;
    let bTotal = 0;

    // -------- JUECES EN ESQUINAS (dinámico) --------
    const container = document.getElementById("judgesContainer");
    container.innerHTML = "";

    let positions4 = ["top-left", "top-right", "bottom-left", "bottom-right"];
    let positions3 = ["top-left", "top-right", "bottom-center"];

    let positions = (Object.keys(state.judges).length === 4) ? positions4 : positions3;

    let index = 0;

    for (let j in state.judges) {
        const R = state.judges[j].red;
        const B = state.judges[j].blue;

        const box = document.createElement("div");
        box.className = "judgeBox " + positions[index];
        index++;

        box.innerHTML = "J" + j + "<br>" + R + " - " + B;

        if (R > B){
            box.style.background="#e33";
            rWins++;
        } else if (B > R){
            box.style.background="#39f";
            bWins++;
        } else {
            box.style.background="#ddd";
        }

        rTotal += R;
        bTotal += B;

        container.appendChild(box);
    }

    document.getElementById("countRed").innerText = rWins;
    document.getElementById("countBlue").innerText = bWins;

    document.getElementById("totalRed").innerText = rTotal;
    document.getElementById("totalBlue").innerText = bTotal;
}

function mostrarPenalizacion(color){
  const alerta = document.getElementById("alertaPenalizacion");
  alerta.innerText = (color === "red")
      ? "Rojo penalizado (-1 por juez)"
      : "Azul penalizado (-1 por juez)";
  alerta.style.display = "block";

  setTimeout(() => {
    alerta.style.display = "none";
  }, 1500);
}
