let competidoresGlobal = [];

function procesarExcel() {

    const file = document.getElementById("excelFile").files[0];
    const reader = new FileReader();

    reader.onload = function(e) {

        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);

        competidoresGlobal = clasificarCompetidores(json);

        localStorage.setItem("competidores", JSON.stringify(competidoresGlobal));

        mostrarCategorias();
    };

    reader.readAsArrayBuffer(file);
}

function clasificarCompetidores(lista) {

    return lista.map(c => {

        let categoriaAsignada = CONFIG_CATEGORIAS.find(cat =>
            c.edad >= cat.edadMin &&
            c.edad <= cat.edadMax &&
            cat.cinturones.includes(c.cinturon.toLowerCase())
        );

        return {
            ...c,
            categoria: categoriaAsignada ? categoriaAsignada.nombre : "Sin categoría"
        };
    });
}

function mostrarCategorias() {

    let categorias = [...new Set(
        competidoresGlobal.map(c => c.categoria)
    )];

    let html = "<h3>Categorías detectadas:</h3>";

    categorias.forEach(cat => {
        html += `<div>${cat}</div>`;
    });

    document.getElementById("categoriasDetectadas").innerHTML = html;
}