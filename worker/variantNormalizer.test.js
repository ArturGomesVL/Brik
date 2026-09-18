const test = require('node:test');
const assert = require('node:assert/strict');
const { canonicalizeVariant } = require('./variantNormalizer');

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

test('outras categorias: só rejeita não identificado', () => {
    assert.equal(canon('ps5-slim', 'videogame_console'), 'ps5-slim');
    assert.equal(canon('videogame_console-nao-identificado', 'videogame_console'), null);
    assert.equal(canon(null, 'videogame_console'), null);
});
