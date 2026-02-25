const socket = io();
let state = {};

console.log("FORMAS JS CARGADO");

socket.on("stateFormas", s => {
    state = s;
    update();

    if (state.mostrarGanador) {

    const overlay = document.getElementById("overlayGanadorFormas");
    const texto = document.getElementById("textoGanadorFormas");

    texto.innerText = state.nombreGanador;

    if (state.colorGanador === "red") {
        texto.className = "ganadorRojo";
    } else {
        texto.className = "ganadorAzul";
    }

    overlay.classList.remove("hidden");

    setTimeout(() => {
        overlay.classList.add("hidden");
        socket.emit("overlayFormasMostrado");
    }, 3000);
}
});

function update(){

    document.getElementById("categoria").innerText =
        state.categoriaActual || "";

    document.getElementById("ronda").innerText =
        state.rondaNombre || "";

    document.getElementById("nombreRojo").innerText =
        state.rojoNombre || "";

    document.getElementById("nombreAzul").innerText =
        state.azulNombre || "";
}

function ganador(color){

    fetch("/reportar-ganador-formas", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
            categoria: state.categoriaActual,
            ronda: state.rondaActual,
            combate: state.combateActual,
            color: color
        })
    });
}

function siguienteCombate(){
    socket.emit("siguienteCombateFormas");
}

async function cargarCategoriasFormas(){

    const res = await fetch("/categorias-disponibles");
    const categorias = await res.json();

    const select = document.getElementById("selectCategoriaFormas");
    select.innerHTML = "";

    categorias.forEach(cat=>{
        select.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
}

cargarCategoriasFormas();

async function cargarCategoriaFormas(){

    const categoria =
        document.getElementById("selectCategoriaFormas").value;

    await fetch("/asignar-combate-formas", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
            categoria,
            ronda:0,
            combate:0
        })
    });

    alert("Categoría cargada");
}
