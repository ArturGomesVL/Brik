// defeito.js
//
// Detecta título de anúncio que JÁ diz que o produto tem defeito (quebrado, não
// liga, pra peças, precisa de conserto...). Esses anúncios não entram no banco:
// preço de aparelho com defeito não é referência de mercado nem oportunidade.
//
// Só olha o que o título afirma. Título que NEGA o defeito ("sem defeito", "nunca
// deu problema") não é barrado.

function normalize(text) {
    return String(text || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// "sem nenhum defeito", "nunca teve defeito", "não tem problema", "livre de avaria"...
const NEGADO = /\b(?:sem|nenhum|nenhuma|zero|nunca|jamais|isento\s+de|livre\s+de|nao\s+(?:tem|possui|apresenta|teve|deu|tinha))\s+(?:\w+\s+){0,2}(?:defeit\w*|problem\w*|avaria\w*)/g;

const PADROES = [
    { motivo: 'defeito', re: /\bdefeit(?:o|os|uos[oa]s?)\b/ },
    { motivo: 'quebrado/danificado', re: /\b(?:quebrad|trincad|rachad|estragad|queimad|danificad|avariad)[oa]s?\b/ },
    { motivo: 'com problema', re: /\bcom\s+(?:um\s+|uns\s+|algum\s+)?(?:problem|probleminh)\w*/ },
    { motivo: 'com avaria', re: /\bcom\s+avaria/ },
    { motivo: 'problema no/do', re: /\bproblema\s+(?:d[oa]|n[oa]|com|pra|para)\b/ },
    { motivo: 'falha', re: /\bfalha\s+(?:n[oa]s?|de|em)\b/ },
    { motivo: 'sem Face ID/Touch ID', re: /\bsem\s+(?:o\s+)?(?:face\s?id|touch\s?id)\b/ },
    { motivo: 'intermitente', re: /\bas\s+vezes\s+(?:liga|nao)\b/ },
    { motivo: 'não liga/funciona', re: /\bnao\s+(?:esta\s+)?(?:liga|ligando|funciona|funcionando|carrega|carregando|le|lendo|reconhece|inicia|da\s+(?:video|imagem))\b/ },
    { motivo: 'sem imagem/vídeo', re: /\bsem\s+(?:imagem|sinal\s+de\s+video|video)\b/ },
    { motivo: 'pra peças', re: /\b(?:pra|para|p)\s+(?:a\s+)?(?:retirada\s+de\s+|retirar\s+)?pecas?\b/ },
    { motivo: 'só peças', re: /\b(?:so|somente|apenas)\s+(?:pra\s+|para\s+)?pecas?\b/ },
    { motivo: 'retirada de peças', re: /\b(?:retirada|retirar)\s+de\s+pecas?\b/ },
    { motivo: 'sucata', re: /\bsucata\b/ },
    { motivo: 'pra conserto', re: /\b(?:pra|para|precisa\s+de|precisando\s+de|necessita\s+de|a)\s+(?:conserto|consertar|reparo|reparar|arrumar|manutencao)\b/ },
    { motivo: 'em manutenção', re: /\bem\s+manutencao\b/ },
    { motivo: 'precisa reparo', re: /\bprecisa\s+(?:de\s+)?(?:troc|repar|conserto|arrum|manutenc)/ },
];

// Devolve o motivo (string) se o título expressa defeito, ou null.
function defeitoNoTitulo(title) {
    const t = normalize(title).replace(NEGADO, ' ');
    for (const { motivo, re } of PADROES) {
        if (re.test(t)) return motivo;
    }
    return null;
}

// Em iPhone o anúncio com defeito continua no banco (o front mostra um aviso no
// card). Nas demais categorias (consoles) ele nem entra.
const CATEGORIAS_COM_DEFEITO_VISIVEL = new Set(['iphone']);
const mantemDefeituosos = (category) => CATEGORIAS_COM_DEFEITO_VISIVEL.has(category);

// historico_precos é a fonte das médias de mercado: só recebe anúncio SEM defeito
// (aparelho quebrado é barato por isso e puxaria a mediana dos que funcionam).
//  insert: gravar ponto de preço agora | purge: apagar os pontos que o anúncio já tinha
//  (ele estava "bom" e o título passou a dizer que tem defeito).
function planHistory({ isNew, priceChanged, existingDefeito, defeito }) {
    if (defeito) return { insert: false, purge: !isNew && existingDefeito !== true };
    // Sem defeito. Se antes tinha defeito, o histórico dele está vazio: recomeça agora.
    return { insert: isNew || priceChanged || existingDefeito === true, purge: false };
}

module.exports = { defeitoNoTitulo, mantemDefeituosos, planHistory };
