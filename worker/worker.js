// worker.js
//
// Worker de ingestão do Brique — conecta Apify (raspagem) → cache de
// classificação → Claude Haiku → (próximo passo: Supabase).
//
// Nesta primeira versão, cobre só os passos 1-3:
//   1. Dispara o Actor da Apify e pega os itens raspados
//   2. Separa o que já está em cache (classificacoes_ia) do que é novo
//   3. Classifica os itens novos em lote via Claude Haiku
//
// Ainda NÃO grava nada no Supabase — isso entra na próxima etapa,
// depois de validar que os passos 1-3 funcionam com dado real.
//
// Rodar manualmente por enquanto: node worker.js
require('dotenv').config(); console.log('SUPABASE_URL:', JSON.stringify(process.env.SUPABASE_URL));
const { createClient } = require('@supabase/supabase-js');

// ------------------------------------------------------------------
// Configuração — tudo via variáveis de ambiente, nunca hardcoded
// ------------------------------------------------------------------
const APIFY_TOKEN = process.env.APIFY_TOKEN;
const APIFY_TASK_ID = process.env.APIFY_TASK_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const BATCH_SIZE = 25;

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

// Categoria e baseModel de cada busca — no MVP, roda uma vez pra cada
// entrada desta lista. Ajuste as URLs pra bater com as Start URLs
// configuradas no Actor da Apify.
const SEARCHES = [


    /*{
        category: 'iphone',
        startUrl: 'https://www.olx.com.br/celulares/estado-pe?q=iphone',
    },*/


    {
        category: 'videogame_console',
        startUrl: 'https://www.olx.com.br/games/consoles-de-video-game/estado-pe?q=ps5',
    },
    // adicionar mais buscas aqui conforme necessário (ex: ps4, xbox, etc)
];

// ------------------------------------------------------------------
// Passo 1 — Disparar o Actor da Apify e pegar os itens do dataset
// ------------------------------------------------------------------
async function runApifyActor(startUrl, maxPages = 5) {
    const url = `https://api.apify.com/v2/actor-tasks/${APIFY_TASK_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            startUrls: [{ url: startUrl }],
            maxPages,
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Apify run failed: ${response.status} - ${errText}`);
    }

    return response.json(); // array de itens crus
}

// ------------------------------------------------------------------
// Passo 2 — Separar itens já classificados (cache) dos novos
// ------------------------------------------------------------------
async function queryWithRetry(chunk, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const { data, error } = await supabase
                .from('classificacoes_ia')
                .select('url, category, category_match, variant, condition')
                .in('url', chunk);

            if (error) throw new Error(error.message, { cause: error });
            return data;
        } catch (err) {
            if (attempt === maxRetries) throw err;
            console.warn(`  Tentativa ${attempt} falhou (${err.message}), tentando de novo...`);
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)); // espera crescente: 1s, 2s, 3s
        }
    }
}

