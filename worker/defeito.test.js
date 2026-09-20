const test = require('node:test');
const assert = require('node:assert/strict');
const { defeitoNoTitulo } = require('./defeito');

const defeito = (t) => defeitoNoTitulo(t) !== null;

test('título que diz que tem defeito é barrado (casos reais do banco)', () => {
    for (const t of [
        'Ps3 com defeito, com jogos',
        'PS3 Slim COM DEFEITO',
        '[Defeito] Xbox One Fat',
        'Ps3 Super Slim / Desbloqueado / Defeito',
        'Console Xbox One com defeitos',
        'Iphone X 64gb(NÃO LIGA)',
        'iPhone 11 pro Max 256 gb tela trincada bateria 100%',
        'iPhone 11 64gb - traseira trincada',
        'Iphone xr 87% de bateria traseira levemente quebrada',
        'IPHONE 8 PLUS com entrada de carregador danificado',
        'iPhone XR pra vende só tá com um problema na câmera traseira',
        'Xbox One S, 1tb edição Battlefield (com problema pra ligar)',
        'Ps 4 pro em manutenção completo com todos os cabos',
        'Playstation 3 com defeito ideal para peças ou conserto.',
        'PS3 pra retirada de peças',
        'Ps4 só para peças',
        'Xbox 360 sucata',
        'iPhone 12 precisa de conserto na tela',
        'Xbox 360 não liga',
        'PS4 não está lendo disco',
        'Iphone 11 com avaria na câmera',
        'Console com fonte queimada',
        'PS2 para consertar',
    ]) assert.equal(defeito(t), true, t);
});

test('título que NEGA defeito ou não fala de defeito passa', () => {
    for (const t of [
        'iPhone 8 Plus 64 GB sem defeitos',
        'iPhone 16e 128 GB seminovo sem defeito',
        'PS5 nunca deu problema, funcionando 100%',
        'PS4 sem nenhum defeito',
        'Xbox One não tem defeito algum',
        'iPhone 13 zero defeito',
        'PS2 Slim Destravado, liga e desliga normal',
        'iPhone 11 64gb perfeito estado',
        'Playstation 4 com 20 jogos e 2 controles',
        'iPhone 12 sem problemas, bateria 90%',
        'Xbox 360 com peças originais, completo',
        'PS3 desbloqueado 500gb',
        'iPhone 14 Pro Max livre de avarias',
    ]) assert.equal(defeito(t), false, t);
});

test('devolve o motivo', () => {
    assert.equal(defeitoNoTitulo('PS3 com defeito'), 'defeito');
    assert.equal(defeitoNoTitulo('iPhone X não liga'), 'não liga/funciona');
    assert.equal(defeitoNoTitulo('PS3 normal'), null);
    assert.equal(defeitoNoTitulo(null), null);
});

test('perda de função comum (Face ID, falha, problema do X) é barrada; desgaste estético e negação passam', () => {
    for (const t of [
        'Vende-se iPhone 12 64 GB SEM FACE ID',
        'iPhone 15 Pro - Sem Face ID',
        'IPHONE 14 PRO MAX 256GB COM TELA TROCADA E FALHA NO FACE ID',
        'Console Xbox One S - Problema do Plim',
        'XBOX ONE S às vezes liga, as vezes não',
    ]) assert.equal(defeito(t), true, t);
    for (const t of [
        'iPhone 11 vermelho com Face ID funcionando perfeitamente',
        'iPhone 13 com Face ID e Touch ID ok',
        'iPhone 12 sem problema de bateria',
        'PS5 sem carregador, só o console',
        'iPhone 11 sem caixa',
    ]) assert.equal(defeito(t), false, t);
});

test('iPhone mantém anúncio com defeito; console não', () => {
    const { mantemDefeituosos } = require('./defeito');
    assert.equal(mantemDefeituosos('iphone'), true);
    assert.equal(mantemDefeituosos('videogame_console'), false);
});

test('histórico de preços (base das médias) só recebe anúncio sem defeito', () => {
    const { planHistory } = require('./defeito');
    // novo e com defeito: não grava ponto
    assert.deepEqual(planHistory({ isNew: true, priceChanged: false, existingDefeito: undefined, defeito: true }), { insert: false, purge: false });
    // novo e bom: grava
    assert.deepEqual(planHistory({ isNew: true, priceChanged: false, existingDefeito: undefined, defeito: false }), { insert: true, purge: false });
    // era bom, título passou a dizer defeito: apaga os pontos que ele tinha
    assert.deepEqual(planHistory({ isNew: false, priceChanged: false, existingDefeito: false, defeito: true }), { insert: false, purge: true });
    // segue com defeito: nada a fazer
    assert.deepEqual(planHistory({ isNew: false, priceChanged: true, existingDefeito: true, defeito: true }), { insert: false, purge: false });
    // tinha defeito, foi consertado (título mudou): recomeça o histórico
    assert.deepEqual(planHistory({ isNew: false, priceChanged: false, existingDefeito: true, defeito: false }), { insert: true, purge: false });
    // bom e sem mudança: nada; bom e preço mudou: grava
    assert.deepEqual(planHistory({ isNew: false, priceChanged: false, existingDefeito: false, defeito: false }), { insert: false, purge: false });
    assert.deepEqual(planHistory({ isNew: false, priceChanged: true, existingDefeito: false, defeito: false }), { insert: true, purge: false });
});
