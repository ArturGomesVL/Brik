// variantNormalizer.js
//
// Canonicaliza o "variant" devolvido pela IA antes de qualquer gravação, pra:
//   1. nunca gravar anúncio cujo modelo não foi reconhecido (ex: só "iphone");
//   2. reduzir a granularidade dos segmentos de mediana (menos "linhas").
//
// Regras (iPhone):
//   - Sem modelo reconhecível  -> rejeita (variant null + reason).
//   - Sem capacidade no título -> assume a MENOR capacidade que o modelo teve.
//   - Modelos do iPhone 12 pra baixo ("legacy"): a menor capacidade fica numa
//     linha (ex: iphone-11-64gb); TODAS as maiores dividem uma linha só, com a
//     mesma mediana (ex: iphone-11-128gb-ou-mais reúne 128GB e 256GB).
//   - Do iPhone 13 em diante: uma linha por capacidade (iphone-13-128gb,
//     iphone-13-256gb, ...).
// A função é idempotente: canonicalizar um variant já canônico devolve ele mesmo.

const SUFIXO_OU_MAIS = 'ou-mais';

// Capacidades (GB) em que cada modelo foi vendido, em ordem crescente.
// legacy = true -> "12 pra baixo" (capacidades acima da menor viram um grupo só).
const legacy = (storages) => ({ legacy: true, storages });
const modern = (storages) => ({ legacy: false, storages });

const IPHONE_MODELS = {
    '3g': legacy([8, 16]),
    '3gs': legacy([8, 16, 32]),
    '4': legacy([8, 16, 32]),
    '4s': legacy([8, 16, 32, 64]),
    '5': legacy([16, 32, 64]),
    '5c': legacy([8, 16, 32]),
    '5s': legacy([16, 32, 64]),
    '6': legacy([16, 64, 128]),
    '6-plus': legacy([16, 64, 128]),
    '6s': legacy([16, 64, 128]),
    '6s-plus': legacy([16, 64, 128]),
    'se-2016': legacy([16, 32, 64, 128]),
    'se-2020': legacy([64, 128, 256]),
    'se-2022': legacy([64, 128, 256]),
    '7': legacy([32, 128, 256]),
    '7-plus': legacy([32, 128, 256]),
    '8': legacy([64, 128, 256]),
    '8-plus': legacy([64, 128, 256]),
    'x': legacy([64, 256]),
    'xr': legacy([64, 128, 256]),
    'xs': legacy([64, 256, 512]),
    'xs-max': legacy([64, 256, 512]),
    '11': legacy([64, 128, 256]),
    '11-pro': legacy([64, 256, 512]),
    '11-pro-max': legacy([64, 256, 512]),
    '12-mini': legacy([64, 128, 256]),
    '12': legacy([64, 128, 256]),
    '12-pro': legacy([128, 256, 512]),
    '12-pro-max': legacy([128, 256, 512]),

    '13-mini': modern([128, 256, 512]),
    '13': modern([128, 256, 512]),
    '13-pro': modern([128, 256, 512, 1024]),
    '13-pro-max': modern([128, 256, 512, 1024]),
    '14': modern([128, 256, 512]),
    '14-plus': modern([128, 256, 512]),
    '14-pro': modern([128, 256, 512, 1024]),
    '14-pro-max': modern([128, 256, 512, 1024]),
    '15': modern([128, 256, 512]),
    '15-plus': modern([128, 256, 512]),
    '15-pro': modern([128, 256, 512, 1024]),
    '15-pro-max': modern([256, 512, 1024]),
    '16': modern([128, 256, 512]),
    '16-plus': modern([128, 256, 512]),
    '16e': modern([128, 256, 512]),
    '16-pro': modern([128, 256, 512, 1024]),
    '16-pro-max': modern([256, 512, 1024]),
    'air': modern([256, 512, 1024]),
    '17': modern([256, 512]),
    '17-pro': modern([256, 512, 1024]),
    '17-pro-max': modern([256, 512, 1024, 2048]),
};

