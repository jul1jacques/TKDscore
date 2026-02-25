const socket = io();
const contenedor = document.getElementById("contenedorMesas");

// Solicitar estado al conectar
socket.on("connect", () => {
    socket.emit("supervisor");
});

// Recibir estado de todas las mesas
socket.on("estadoMesas", mesas => {
    renderMesas(mesas);
});

function renderMesas(mesas) {
    contenedor.innerHTML = ""; // limpiar vista

    for (const mesaId in mesas) {
        const mesa = mesas[mesaId];

        const card = document.createElement("div");
        card.classList.add("mesaCard");

        // Determinar quién va ganando
        let claseEstado = "empate";
        if (mesa.totalRed > mesa.totalBlue) claseEstado = "ganandoRojo";
        if (mesa.totalBlue > mesa.totalRed) claseEstado = "ganandoAzul";
        card.classList.add(claseEstado);

        // Construir HTML
        card.innerHTML = `
            <div class="mesaTitulo">Mesa ${mesaId}</div>

            <div class="timer">${formatearTiempo(mesa.timer)}</div>

            <div class="puntaje">
                <span class="rojo">Rojo: ${mesa.totalRed}</span>
                <span class="azul">Azul: ${mesa.totalBlue}</span>
            </div>

            <div class="faltas">
                Faltas: 
                <span class="rojo">${mesa.faults.red}</span> - 
                <span class="azul">${mesa.faults.blue}</span>
            </div>

            <div class="jueces">
                Jueces conectados: ${Object.keys(mesa.juecesConectados || {}).length}
            </div>
        `;

        contenedor.appendChild(card);
    }
}

// Formato del tiempo
function formatearTiempo(seg) {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return `${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
}

socket.on("estadoMesas", data => {

    const contenedor = document.getElementById("mesasContainer");
    contenedor.innerHTML = "";

    for (const id in data) {

        const mesa = data[id];

        const div = document.createElement("div");
        div.className = "mesaCard";

        const modoTexto =
            mesa.modo === "formas"
                ? "FORMAS"
                : "COMBATE";

        div.innerHTML = `
            <h3>Mesa ${id}</h3>
            <p>Modo: <strong>${modoTexto}</strong></p>
            <p>Categoría: ${mesa.categoriaActual || "-"}</p>
            <p>Combate: ${mesa.combateActual != null ? mesa.combateActual + 1 : "-"}</p>
        `;

        contenedor.appendChild(div);
    }
});

if (mesa.modo === "formas") {
    div.style.borderLeft = "6px solid #2d7df6";
} else {
    div.style.borderLeft = "6px solid #e33";
}
