const socket = io();

// leer ?j=1, ?j=2, etc.
const params = new URLSearchParams(window.location.search);
const juez = parseInt(params.get("j")) || 1;

// mostrar número de juez en pantalla
document.getElementById("juezID").innerText = "Juez " + juez;

// ROJO
function puntoRojo() {
  console.log("Enviando rojo desde juez", juez);
  socket.emit("punto", { juez: juez, color: "red" });
}

// AZUL
function puntoAzul() {
  console.log("Enviando azul desde juez", juez);
  socket.emit("punto", { juez: juez, color: "blue" });
}

// estado de conexión
socket.on("connect", () => {
  document.getElementById("estado").innerText = "Conectado ✓";
});

socket.on("disconnect", () => {
  document.getElementById("estado").innerText = "Reconectando...";
});
