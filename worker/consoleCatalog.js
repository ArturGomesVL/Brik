// consoleCatalog.js
//
// Catálogo FECHADO de variantes de videogame (definido pelo dono do produto).
// Só estas 34 linhas existem em anuncios_ativos/historico_precos; qualquer
// console fora daqui (Xbox One X, ROG Ally, Xbox clássico...) não entra no banco.
//
// Regra do "mais básico": quando o anúncio não diz tudo (ex: só "PlayStation 2"),
// vale a versão mais básica que combine com o que o título diz.
//
// Naming: "Isley" da lista original foi lido como "Slim" (PS5 Slim); "Xbox S
// edição especial" foi lido como Xbox Series S edição especial.

const CATALOGO = {
    'PlayStation 2': ['ps2-fat', 'ps2-slim'],
    'PlayStation 3': [
        'ps3-fat-120gb', 'ps3-fat-500gb',
        'ps3-slim-120gb', 'ps3-slim-250gb', 'ps3-slim-500gb',
        'ps3-super-slim-250gb', 'ps3-super-slim-500gb',
        'ps3-ultra-slim',
    ],
    'PlayStation 4': ['ps4-fat-500gb', 'ps4-pro-1tb', 'ps4-slim-500gb', 'ps4-slim-1tb'],
    'PlayStation 5': [
        'ps5-standard-825gb', 'ps5-digital-825gb',
        'ps5-slim-1tb', 'ps5-slim-digital-825gb', 'ps5-slim-digital-1tb',
        'ps5-pro-2tb-com-leitor', 'ps5-pro-2tb-sem-leitor',
        'ps5-special-edition',
    ],
    Xbox: [
        'xbox-360',
        'xbox-one-fat-500gb', 'xbox-one-fat-1tb',
        'xbox-one-s-500gb', 'xbox-one-s-1tb', 'xbox-one-s-2tb',
        'xbox-one-edicao-especial',
        'xbox-series-s-edicao-especial', 'xbox-series-s-512gb', 'xbox-series-s-1tb',
        'xbox-series-x-1tb', 'xbox-series-x-2tb-galaxy',
    ],
};

const CATALOGO_KEYS = new Set(Object.values(CATALOGO).flat());

// Texto do catálogo + regras pro prompt do Haiku (gerado daqui pra não dessincronizar).
function consoleCatalogPrompt() {
    const linhas = Object.entries(CATALOGO).map(([familia, keys]) => `${familia}: ${keys.join(', ')}`);
    return `${linhas.join('\n')}

Regra do "mais básico": quando o título não disser tudo, escolha a versão MAIS BÁSICA do
catálogo que combine com o que o título diz. Exemplos: só "PlayStation 2" -> ps2-fat; só
"PS3" -> ps3-fat-120gb; "PS3 slim" -> ps3-slim-120gb; "PS3 super slim" -> ps3-super-slim-250gb;
só "PS4" -> ps4-fat-500gb; "PS4 slim" -> ps4-slim-500gb; "PS4 1tb" -> ps4-slim-1tb; "PS4 pro"
-> ps4-pro-1tb; só "PS5" -> ps5-standard-825gb; "PS5 digital" -> ps5-digital-825gb; "PS5 slim"
-> ps5-slim-1tb; "PS5 com 1tb" (com ou sem leitor, sem dizer slim) -> ps5-slim-1tb, pois só o
Slim tem 1tb; "PS5 digital 1tb" -> ps5-slim-digital-1tb; "PS5 slim digital" ->
ps5-slim-digital-825gb; "PS5 slim 825gb" SEM a palavra digital -> ps5-slim-1tb (digital só se o
título disser "digital" ou "sem leitor"); "PS2 super slim" ou modelos 7xxxx/9xxxx -> ps2-slim; "PS5 pro" sem dizer que tem
leitor de disco -> ps5-pro-2tb-sem-leitor; só "Xbox One" -> xbox-one-fat-500gb; "Xbox One S" ->
xbox-one-s-500gb; só "Xbox Series" (sem X nem S) -> xbox-series-s-512gb; "Series X" ->
xbox-series-x-1tb; qualquer Xbox 360 (Slim, Arcade, Elite, E...) -> xbox-360.
Se o título citar uma capacidade que não existe no catálogo pra aquele modelo, use a
capacidade mais próxima do MESMO modelo. "digital" ou "sem leitor" num PS5 comum = versão
digital; "com leitor de disco" num PS5 Pro = ps5-pro-2tb-com-leitor. Edição especial/limitada/
colecionador: PS5 -> ps5-special-edition; Xbox One -> xbox-one-edicao-especial; Series S ->
xbox-series-s-edicao-especial; Series X 2tb -> xbox-series-x-2tb-galaxy.
Se o console NÃO estiver no catálogo (ex: Xbox One X, Xbox original, PSP, PS Vita, portáteis
como ROG Ally, Nintendo) ou o título não permitir saber qual é o console, devolva variant null.`;
}

