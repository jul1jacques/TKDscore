// ===============================
// SCRIPT JUEZ – OPCIÓN 2 (LINK POR JUEZ)
// ===============================

const socket = io();

// Leer parámetros
const params = new URLSearchParams(window.location.search);
const mesaId = params.get("mesa");
const juezId = params.get("juez");

// Validación
if (!mesaId || !juezId) {
    alert(
        "Link incorrecto.\n\nEjemplo válido:\n" +
        "/juez.html?mesa=1&juez=1"
    );
    throw new Error("Faltan parámetros mesa o juez");
}

// ===============================
// CONEXIÓN
// ===============================

socket.on("connect", () => {
    console.log("🟢 Juez conectado:", juezId, "Mesa:", mesaId);

    socket.emit("joinMesa", mesaId);

    socket.emit("juezJoin", {
        mesaId: mesaId,
        juezId: juezId
    });
});

// ===============================
// UI
// ===============================

document.addEventListener("DOMContentLoaded", () => {
    const label = document.getElementById("juezLabel");
    if (label) {
        label.innerText = "JUEZ " + juezId;
    }
});

// ===============================
// VOTAR
// ===============================

function votar(color) {
    entrarFullScreen();

    socket.emit("punto", {
        juez: juezId,
        color: color
    });

    vibrar();
    flash(color);
}

// ===============================
// FEEDBACK
// ===============================

function vibrar() {
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
}

function flash(color) {
    const body = document.body;
    body.style.background = (color === "red") ? "#d17373ff" : "#5a6ea5ff";

    setTimeout(() => {
        body.style.background = "white";
    }, 150);
}

function entrarFullScreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
}

// ===============================
// RECONEXIÓN
// ===============================

socket.on("disconnect", () => {
    console.log("🔴 Juez desconectado");
});

socket.io.on("reconnect", () => {
    console.log("♻️ Juez reconectado");
    socket.emit("joinMesa", mesaId);
    socket.emit("juezJoin", { mesaId, juezId });
});
