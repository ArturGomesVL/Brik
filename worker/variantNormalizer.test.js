const test = require('node:test');
const assert = require('node:assert/strict');
const { canonicalizeVariant, variantMatchesTitle } = require('./variantNormalizer');
const { alignClassifications, sameTitle } = require('./classificationAlignment');

const canon = (variant, category = 'iphone') => canonicalizeVariant(category, variant).variant;
const reason = (variant, category = 'iphone') => canonicalizeVariant(category, variant).reason;

test('iPhone 12 pra baixo: sem capacidade assume a menor', () => {
    assert.equal(canon('iphone-11'), 'iphone-11-64gb');
    assert.equal(canon('iphone-11-pro'), 'iphone-11-pro-64gb');
    assert.equal(canon('iphone-12'), 'iphone-12-64gb');
    assert.equal(canon('iphone-12-pro'), 'iphone-12-pro-128gb');
    assert.equal(canon('iphone-7'), 'iphone-7-32gb');
    assert.equal(canon('iphone-xr'), 'iphone-xr-64gb');
});

test('iPhone 12 pra baixo: capacidades maiores que a menor dividem uma linha só', () => {
    assert.equal(canon('iphone-11-64gb'), 'iphone-11-64gb');
    assert.equal(canon('iphone-11-128gb'), 'iphone-11-128gb-ou-mais');
    assert.equal(canon('iphone-11-256gb'), 'iphone-11-128gb-ou-mais');
    assert.equal(canon('iphone-11-pro-256gb'), 'iphone-11-pro-256gb-ou-mais');
    assert.equal(canon('iphone-11-pro-512gb'), 'iphone-11-pro-256gb-ou-mais');
    assert.equal(canon('iphone-12-pro-max-128gb'), 'iphone-12-pro-max-128gb');
    assert.equal(canon('iphone-12-pro-max-512gb'), 'iphone-12-pro-max-256gb-ou-mais');
    assert.equal(canon('iphone-x-256gb'), 'iphone-x-256gb-ou-mais');
});

test('iPhone 13 em diante: uma linha por capacidade, sem capacidade = menor', () => {
    assert.equal(canon('iphone-13'), 'iphone-13-128gb');
    assert.equal(canon('iphone-13-128gb'), 'iphone-13-128gb');
    assert.equal(canon('iphone-13-256gb'), 'iphone-13-256gb');
    assert.equal(canon('iphone-14-pro-max-1tb'), 'iphone-14-pro-max-1tb');
    assert.equal(canon('iphone-15-pro-max'), 'iphone-15-pro-max-256gb');
    assert.equal(canon('iphone-16-pro-max'), 'iphone-16-pro-max-256gb');
    assert.equal(canon('iphone-17'), 'iphone-17-256gb');
    assert.equal(canon('iphone-17-pro-max-2tb'), 'iphone-17-pro-max-2tb');
    assert.equal(canon('iphone-16e'), 'iphone-16e-128gb');
});

test('modelo não reconhecido é rejeitado', () => {
    assert.equal(canon('iphone'), null);
    assert.equal(reason('iphone'), 'sem-modelo');
    assert.equal(canon('iphone-nao-identificado'), null);
    assert.equal(reason('iphone-nao-identificado'), 'nao-identificado');
    assert.equal(canon('iphone-64gb'), null);
    assert.equal(reason('iphone-64gb'), 'sem-modelo');
    assert.equal(canon('iphone-128gb'), null);
    assert.equal(canon('iphone-16s'), null);
    assert.equal(canon(null), null);
    assert.equal(canon(''), null);
});