async function splitCachedAndNew(items) {
    const urls = items.map((item) => item.url).filter(Boolean);

    if (urls.length === 0) return { cached: [], toClassify: [] };

    const CHUNK_SIZE = 40;
    const cacheMap = new Map();

    for (let i = 0; i < urls.length; i += CHUNK_SIZE) {
        const chunk = urls.slice(i, i + CHUNK_SIZE);
        const cachedRows = await queryWithRetry(chunk);
        cachedRows.forEach((row) => cacheMap.set(row.url, row));
    }

    const cached = [];
    const toClassify = [];

    for (const item of items) {
        const hit = cacheMap.get(item.url);
        if (hit) {
            cached.push({ ...item, ...hit });
        } else {
            toClassify.push(item);
        }
    }

    return { cached, toClassify };
}
// ------------------------------------------------------------------
// Passo 3 — Classificar itens novos em lote via Claude Haiku
// ------------------------------------------------------------------
async function classifyBatch(items, category) {
    const listForPrompt = items
        .map((item, i) => `${i}. "${item.title}"`)
        .join('\n');

    const systemPrompt = `Você classifica anúncios do OLX pra um app de detecção de oportunidades de preço.
Categoria desta busca: "${category}".

Para CADA título numerado na lista, responda com um objeto JSON contendo:
- "index": o número do item (mesmo da lista)
- "categoryMatch": true se o anúncio é realmente o produto principal da categoria (não acessório, peça, capa, jogo avulso, serviço, ou produto diferente que só menciona o termo buscado); false caso contrário
- "variant": uma string curta e padronizada identificando o modelo/variante específico (ex: "iphone-11-pro-max-256gb", "ps5-slim"), ou null se categoryMatch for false ou não for possível identificar com confiança
- "condition": "novo", "usado", ou "desconhecido" se não for possível inferir com confiança a partir do título

Responda APENAS com um array JSON válido, sem nenhum texto antes ou depois, sem markdown, sem crases.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: HAIKU_MODEL,
            max_tokens: 2000,
            system: systemPrompt,
            messages: [{ role: 'user', content: listForPrompt }],
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const rawText = data.content
        .map((block) => (block.type === 'text' ? block.text : ''))
        .join('');

    const cleanText = rawText.replace(/```json|```/g, '').trim();

    let classifications;
    try {
        classifications = JSON.parse(cleanText);
    } catch (err) {
        throw new Error(`Falha ao parsear resposta do Claude: ${err.message}\nResposta bruta: ${rawText}`);
    }

    return items.map((item, i) => {
        const c = classifications.find((x) => x.index === i) || {};

        const categoryMatch = c.categoryMatch ?? null;

        // Se a IA confirmou que é o produto certo, o banco exige variant e
        // condition preenchidos — nunca null nesse caso. Usa fallback
        // genérico em vez de deixar a linha inteira falhar no INSERT.
        const variant = categoryMatch === true
            ? (c.variant || `${category}-nao-identificado`)
            : (c.variant ?? null);

        const condition = categoryMatch === true
            ? (c.condition || 'desconhecido')
            : (c.condition ?? null);

        return {
            ...item,
            category,
            category_match: categoryMatch,
            variant,
            condition,
        };
    });
}

async function classifyAllNew(items, category) {
    const results = [];

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        console.log(`  Classificando lote ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} itens)...`);

        try {
            const classified = await classifyBatch(batch, category);
            results.push(...classified);
        } catch (err) {
            console.error(`  Erro no lote ${Math.floor(i / BATCH_SIZE) + 1}:`, err.message);
            results.push(
                ...batch.map((item) => ({
                    ...item,
                    category,
                    category_match: null,
                    variant: null,
                    condition: null,
                }))
            );
        }
    }

    return results;
}

// Grava o resultado da classificação (nova) em classificacoes_ia,
// independente do resultado ser match ou não.
async function saveToCache(classifiedItems) {
    const rows = classifiedItems
        .filter((item) => item.category_match !== null)
        .map((item) => ({
            url: item.url,
            category: item.category,
            category_match: item.category_match,
            variant: item.variant,
            condition: item.condition,
        }));

    // Deduplica por url — mantém a última ocorrência de cada URL,
    // porque o Postgres não permite ON CONFLICT DO UPDATE afetar a
    // mesma linha duas vezes dentro de um único comando.
    const dedupedMap = new Map();
    rows.forEach((row) => dedupedMap.set(row.url, row));
    const dedupedRows = Array.from(dedupedMap.values());

    if (dedupedRows.length === 0) return;

    const { error } = await supabase
        .from('classificacoes_ia')
        .upsert(dedupedRows, { onConflict: 'url' });

    if (error) throw new Error(`Erro ao gravar cache: ${error.message}`);
}
// ------------------------------------------------------------------
// Execução principal
// ------------------------------------------------------------------
async function run() {
    for (const search of SEARCHES) {
        console.log(`\n=== Processando categoria: ${search.category} ===`);

        console.log('1. Rodando Actor da Apify...');
        const rawItems = await runApifyActor(search.startUrl);
        console.log(`   ${rawItems.length} itens raspados.`);

        console.log('2. Consultando cache de classificação...');
        const { cached, toClassify } = await splitCachedAndNew(rawItems);
        console.log(`   ${cached.length} já em cache, ${toClassify.length} novos a classificar.`);

        let newlyClassified = [];
        if (toClassify.length > 0) {
            console.log('3. Classificando itens novos via Claude Haiku...');
            newlyClassified = await classifyAllNew(toClassify, search.category);

            console.log('   Gravando resultado no cache (classificacoes_ia)...');
            await saveToCache(newlyClassified);
        }

        const allClassified = [...cached, ...newlyClassified];
        const validItems = allClassified.filter((item) => item.category_match === true);

        console.log(`\nResumo (${search.category}):`);
        console.log(`  Total raspado: ${rawItems.length}`);
        console.log(`  category_match = true: ${validItems.length}`);
        console.log(`  category_match = false: ${allClassified.length - validItems.length}`);

        // Próximo passo (ainda não implementado): inserir validItems em
        // anuncios_ativos + historico_precos, chamar media_precos_mercado,
        // calcular opportunity_level, e tratar strikes dos que sumiram.
    }
}

run()
    .then(() => console.log('\nWorker finalizado.'))
    .catch((err) => {
        console.error('\nErro no worker:', err);
        if (err.cause) {
            console.error('Causa raiz:', err.cause);
        }
        process.exit(1);
    });