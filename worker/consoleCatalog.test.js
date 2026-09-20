const test = require('node:test');
const assert = require('node:assert/strict');
const { CATALOGO_KEYS, consoleCatalogPrompt } = require('./consoleCatalog');
const { canonicalizeVariant, variantMatchesTitle } = require('./variantNormalizer');

const canon = (v) => canonicalizeVariant('videogame_console', v).variant;
const reason = (v) => canonicalizeVariant('videogame_console', v).reason;
const bate = (titulo, variant) => variantMatchesTitle('videogame_console', titulo, variant);

test('o catálogo tem exatamente as 34 variantes escolhidas e o prompt lista todas', () => {
    assert.equal(CATALOGO_KEYS.size, 34);
    const prompt = consoleCatalogPrompt();
    for (const k of CATALOGO_KEYS) assert.ok(prompt.includes(k), `prompt sem ${k}`);
});

test('chave do catálogo passa direto (idempotente)', () => {
    for (const k of CATALOGO_KEYS) assert.equal(canon(k), k);
});

test('sem detalhe: assume a versão mais básica', () => {
    assert.equal(canon('ps2'), 'ps2-fat');
    assert.equal(canon('ps3'), 'ps3-fat-120gb');
    assert.equal(canon('ps3-slim'), 'ps3-slim-120gb');
    assert.equal(canon('ps3-super-slim'), 'ps3-super-slim-250gb');
    assert.equal(canon('ps4'), 'ps4-fat-500gb');
    assert.equal(canon('ps4-slim'), 'ps4-slim-500gb');
    assert.equal(canon('ps4-pro'), 'ps4-pro-1tb');
    assert.equal(canon('ps5'), 'ps5-standard-825gb');
    assert.equal(canon('ps5-fat'), 'ps5-standard-825gb');
    assert.equal(canon('ps5-digital'), 'ps5-digital-825gb');
    assert.equal(canon('ps5-slim'), 'ps5-slim-1tb');
    assert.equal(canon('ps5-slim-digital'), 'ps5-slim-digital-825gb');
    assert.equal(canon('ps5-pro'), 'ps5-pro-2tb-sem-leitor');
    assert.equal(canon('xbox-one'), 'xbox-one-fat-500gb');
    assert.equal(canon('xbox-one-s'), 'xbox-one-s-500gb');
    assert.equal(canon('xbox-series-s'), 'xbox-series-s-512gb');
    assert.equal(canon('xbox-series'), 'xbox-series-s-512gb');
    assert.equal(canon('xbox-series-x'), 'xbox-series-x-1tb');
});

test('capacidade citada escolhe a versão mais básica que a tenha; inexistente vai pra mais próxima', () => {
    assert.equal(canon('ps3-500gb'), 'ps3-fat-500gb');
    assert.equal(canon('ps3-250gb'), 'ps3-slim-250gb');
    assert.equal(canon('ps3-1tb'), 'ps3-fat-500gb');
    assert.equal(canon('ps3-slim-320gb'), 'ps3-slim-250gb');
    assert.equal(canon('ps4-1tb'), 'ps4-slim-1tb');
    assert.equal(canon('ps4-500gb'), 'ps4-fat-500gb');
    assert.equal(canon('ps4-fat-512gb'), 'ps4-fat-500gb');
    assert.equal(canon('ps4-fat-1tb'), 'ps4-fat-500gb');
    assert.equal(canon('ps5-1tb'), 'ps5-slim-1tb');
    assert.equal(canon('ps5-digital-1tb'), 'ps5-slim-digital-1tb');
    assert.equal(canon('ps5-slim-825gb'), 'ps5-slim-1tb');
    assert.equal(canon('ps5-pro-2tb'), 'ps5-pro-2tb-sem-leitor');
    assert.equal(canon('xbox-one-1tb'), 'xbox-one-fat-1tb');
    assert.equal(canon('xbox-one-500gb'), 'xbox-one-fat-500gb');
    assert.equal(canon('xbox-one-2tb'), 'xbox-one-s-2tb');
    assert.equal(canon('xbox-one-s-512gb'), 'xbox-one-s-500gb');
    assert.equal(canon('xbox-series-x-2tb'), 'xbox-series-x-2tb-galaxy');
    assert.equal(canon('xbox-series-s-1tb'), 'xbox-series-s-1tb');
});

test('Xbox 360 de qualquer tipo/capacidade é uma linha só', () => {
    for (const v of ['xbox-360', 'xbox-360-slim', 'xbox-360-elite', 'xbox-360-e', 'xbox-360-250gb', 'xbox-360-500gb']) {
        assert.equal(canon(v), 'xbox-360', v);
    }
});

test('fora do catálogo é rejeitado', () => {
    assert.equal(canon('xbox-one-x'), null);
    assert.equal(canon('xbox-one-x-1tb'), null);
    assert.equal(canon('xbox-classico'), null);
    assert.equal(reason('xbox'), 'sem-modelo');
    assert.equal(canon('asus-rog-ally'), null);
    assert.equal(canon('rog-ally-s'), null);
    assert.equal(canon('videogame_console-nao-identificado'), null);
    assert.equal(canon(null), null);
});