test('iPhone SE exige a geração', () => {
    assert.equal(canon('iphone-se'), null);
    assert.equal(reason('iphone-se'), 'se-sem-geracao');
    assert.equal(canon('iphone-se-64gb'), null);
    assert.equal(canon('iphone-se-2020'), 'iphone-se-2020-64gb');
    assert.equal(canon('iphone-se-2020-128gb'), 'iphone-se-2020-128gb-ou-mais');
    assert.equal(canon('iphone-se-2'), 'iphone-se-2020-64gb');
    assert.equal(canon('iphone-se-2-256gb'), 'iphone-se-2020-128gb-ou-mais');
    assert.equal(canon('iphone-se-2nd-gen'), 'iphone-se-2020-64gb');
    assert.equal(canon('iphone-se-2ª-geração'), 'iphone-se-2020-64gb');
    assert.equal(canon('iphone-se-3'), 'iphone-se-2022-64gb');
    assert.equal(canon('iphone-se-2022-64gb'), 'iphone-se-2022-64gb');
});

test('grafias alternativas do mesmo modelo', () => {
    assert.equal(canon('iphone-8plus-256gb'), 'iphone-8-plus-128gb-ou-mais');
    assert.equal(canon('iphone-17-air'), 'iphone-air-256gb');
    assert.equal(canon('iphone-17-air-256gb'), 'iphone-air-256gb');
    assert.equal(canon('iphone-air-512gb'), 'iphone-air-512gb');
    assert.equal(canon('iphone-13-promax-256gb'), 'iphone-13-pro-max-256gb');
    assert.equal(canon('iphone-xsmax-64gb'), 'iphone-xs-max-64gb');
});

test('capacidade impossível pro modelo é rejeitada (abaixo da menor)', () => {
    assert.equal(canon('iphone-16-pro-max-128gb'), null);
    assert.equal(canon('iphone-13-64gb'), null);
    assert.equal(canon('iphone-14-pro-521gb'), null);
});

test('modelo novo fora da tabela: só com capacidade explícita', () => {
    assert.equal(canon('iphone-18-pro-256gb'), 'iphone-18-pro-256gb');
    assert.equal(canon('iphone-17e-256gb'), 'iphone-17e-256gb');
    assert.equal(canon('iphone-18-pro'), null);
    assert.equal(reason('iphone-18-pro'), 'capacidade-desconhecida:18-pro');
    assert.equal(canon('iphone-99'), null);
});

test('idempotente: canonicalizar o canônico devolve ele mesmo', () => {
    const entradas = [
        'iphone-11', 'iphone-11-128gb', 'iphone-11-pro-max-512gb', 'iphone-12-pro',
        'iphone-13', 'iphone-16-pro-max', 'iphone-17-pro-max-2tb', 'iphone-se-2', 'iphone-17-air',
        'iphone-7-plus-64gb', 'iphone-x',
    ];
    for (const e of entradas) {
        const once = canon(e);
        assert.ok(once, `${e} deveria ser aceito`);
        assert.equal(canon(once), once, `${e} -> ${once} não é idempotente`);
    }
});

test('categorias sem regra própria: só rejeita não identificado (consoles: ver consoleCatalog.test.js)', () => {
    assert.equal(canon('camera-x100', 'outra_categoria'), 'camera-x100');
    assert.equal(canon('outra_categoria-nao-identificado', 'outra_categoria'), null);
    assert.equal(canon(null, 'outra_categoria'), null);
});

const bate = (titulo, variant) => variantMatchesTitle('iphone', titulo, variant);

test('variant que não descreve o aparelho do título é reprovado (casos reais do banco)', () => {
    assert.equal(bate('iPhone 13 Pro Max 128gb', 'iphone-17-pro-max-256gb'), false);
    assert.equal(bate('iPhone 13 128gb', 'iphone-15-128gb'), false);
    assert.equal(bate('iPhone 11 64gb', 'iphone-13-pro-max-128gb'), false);
    assert.equal(bate('Vendo Iphone SE 2020', 'iphone-15-pro-128gb'), false);
    assert.equal(bate('iPhone 12', 'iphone-xs-max-64gb'), false);
    assert.equal(bate('iPhone XR 132GB', 'iphone-11-pro-max-64gb'), false);
});

