const test = require('node:test');
const assert = require('node:assert/strict');
const {
    PRODUTOS,
    parseArgs,
    selectProdutos,
    scraperArgs,
    parseResultPath,
    createStrikeTracker,
} = require('./produtos');

const categoriaDe = (p) => ({ celulares: 'iphone', games: 'videogame_console' })[p.categoria];
const iphone = PRODUTOS.find((p) => p.busca === 'iphone');
const ps5 = PRODUTOS.find((p) => p.busca === 'ps5');
const ps4 = PRODUTOS.find((p) => p.busca === 'ps4');
const consoles = PRODUTOS.filter((p) => p.categoria === 'games');

test('parseArgs: buscas, --paginas (as duas formas), --dry-run e --headless', () => {
    assert.deepEqual(parseArgs([]), { buscas: [], paginas: null, dryRun: false, headless: false });
    assert.deepEqual(parseArgs(['PS5', 'xbox', '--paginas', '2', '--dry-run', '--headless']),
        { buscas: ['ps5', 'xbox'], paginas: 2, dryRun: true, headless: true });
    assert.equal(parseArgs(['--paginas=3']).paginas, 3);
});

test('parseArgs rejeita argumento inválido', () => {
    assert.throws(() => parseArgs(['--paginas', 'abc']), /--paginas/);
    assert.throws(() => parseArgs(['--paginas', '0']), /--paginas/);
    assert.throws(() => parseArgs(['--foo']), /desconhecido/);
});

test('selectProdutos: sem filtro roda tudo e não é parcial', () => {
    const r = selectProdutos(PRODUTOS, parseArgs([]));
    assert.equal(r.selecionados.length, PRODUTOS.length);
    assert.equal(r.parcial, false);
});

test('selectProdutos: filtro por busca não é parcial; --paginas é', () => {
    const so = selectProdutos(PRODUTOS, parseArgs(['ps5']));
    assert.deepEqual(so.selecionados.map((p) => p.busca), ['ps5']);
    assert.equal(so.parcial, false);

    const limitado = selectProdutos(PRODUTOS, parseArgs(['--paginas', '1']));
    assert.ok(limitado.selecionados.every((p) => p.paginas === 1));
    assert.equal(limitado.parcial, true);
    assert.equal(PRODUTOS[0].paginas, 100, 'não deve alterar a lista original');

    assert.throws(() => selectProdutos(PRODUTOS, parseArgs(['naoexiste'])), /fora da lista/);
});

test('scraperArgs monta os argumentos do app.py', () => {
    assert.deepEqual(scraperArgs(ps5),
        ['--busca', 'ps5', '--estado', 'pe', '--categoria', 'games', '--condicao', 'usado', '--paginas', '20']);
    assert.ok(scraperArgs(ps5, { headless: true }).includes('--headless'));
});

test('parseResultPath acha a linha RESULTADO_JSON (última vence, tolera CRLF)', () => {
    const saida = 'log qualquer\r\nRESULTADO_JSON=C:\\x\\a.json\r\nRESULTADO_JSON=C:\\x\\b.json\r\n';
    assert.equal(parseResultPath(saida), 'C:\\x\\b.json');
    assert.equal(parseResultPath('sem marcador'), null);
    assert.equal(parseResultPath(''), null);
});

test('strike: categoria com um produto só fica pronta quando a raspagem é completa', () => {
    const t = createStrikeTracker(PRODUTOS, categoriaDe);
    t.record(iphone, 'iphone', ['u1', 'u2'], true);
    consoles.forEach((p) => t.record(p, 'videogame_console', [`c-${p.busca}`], true));
    const { prontas, puladas } = t.resolve();
    assert.equal(puladas.length, 0);
    const ip = prontas.find((p) => p.category === 'iphone');
    assert.deepEqual(ip.urls.sort(), ['u1', 'u2']);
});

