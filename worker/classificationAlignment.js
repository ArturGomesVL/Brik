// classificationAlignment.js
//
// O Haiku classifica os títulos em lote e devolve um array com "index". Confiar
// só no index é frágil: numa execução ele devolveu uma lista deslocada em uma
// posição e cada anúncio ficou com o variant do título seguinte. Por isso o
// prompt pede o título de volta ("titulo") e o casamento é feito por ele.

function normalizeForCompare(text) {
    return String(text || '')
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

// Tolera diferenças pequenas na cópia do título (pontuação, emoji, título cortado).
function sameTitle(a, b) {
    const na = normalizeForCompare(a);
    const nb = normalizeForCompare(b);
    if (!na || !nb) return false;
    if (na === nb) return true;

    const [curto, longo] = na.length <= nb.length ? [na, nb] : [nb, na];
    if (curto.length >= 12 && longo.startsWith(curto)) return true;

    const tokensA = new Set(na.split(' '));
    const tokensB = new Set(nb.split(' '));
    let comuns = 0;
    tokensA.forEach((t) => tokensB.has(t) && comuns++);
    return comuns / Math.max(tokensA.size, tokensB.size) >= 0.8;
}

// Devolve, pra cada item, a classificação da IA cujo título bate com o dele
// (ou null se nenhuma bater). Prefere a que está na posição certa; se a lista
// veio deslocada, acha pelo título. Cada classificação é usada uma vez só.
function alignClassifications(items, classifications) {
    const lista = Array.isArray(classifications)
        ? classifications.filter((c) => c && typeof c === 'object')
        : [];
    const usadas = new Set();

    return items.map((item, i) => {
        let hit = lista.find((c) => !usadas.has(c) && c.index === i && sameTitle(c.titulo, item.title));
        if (!hit) hit = lista.find((c) => !usadas.has(c) && sameTitle(c.titulo, item.title));
        if (hit) usadas.add(hit);
        return hit || null;
    });
}

module.exports = { sameTitle, alignClassifications };
