// produtos.js
//
// Lista de produtos raspados em cada ciclo do worker, e a lógica pura de
// orquestração (argumentos de linha de comando, argumentos do app.py e quais
// categorias podem sofrer strike no fim do ciclo).
//
// Os produtos rodam em sequência: assim que a raspagem + gravação de um termina,
// o próximo começa.

// busca: termo do OLX (use %20 para espaços) | categoria: 'celulares' ou 'games'
// condicao: 'novo' | 'usado' | 'defeito' | paginas: máximo de páginas a raspar
const PRODUTOS = [
    { busca: 'iphone', categoria: 'celulares', condicao: 'usado', estado: 'pe', paginas: 100 },

    // PlayStation continua separado por geração porque os vendedores costumam
    // abreviar ("PS5", "PS4"); uma busca única por "playstation" perderia anúncios.
    { busca: 'ps5', categoria: 'games', condicao: 'usado', estado: 'pe', paginas: 20 },
    { busca: 'ps4', categoria: 'games', condicao: 'usado', estado: 'pe', paginas: 20 },
    { busca: 'ps3', categoria: 'games', condicao: 'usado', estado: 'pe', paginas: 20 },
    { busca: 'ps2', categoria: 'games', condicao: 'usado', estado: 'pe', paginas: 20 },
    // Xbox fica numa busca só: os vendedores escrevem "Xbox 360"/"Xbox One"/"Xbox
    // Series" por extenso, então q=xbox já cobre todas as gerações.
    { busca: 'xbox', categoria: 'games', condicao: 'usado', estado: 'pe', paginas: 20 },
];

const produtoKey = (p) => `${p.busca}|${p.categoria}|${p.condicao}|${p.estado}`;
const rotulo = (p) => `${decodeURIComponent(p.busca)} (${p.categoria}, ${p.condicao}, ${p.estado.toUpperCase()})`;

// node worker.js [busca ...] [--paginas N] [--dry-run] [--headless]
function parseArgs(argv) {
    const opts = { buscas: [], paginas: null, dryRun: false, headless: false };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--dry-run') opts.dryRun = true;
        else if (arg === '--headless') opts.headless = true;
        else if (arg === '--paginas' || arg.startsWith('--paginas=')) {
            const valor = arg.includes('=') ? arg.split('=')[1] : argv[++i];
            const n = Number(valor);
            if (!Number.isInteger(n) || n < 1) throw new Error(`--paginas precisa de um inteiro >= 1 (recebido: ${valor})`);
            opts.paginas = n;
        } else if (arg.startsWith('--')) {
            throw new Error(`Argumento desconhecido: ${arg}`);
        } else {
            opts.buscas.push(arg.toLowerCase());
        }
    }
    return opts;
}

// Aplica o filtro por busca e o limite de páginas. `parcial` = as páginas foram
// limitadas (--paginas), então NENHUMA raspagem viu tudo e não pode haver strike.
// Rodar só um subconjunto de produtos não é "parcial": o rastreador de strikes
// libera cada categoria cujas buscas foram todas raspadas e pula as demais.
function selectProdutos(produtos, opts) {
    let selecionados = produtos;
    if (opts.buscas.length > 0) {
        const validas = produtos.map((p) => p.busca);
        const desconhecidas = opts.buscas.filter((b) => !validas.includes(b));
        if (desconhecidas.length > 0) {
            throw new Error(`Produto(s) fora da lista: ${desconhecidas.join(', ')}. Disponíveis: ${validas.join(', ')}`);
        }
        selecionados = produtos.filter((p) => opts.buscas.includes(p.busca));
    }
    if (opts.paginas !== null) {
        selecionados = selecionados.map((p) => ({ ...p, paginas: opts.paginas }));
    }
    return { selecionados, parcial: opts.paginas !== null };
}

function scraperArgs(produto, { headless = false } = {}) {
    const args = [
        '--busca', produto.busca,
        '--estado', produto.estado,
        '--categoria', produto.categoria,
        '--condicao', produto.condicao,
        '--paginas', String(produto.paginas),
    ];
    if (headless) args.push('--headless');
    return args;
}

// O app.py imprime "RESULTADO_JSON=<caminho>" ao terminar.
function parseResultPath(stdoutText) {
    const linhas = String(stdoutText || '').split(/\r?\n/);
    for (let i = linhas.length - 1; i >= 0; i--) {
        const m = /^RESULTADO_JSON=(.+)$/.exec(linhas[i].trim());
        if (m) return m[1].trim();
    }
    return null;
}

// Decide, no fim do ciclo, em quais categorias o strike é seguro.
//
// Strike = "o anúncio sumiu da raspagem". Só vale se a raspagem viu a categoria
// INTEIRA: todas as buscas configuradas dela, cada uma completa. Com ps5/ps4/...
// na mesma categoria, uma raspagem isolada só enxerga o pedaço dela, e aplicar
// strike em cima dela daria strike falso nos anúncios das outras buscas.
function createStrikeTracker(configurados, categoriaInterna) {
    const esperados = new Map(); // categoria interna -> Set de chaves de produto
    for (const p of configurados) {
        const cat = categoriaInterna(p);
        if (!cat) continue;
        if (!esperados.has(cat)) esperados.set(cat, new Set());
        esperados.get(cat).add(produtoKey(p));
    }

    const vistos = new Map(); // categoria -> { urls:Set, ok:Set, problemas:[] }
    const estado = (cat) => {
        if (!vistos.has(cat)) vistos.set(cat, { urls: new Set(), ok: new Set(), problemas: [] });
        return vistos.get(cat);
    };

    return {
        record(produto, category, seenUrls, completo) {
            const e = estado(category);
            seenUrls.forEach((u) => e.urls.add(u));
            if (completo) e.ok.add(produtoKey(produto));
            else e.problemas.push(`${produto.busca}: raspagem incompleta`);
        },
        fail(produto, motivo) {
            const cat = categoriaInterna(produto);
            if (cat) estado(cat).problemas.push(`${produto.busca}: ${motivo}`);
        },
        // parcial: páginas limitadas por --paginas -> nenhuma categoria é segura.
        resolve({ parcial = false } = {}) {
            const prontas = [];
            const puladas = [];
            for (const [cat, chaves] of esperados) {
                const e = vistos.get(cat) || { urls: new Set(), ok: new Set(), problemas: [] };
                if (parcial) {
                    puladas.push({ category: cat, motivo: 'páginas limitadas por --paginas (raspagem parcial)' });
                } else if (e.problemas.length > 0) {
                    puladas.push({ category: cat, motivo: e.problemas.join('; ') });
                } else if ([...chaves].some((k) => !e.ok.has(k))) {
                    puladas.push({ category: cat, motivo: 'nem todas as buscas da categoria foram raspadas' });
                } else {
                    prontas.push({ category: cat, urls: [...e.urls] });
                }
            }
            return { prontas, puladas };
        },
    };
}

module.exports = {
    PRODUTOS,
    produtoKey,
    rotulo,
    parseArgs,
    selectProdutos,
    scraperArgs,
    parseResultPath,
    createStrikeTracker,
};
