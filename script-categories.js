let competidores = [];
let combatesActuales = [];

window.onload = function() {
    competidores = JSON.parse(localStorage.getItem("competidores")) || [];
    llenarSelectorCategorias();
};

function llenarSelectorCategorias() {

    let categorias = [...new Set(
        competidores.map(c => c.categoria)
    )];

    const select = document.getElementById("categoriaSelect");

    categorias.forEach(cat => {
        let option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
}

function cargarCategoria() {

    let categoria = document.getElementById("categoriaSelect").value;

    let listaCategoria = competidores.filter(c => c.categoria === categoria);

    combatesActuales = generarLlave(listaCategoria);

    mostrarLlave();
}

function mostrarLlave() {

    let html = "<h3>Llaves:</h3>";

    combatesActuales.forEach((combate, i) => {
        html += `
            <div>
                Combate ${i + 1}: 
                ${combate.rojo.nombre} 🔴 vs ${combate.azul.nombre} 🔵
            </div>
        `;
    });

    document.getElementById("bracketView").innerHTML = html;
}