// A IA às vezes escreve o mesmo modelo de formas diferentes.
const MODEL_ALIASES = {
    'se-1': 'se-2016', 'se-1st-gen': 'se-2016', 'se-1a-geracao': 'se-2016', 'se-1-geracao': 'se-2016',
    'se-2': 'se-2020', 'se-2nd-gen': 'se-2020', 'se-2a-geracao': 'se-2020', 'se-2-geracao': 'se-2020',
    'se-3': 'se-2022', 'se-3rd-gen': 'se-2022', 'se-3a-geracao': 'se-2022', 'se-3-geracao': 'se-2022',
    '17-air': 'air',
};

// Modelo novo que ainda não está na tabela (ex: iphone-18-pro): aceito só se a
// capacidade veio explícita no título, pra não descartar lançamentos.
const UNKNOWN_MODERN_MODEL = /^(\d{2})(?:e|-(?:mini|plus|pro|pro-max|air))?$/;

// Sem unidade só vale pra números que não se confundem com número de modelo.
const BARE_STORAGE_GB = new Set([32, 64, 128, 256, 512]);
const STORAGE_TOKEN = /^(\d+)(gb|g|tb|t)?$/;

function storageLabel(gb) {
    return gb >= 1024 ? `${gb / 1024}tb` : `${gb}gb`;
}

function parseStorageToken(token) {
    const m = STORAGE_TOKEN.exec(token);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    const unit = m[2];
    if (!unit) return BARE_STORAGE_GB.has(n) ? n : null;
    const gb = unit.startsWith('t') ? n * 1024 : n;
    return [8, 16, 32, 64, 128, 256, 512, 1024, 2048].includes(gb) ? gb : null;
}

function normalizeModelKey(key) {
    const cleaned = key
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/promax/g, 'pro-max')
        .replace(/xsmax/g, 'xs-max')
        .replace(/(\d)(plus|pro|mini|max)/g, '$1-$2');
    return MODEL_ALIASES[cleaned] || cleaned;
}

function reject(reason) {
    return { variant: null, reason };
}

function canonicalizeIphone(variant) {
    const raw = String(variant || '').toLowerCase().trim();
    if (/nao-identificado/.test(raw)) return reject('nao-identificado');

    let tokens = raw.split('-').filter(Boolean);
    if (tokens[0] !== 'iphone') return reject('modelo-desconhecido');
    tokens = tokens.slice(1);

    if (tokens.length >= 2 && tokens.slice(-2).join('-') === SUFIXO_OU_MAIS) {
        tokens = tokens.slice(0, -2);
    }
    if (tokens.length === 0) return reject('sem-modelo');

    let storage = null;
    if (tokens.length >= 2) {
        const parsed = parseStorageToken(tokens[tokens.length - 1]);
        if (parsed !== null) {
            storage = parsed;
            tokens = tokens.slice(0, -1);
        }
    }

    const key = normalizeModelKey(tokens.join('-'));
    if (STORAGE_TOKEN.test(key) && parseStorageToken(key) !== null) return reject('sem-modelo');
    if (key === 'se') return reject('se-sem-geracao');

    const model = IPHONE_MODELS[key];
    if (!model) {
        const m = UNKNOWN_MODERN_MODEL.exec(key);
        if (m && parseInt(m[1], 10) >= 13) {
            if (storage === null) return reject(`capacidade-desconhecida:${key}`);
            return { variant: `iphone-${key}-${storageLabel(storage)}` };
        }
        return reject(`modelo-desconhecido:${key}`);
    }

    const menor = model.storages[0];
    const efetiva = storage === null ? menor : storage;
    if (efetiva < menor) return reject(`capacidade-invalida:${key}-${storage}`);

    if (!model.legacy) {
        return { variant: `iphone-${key}-${storageLabel(efetiva)}` };
    }
    if (efetiva === menor) {
        return { variant: `iphone-${key}-${storageLabel(menor)}` };
    }
    return { variant: `iphone-${key}-${storageLabel(model.storages[1])}-${SUFIXO_OU_MAIS}` };
}

// Devolve { variant } (canônico) ou { variant: null, reason } quando o modelo
// não pôde ser reconhecido e o anúncio NÃO deve entrar no banco.
function canonicalizeVariant(category, variant) {
    if (!variant) return reject('sem-variant');
    if (category === 'iphone') return canonicalizeIphone(variant);
    if (/nao-identificado$/.test(String(variant))) return reject('nao-identificado');
    return { variant };
}

module.exports = { canonicalizeVariant };