test('variant correto passa, inclusive grafias esquisitas de título', () => {
    assert.equal(bate('iPhone 13 Pro Max 128gb', 'iphone-13-pro-max-128gb'), true);
    assert.equal(bate('Xsmax', 'iphone-xs-max-64gb'), true);
    assert.equal(bate('iPhone 16 E, 256gb na garantia Apple', 'iphone-16e-256gb'), true);
    assert.equal(bate('IPHONE 12PRO MAX - IMPECÁVEL', 'iphone-12-pro-max-128gb'), true);
    assert.equal(bate('iPhone SE 2 (2020) 64GB Barato', 'iphone-se-2020-64gb'), true);
    assert.equal(bate('iPhone X 64gb', 'iphone-x-64gb'), true);
    assert.equal(bate('iPhone 17 Air 256gb', 'iphone-air-256gb'), true);
    assert.equal(bate('Iphone 8plus 64', 'iphone-8-plus-64gb'), true);
});

test('sufixo pro/max/plus/mini precisa concordar nos dois sentidos', () => {
    assert.equal(bate('iPhone 11', 'iphone-11-pro'), false);
    assert.equal(bate('iPhone 13 Pro Max', 'iphone-13-pro'), false);
    assert.equal(bate('iPhone 13 Pro', 'iphone-13-pro-max'), false);
    assert.equal(bate('iPhone 14 Plus 128gb', 'iphone-14-128gb'), false);
});

test('capacidade: "5G" não conta, e título sem capacidade nunca reprova', () => {
    assert.equal(bate('iPhone 12 5G azul', 'iphone-12-128gb'), true);
    assert.equal(bate('iPhone 12 64GB', 'iphone-12-128gb'), false);
    assert.equal(bate('iPhone 12', 'iphone-12-128gb'), true);
    assert.equal(bate('iPhone 15 Pro Max 1tb', 'iphone-15-pro-max-1tb'), true);
});

test('outras categorias e variant vazio não são checados', () => {
    assert.equal(variantMatchesTitle('outra_categoria', 'Camera Canon', 'camera-x100'), true);
    assert.equal(bate('iPhone novíssimo', null), true);
});

test('lista da IA deslocada em uma posição: casa pelo título ecoado, não pelo index', () => {
    const itens = [{ title: 'iPhone 11 64GB' }, { title: 'iPhone 13 128gb' }, { title: 'iPhone 15 Pro' }];
    const deslocada = [
        { index: 1, titulo: 'iPhone 11 64GB', variant: 'iphone-11-64gb' },
        { index: 2, titulo: 'iPhone 13 128gb', variant: 'iphone-13-128gb' },
        { index: 3, titulo: 'iPhone 15 Pro', variant: 'iphone-15-pro-128gb' },
    ];
    const r = alignClassifications(itens, deslocada);
    assert.deepEqual(r.map((c) => c.variant), ['iphone-11-64gb', 'iphone-13-128gb', 'iphone-15-pro-128gb']);
});

test('item sem classificação com título correspondente fica null (não é chutado)', () => {
    const itens = [{ title: 'iPhone 11 64GB' }, { title: 'iPhone 13 128gb' }];
    const r = alignClassifications(itens, [{ index: 0, titulo: 'iPhone 11 64GB', variant: 'iphone-11-64gb' }]);
    assert.equal(r[0].variant, 'iphone-11-64gb');
    assert.equal(r[1], null);
    assert.equal(alignClassifications(itens, null)[0], null);
});

test('títulos repetidos consomem uma classificação cada; cópia com pequenas diferenças ainda casa', () => {
    const itens = [{ title: 'iPhone 11 64GB' }, { title: 'iPhone 11 64GB' }];
    const r = alignClassifications(itens, [
        { index: 0, titulo: 'iPhone 11 64GB', variant: 'a' },
        { index: 1, titulo: 'iPhone 11 64GB', variant: 'b' },
    ]);
    assert.deepEqual(r.map((c) => c.variant), ['a', 'b']);
    assert.equal(sameTitle('iPhone 11 64GB - Bateria 90% 🔋', 'iphone 11 64gb bateria 90'), true);
    assert.equal(sameTitle('iPhone 11 64GB', 'iPhone 13 128GB'), false);
});
