function generarLlave(competidores) {

    // Mezclar lista
    competidores.sort(() => Math.random() - 0.5);

    let combates = [];

    for (let i = 0; i < competidores.length; i += 2) {
        if (competidores[i + 1]) {
            combates.push({
                rojo: competidores[i],
                azul: competidores[i + 1]
            });
        }
    }

    return combates;
}