// ------------------------------------------------------------------
// Canonicalização: variant (do catálogo ou legado/livre) -> chave do catálogo.
// ------------------------------------------------------------------
function normalize(text) {
    return String(text || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

const reject = (reason) => ({ variant: null, reason });
const capLabel = (gb) => (gb >= 1000 ? `${gb / 1000}tb` : `${gb}gb`);
const nearest = (lista, gb) => lista.reduce((best, c) => (Math.abs(c - gb) < Math.abs(best - gb) ? c : best), lista[0]);

// "-825gb-", "-1tb-" ... (recebe a string já cercada de hífens)
function capacityGb(s) {
    const gb = /-(\d{2,4})(?:gb|g)-/.exec(s);
    if (gb) return parseInt(gb[1], 10);
    const tb = /-(\d)(?:tb|t)-/.exec(s);
    return tb ? parseInt(tb[1], 10) * 1000 : null;
}

const ESPECIAL = /-(especial|special|limitada|limited|colecionador|collector)-/;

// Escolhe (tipo, capacidade) numa família: tipo pedido, senão o mais básico que
// tenha a capacidade citada, senão o mais básico; capacidade pedida ou a mais próxima.
function pick(tabela, ordem, tipo, gb) {
    let t = tipo;
    if (!t) t = (gb && ordem.find((x) => tabela[x].includes(gb))) || ordem[0];
    const caps = tabela[t];
    return { tipo: t, gb: gb ? nearest(caps, gb) : caps[0] };
}

function ps3(s, gb) {
    if (/-ultra-/.test(s)) return 'ps3-ultra-slim';
    const tipo = /-super-/.test(s) ? 'super-slim' : /-slim-/.test(s) ? 'slim' : /-fat-/.test(s) ? 'fat' : null;
    const r = pick({ fat: [120, 500], slim: [120, 250, 500], 'super-slim': [250, 500] }, ['fat', 'slim', 'super-slim'], tipo, gb);
    return `ps3-${r.tipo}-${capLabel(r.gb)}`;
}

function ps4(s, gb) {
    const tipo = /-pro-/.test(s) ? 'pro' : /-slim-/.test(s) ? 'slim' : /-fat-/.test(s) ? 'fat' : null;
    const r = pick({ fat: [500], slim: [500, 1000], pro: [1000] }, ['fat', 'slim', 'pro'], tipo, gb);
    return `ps4-${r.tipo}-${capLabel(r.gb)}`;
}

function ps5(s, gb) {
    if (ESPECIAL.test(s)) return 'ps5-special-edition';
    const comLeitor = /-(com-leitor|leitor|com-drive|drive)-/.test(s) && !/-(sem-leitor|sem-drive)-/.test(s);
    if (/-pro-/.test(s)) return `ps5-pro-2tb-${comLeitor ? 'com' : 'sem'}-leitor`;
    const digital = /-(digital|sem-leitor|sem-drive)-/.test(s);
    const slim = /-slim-/.test(s) || (gb !== null && gb >= 1000 && gb < 2000);
    if (slim) {
        if (!digital) return 'ps5-slim-1tb';
        return gb !== null && gb >= 1000 ? 'ps5-slim-digital-1tb' : 'ps5-slim-digital-825gb';
    }
    return digital ? 'ps5-digital-825gb' : 'ps5-standard-825gb';
}

function xboxOne(s, gb) {
    if (/-one-x-/.test(s)) return null; // Xbox One X não está no catálogo
    if (ESPECIAL.test(s)) return 'xbox-one-edicao-especial';
    const tipo = /-one-s-/.test(s) ? 's' : /-fat-/.test(s) ? 'fat' : null;
    const r = pick({ fat: [500, 1000], s: [500, 1000, 2000] }, ['fat', 's'], tipo, gb);
    return `xbox-one-${r.tipo}-${capLabel(r.gb)}`;
}

function familyOf(v) {
    if (/^ps2(-|$)/.test(v)) return 'ps2';
    if (/^ps3(-|$)/.test(v)) return 'ps3';
    if (/^ps4(-|$)/.test(v)) return 'ps4';
    if (/^ps5(-|$)/.test(v)) return 'ps5';
    if (/^xbox-?360(-|$)/.test(v)) return 'xbox360';
    if (/^xbox-one(-|$)/.test(v)) return 'xboxone';
    if (/^xbox-series-x(-|$)/.test(v) || /^xbox-x(-|$)/.test(v)) return 'seriesx';
    if (/^xbox-series-s(-|$)/.test(v) || /^xbox-series(-|$)/.test(v) || /^xbox-s(-|$)/.test(v)) return 'seriess';
    return null;
}

// Devolve { variant } (chave do catálogo) ou { variant: null, reason }.
function canonicalizeConsole(variant) {
    const v = normalize(variant);
    if (!v) return reject('sem-variant');
    if (/nao-identificado/.test(v)) return reject('nao-identificado');
    if (CATALOGO_KEYS.has(v)) return { variant: v };

    const fam = familyOf(v);
    if (!fam) return reject(/^(ps|playstation|xbox)/.test(v) ? 'sem-modelo' : 'fora-do-catalogo');

    const s = `-${v}-`;
    const gb = capacityGb(s);
    let key;
    switch (fam) {
        case 'ps2': key = /-slim-/.test(s) ? 'ps2-slim' : 'ps2-fat'; break;
        case 'ps3': key = ps3(s, gb); break;
        case 'ps4': key = ps4(s, gb); break;
        case 'ps5': key = ps5(s, gb); break;
        case 'xbox360': key = 'xbox-360'; break;
        case 'xboxone': key = xboxOne(s, gb); break;
        case 'seriess':
            key = ESPECIAL.test(s) ? 'xbox-series-s-edicao-especial'
                : `xbox-series-s-${gb !== null && nearest([512, 1000], gb) === 1000 ? '1tb' : '512gb'}`;
            break;
        case 'seriesx':
            key = /-galaxy-/.test(s) || (gb !== null && gb >= 2000) ? 'xbox-series-x-2tb-galaxy' : 'xbox-series-x-1tb';
            break;
        default: key = null;
    }
    if (!key || !CATALOGO_KEYS.has(key)) return reject('fora-do-catalogo');
    return { variant: key };
}

// ------------------------------------------------------------------
// Confere se o variant descreve o console do título (rede de segurança contra
// classificação trocada). Só olha o que o título diz explicitamente.
// ------------------------------------------------------------------
const TITLE_FAMILY = {
    ps2: /(?<![a-z0-9])(ps\s?2|play\s?station\s?2|playstation2|play\s?2)(?![0-9])/,
    ps3: /(?<![a-z0-9])(ps\s?3|play\s?station\s?3|playstation3|play\s?3)(?![0-9])/,
    ps4: /(?<![a-z0-9])(ps\s?4|play\s?station\s?4|playstation4|play\s?4)(?![0-9])/,
    ps5: /(?<![a-z0-9])(ps\s?5|play\s?station\s?5|playstation5|play\s?5)(?![0-9])/,
    xbox360: /360/,
    xboxone: /(?<![a-z])one(?![a-z])|xone/,
    seriess: /series\s?s(?![a-z])|xss|xbox\s?s(?![a-z])|series(?!\s?x)/,
    seriesx: /series\s?x(?![a-z])|xsx|xbox\s?x(?![a-z])/,
};

function consoleVariantMatchesTitle(title, variant) {
    const v = normalize(variant);
    const fam = familyOf(v);
    if (!fam) return true; // sem família legível: quem rejeita é a canonicalização
    const t = normalize(title);

    if (!TITLE_FAMILY[fam].test(t)) return false;

    const noTitulo = (re) => re.test(t);
    const soltoNoVariant = (re) => re.test(`-${v}-`);
    const ehPS = fam.startsWith('ps');

    // O que o variant afirma tem que estar no título. "slim" fica de fora de
    // propósito: pela regra da capacidade, "PS4 1TB" vira ps4-slim-1tb sem o
    // título dizer "slim".
    if (ehPS && soltoNoVariant(/-pro-/) && !noTitulo(/(?<![a-z])pro(?![a-z])/)) return false;
    if (fam === 'ps5' && soltoNoVariant(/-digital-/) && !noTitulo(/digital|sem\s?(leitor|drive)/)) return false;
    if (soltoNoVariant(/-galaxy-/) && !noTitulo(/galaxy/)) return false;
    const especial = soltoNoVariant(/-(especial|special)-/);
    if (especial && !noTitulo(/especial|special|limitad|limited|colecion|collector|edic|edition/)) return false;

    // O que o título afirma junto do nome do console tem que estar no variant
    // (edição especial é uma linha própria: não tem "slim"/"digital" no nome).
    if (!especial) {
        if ((fam === 'ps4' || fam === 'ps5') && /(ps\s?[45]|play\s?station\s?[45])\s?pro(?![a-z])/.test(t) && !soltoNoVariant(/-pro-/)) return false;
        if (ehPS && /(ps\s?[2-5]|play\s?station\s?[2-5])\s?slim/.test(t) && !soltoNoVariant(/-slim-/)) return false;
        if (fam === 'ps5' && /(?<![a-z])digital(?![a-z])/.test(t) && !soltoNoVariant(/-(digital|pro)-/)) return false;
    }

    return true;
}

module.exports = { CATALOGO, CATALOGO_KEYS, consoleCatalogPrompt, canonicalizeConsole, consoleVariantMatchesTitle };
