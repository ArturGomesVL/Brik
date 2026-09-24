const test = require('node:test');
const assert = require('node:assert/strict');
const { profitPct, descriptionFromJsonLd, extractDescription, buildVerificationMessage, parseVerdicts } = require('./descricao');

test('profitPct é (referência - preço) / preço, com 1 casa decimal', () => {
    assert.equal(profitPct(1000, 1500), 50);
    assert.equal(profitPct(1000, 1499), 49.9);
    assert.equal(profitPct(2000, 1500), -25);
    assert.equal(profitPct('1000.00', '1500.00'), 50);
});

test('profitPct sem preço ou referência válidos é null', () => {
    assert.equal(profitPct(0, 1500), null);
    assert.equal(profitPct(1000, null), null);
    assert.equal(profitPct(1000, undefined), null);
    assert.equal(profitPct('abc', 1500), null);
});

const pagina = (jsonLd) =>
    `<html><head><script type="application/ld+json">${JSON.stringify(jsonLd)}</script></head></html>`;

test('extractDescription lê o JSON-LD, troca <br> por quebra de linha e decodifica entidades', () => {
    const html = pagina({ '@type': 'Product', description: 'iPhone 11<br><br>Tela trincada &amp; sem Face ID &#231;' });
    assert.equal(extractDescription(html), 'iPhone 11\nTela trincada & sem Face ID ç');
});

test('extractDescription ignora JSON-LD inválido e acha o que tem descrição', () => {
    const html =
        '<script type="application/ld+json">{quebrado</script>' +
        '<script type="application/ld+json">{"@type":"BreadcrumbList"}</script>' +
        pagina({ description: 'Funcionando 100%' });
    assert.equal(extractDescription(html), 'Funcionando 100%');
});

test('extractDescription corta descrição enorme', () => {
    const texto = extractDescription(pagina({ description: 'a'.repeat(5000) }));
    assert.equal(texto.length, 1500);
});

test('extractDescription devolve null sem descrição (página de bloqueio, anúncio fora do ar)', () => {
    assert.equal(extractDescription('<html>Access denied</html>'), null);
    assert.equal(extractDescription(pagina({ description: '   ' })), null);
    assert.equal(extractDescription(''), null);
    assert.equal(extractDescription(undefined), null);
});

test('descriptionFromJsonLd lê os blocos JSON-LD que o navegador devolve', () => {
    const blocos = ['{quebrado', '{"@type":"BreadcrumbList"}', JSON.stringify({ description: 'PS4 Slim<br>com 2 controles' })];
    assert.equal(descriptionFromJsonLd(blocos), 'PS4 Slim\ncom 2 controles');
    assert.equal(descriptionFromJsonLd([JSON.stringify([{ '@type': 'Offer' }, { description: 'Em array' }])]), 'Em array');
});

test('descriptionFromJsonLd sem blocos (página de bloqueio) é null', () => {
    assert.equal(descriptionFromJsonLd([]), null);
    assert.equal(descriptionFromJsonLd(undefined), null);
    assert.equal(descriptionFromJsonLd(['{"@type":"Product"}']), null);
});

const ads = [
    { url: 'https://www.olx.com.br/vi/1111111111', title: 'iPhone 11', description: 'Tela trincada' },
    { url: 'https://www.olx.com.br/vi/2222222222', title: 'PS5', description: 'Perfeito estado' },
];

test('buildVerificationMessage identifica cada anúncio pelo id do OLX', () => {
    const msg = buildVerificationMessage(ads);
    assert.match(msg, /<anuncio id="1111111111">\nTítulo: iPhone 11\nDescrição: Tela trincada\n<\/anuncio>/);
    assert.match(msg, /<anuncio id="2222222222">/);
});

test('parseVerdicts casa pelo id, mesmo com a lista fora de ordem e cercada de markdown', () => {
    const resposta = '```json\n[{"id":"2222222222","defeito":false,"diverge":false,"motivo":""},{"id":"1111111111","defeito":true,"diverge":false,"motivo":" tela trincada "}]\n```';
    const v = parseVerdicts(resposta, ads);
    assert.deepEqual(v.get(ads[0].url), { defeito: true, diverge: false, reprovado: true, motivo: 'tela trincada' });
    assert.deepEqual(v.get(ads[1].url), { defeito: false, diverge: false, reprovado: false, motivo: '' });
});

test('parseVerdicts reprova por divergência mesmo sem defeito físico (título não bate com a descrição)', () => {
    const resposta = '[{"id":"1111111111","defeito":false,"diverge":true,"motivo":"descrição fala de outro modelo"}]';
    const v = parseVerdicts(resposta, ads);
    assert.deepEqual(v.get(ads[0].url), { defeito: false, diverge: true, reprovado: true, motivo: 'descrição fala de outro modelo' });
});

test('parseVerdicts deixa de fora anúncio sem resposta, sem "diverge" ou com resposta malformada (fica pendente)', () => {
    const v = parseVerdicts('[{"id":"1111111111","defeito":"sim","diverge":false},{"id":"9999999999","defeito":true,"diverge":false}]', ads);
    assert.equal(v.size, 0);
    // Resposta antiga (só "defeito", sem "diverge"): fica de fora, não interpreta parcialmente.
    const v2 = parseVerdicts('[{"id":"1111111111","defeito":true,"motivo":"quebrado"}]', ads);
    assert.equal(v2.size, 0);
});

test('parseVerdicts lança erro se a resposta não é um array JSON', () => {
    assert.throws(() => parseVerdicts('não sei', ads), /parsear/);
    assert.throws(() => parseVerdicts('{"id":"1"}', ads), /array/);
});