test('strike: categoria com várias buscas usa a UNIÃO das URLs vistas', () => {
    const t = createStrikeTracker(PRODUTOS, categoriaDe);
    t.record(iphone, 'iphone', ['u1'], true);
    t.record(ps5, 'videogame_console', ['a', 'b'], true);
    t.record(ps4, 'videogame_console', ['b', 'c'], true);
    consoles.filter((p) => !['ps5', 'ps4'].includes(p.busca)).forEach((p) => t.record(p, 'videogame_console', [], true));
    const c = t.resolve().prontas.find((p) => p.category === 'videogame_console');
    assert.deepEqual(c.urls.sort(), ['a', 'b', 'c']);
});

test('strike: raspagem incompleta ou falha de um produto pula SÓ a categoria dele', () => {
    const t = createStrikeTracker(PRODUTOS, categoriaDe);
    t.record(iphone, 'iphone', ['u1'], true);
    consoles.forEach((p) => {
        if (p.busca === 'ps3') t.fail(p, 'timeout');
        else t.record(p, 'videogame_console', ['x'], p.busca !== 'ps2');
    });
    const { prontas, puladas } = t.resolve();
    assert.deepEqual(prontas.map((p) => p.category), ['iphone']);
    assert.equal(puladas.length, 1);
    assert.equal(puladas[0].category, 'videogame_console');
    assert.match(puladas[0].motivo, /ps3: timeout/);
    assert.match(puladas[0].motivo, /ps2: raspagem incompleta/);
});

test('strike: produto que nem chegou a rodar impede o strike da categoria', () => {
    const t = createStrikeTracker(PRODUTOS, categoriaDe);
    t.record(iphone, 'iphone', ['u1'], true);
    t.record(ps5, 'videogame_console', ['a'], true); // ps4, ps3, ps2 e xbox não rodaram
    const { prontas, puladas } = t.resolve();
    assert.deepEqual(prontas.map((p) => p.category), ['iphone']);
    assert.match(puladas[0].motivo, /nem todas as buscas/);
});

test('strike: rodar só o iPhone libera o strike do iPhone e pula os consoles', () => {
    const t = createStrikeTracker(PRODUTOS, categoriaDe);
    t.record(iphone, 'iphone', ['u1'], true);
    const { prontas, puladas } = t.resolve();
    assert.deepEqual(prontas.map((p) => p.category), ['iphone']);
    assert.deepEqual(puladas.map((p) => p.category), ['videogame_console']);
});

test('strike: raspagem com páginas limitadas (--paginas) nunca aplica strike', () => {
    const t = createStrikeTracker(PRODUTOS, categoriaDe);
    t.record(iphone, 'iphone', ['u1'], true);
    const { prontas, puladas } = t.resolve({ parcial: true });
    assert.equal(prontas.length, 0);
    assert.equal(puladas.length, 2);
});

test('condição vem da busca: conditionFromScrape aceita novo/usado e recusa o resto', () => {
    const { conditionFromScrape } = require('./produtos');
    assert.equal(conditionFromScrape('usado'), 'usado');
    assert.equal(conditionFromScrape('novo'), 'novo');
    assert.throws(() => conditionFromScrape('defeito'), /não suportada/);
    assert.throws(() => conditionFromScrape(undefined), /não suportada/);
});

test('withScrapeCondition: "lacrado" numa busca de usado continua usado, inclusive vindo do cache', () => {
    const { withScrapeCondition } = require('./produtos');
    const itens = [
        { url: 'a', title: 'iPhone 13 LACRADO', category_match: true, variant: 'iphone-13', condition: 'novo' },
        { url: 'b', title: 'iPhone 11', category_match: true, variant: 'iphone-11', condition: 'usado' },
        { url: 'c', title: 'Capinha', category_match: false, variant: null, condition: null },
    ];
    const r = withScrapeCondition(itens, 'usado');
    assert.deepEqual(r.map((i) => i.condition), ['usado', 'usado', null]);
    assert.equal(itens[0].condition, 'novo', 'não altera o original');
    assert.equal(withScrapeCondition(itens, 'novo')[1].condition, 'novo');
});