test('todas as variantes que existem hoje no banco viram uma chave do catálogo (ou são rejeitadas de propósito)', () => {
    const noBanco = ['ps5', 'xbox-360', 'ps3', 'ps5-slim', 'ps4', 'xbox-one-s', 'xbox-series-s', 'xbox-one', 'ps3-slim',
        'ps4-slim-1tb', 'xbox-one-s-1tb', 'ps2-slim', 'ps2', 'ps3-super-slim', 'ps5-fat', 'xbox-360-slim', 'ps2-fat',
        'ps4-pro-1tb', 'ps4-fat', 'ps4-slim', 'ps5-slim-1tb', 'ps4-pro', 'ps5-slim-digital', 'ps5-digital', 'ps4-1tb',
        'ps4-500gb', 'ps5-1tb', 'ps3-slim-500gb', 'ps3-fat', 'xbox-one-fat', 'ps4-fat-500gb', 'ps4-slim-500gb',
        'xbox-one-s-500gb', 'xbox-series-s-512gb', 'ps3-ultra-slim', 'ps3-super-slim-500gb', 'xbox-one-s-512gb',
        'xbox-one-500gb', 'xbox-360-elite', 'ps3-slim-250gb', 'ps5-pro', 'ps5-digital-1tb', 'xbox-series-x-1tb',
        'xbox-one-1tb', 'xbox-series-x', 'xbox-one-fat-500gb', 'ps3-500gb', 'ps3-1tb', 'ps4-fat-512gb', 'ps4-512gb',
        'ps2-super-slim', 'ps5-pro-2tb', 'ps3-super-slim-250gb', 'ps5-slim-825gb', 'ps5-slim-digital-1tb',
        'xbox-360-250gb', 'xbox-360-500gb', 'xbox-360-e'];
    for (const v of noBanco) assert.ok(CATALOGO_KEYS.has(canon(v)), `${v} -> ${canon(v)}`);
    for (const v of ['xbox-one-x', 'xbox-one-x-1tb', 'asus-rog-ally', 'rog-ally-s', 'xbox', 'xbox-classico']) {
        assert.equal(canon(v), null, v);
    }
});

test('título: família errada é reprovada', () => {
    assert.equal(bate('PlayStation 2 slim', 'ps3-slim-120gb'), false);
    assert.equal(bate('PS4 slim 1tb', 'ps5-slim-1tb'), false);
    assert.equal(bate('Xbox 360 com kinect', 'xbox-one-fat-500gb'), false);
    assert.equal(bate('Xbox Series X 1tb', 'xbox-series-s-512gb'), false);
});

test('título: família certa passa, com grafias variadas', () => {
    assert.equal(bate('Playstation 2 slim funcionando', 'ps2-slim'), true);
    assert.equal(bate('PS 3 500gb', 'ps3-fat-500gb'), true);
    assert.equal(bate('Play 4 Pro 1tb', 'ps4-pro-1tb'), true);
    assert.equal(bate('PlayStation5 digital', 'ps5-digital-825gb'), true);
    assert.equal(bate('Xbox One S 1tb', 'xbox-one-s-1tb'), true);
    assert.equal(bate('Xbox Series S', 'xbox-series-s-512gb'), true);
    assert.equal(bate('Xbox Series', 'xbox-series-s-512gb'), true);
    assert.equal(bate('Xbox 360 Slim', 'xbox-360'), true);
    assert.equal(bate('Xbox XSX 1tb', 'xbox-series-x-1tb'), true);
});

test('título: tipo (pro/slim/digital/edição especial) precisa concordar', () => {
    assert.equal(bate('PS5 Pro', 'ps5-standard-825gb'), false);
    assert.equal(bate('PS5', 'ps5-pro-2tb-sem-leitor'), false);
    assert.equal(bate('PS5 digital 825gb', 'ps5-standard-825gb'), false);
    assert.equal(bate('PS5 slim', 'ps5-standard-825gb'), false);
    assert.equal(bate('PS5 edição especial God of War', 'ps5-special-edition'), true);
    assert.equal(bate('PS5 825gb', 'ps5-special-edition'), false);
    assert.equal(bate('PlayStation 4 - 1TB - 2 jogos', 'ps4-slim-1tb'), true);
    assert.equal(bate('PS5 Slim Com Leitor 1Tb Edição Limitada Ouro - Ghost of Yotei', 'ps5-special-edition'), true);
    assert.equal(bate('PS4 slim 500gb', 'ps4-slim-500gb'), true);
    assert.equal(bate('PS4 com 20 jogos Pro Evolution', 'ps4-fat-500gb'), true);
    assert.equal(bate('Xbox Series X 2tb Galaxy', 'xbox-series-x-2tb-galaxy'), true);
    assert.equal(bate('Xbox Series X 1tb', 'xbox-series-x-2tb-galaxy'), false);
});
