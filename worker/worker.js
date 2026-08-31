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
const { execFile } = require('child_process');
const os = require('os');

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

// Antes de apagar um anúncio por 3 strikes, o worker confirma direto no
// OLX se ele saiu mesmo do ar (a raspagem perde anúncio ativo por
// re-ranqueamento/hiccup, não só por venda). STRIKE_VERIFY=false volta ao
// comportamento antigo (apaga com 3 strikes sem confirmar).
const VERIFY_STRIKES_ON_OLX = process.env.STRIKE_VERIFY !== 'false';
const OLX_PROBE_CONCURRENCY = 3;
const OLX_PROBE_TIMEOUT_MS = 15000;
// Acima disso, provável raspagem quebrada (não venda em massa) — nem
// verifica nem aplica strike neste ciclo.
const OLX_PROBE_MAX = 250;
const BROWSER_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

// Categoria e baseModel de cada busca — no MVP, roda uma vez pra cada
// entrada desta lista. Ajuste as URLs pra bater com as Start URLs
// configuradas no Actor da Apify.
const SEARCHES = [


    {
        category: 'iphone',
        startUrl: 'https://www.olx.com.br/celulares/estado-pe?q=iphone',
        maxPages: 25,
    },

    /*
        {
            category: 'videogame_console',
            startUrl: 'https://www.olx.com.br/games/consoles-de-video-game/estado-pe?q=ps5',
            maxPages: 20,
        },
        {
            category: 'videogame_console',
            startUrl: 'https://www.olx.com.br/games/consoles-de-video-game/estado-pe?q=ps4',
            maxPages: 20,
        },
        {
            category: 'videogame_console',
            startUrl: 'https://www.olx.com.br/games/consoles-de-video-game/estado-pe?q=ps3',
            maxPages: 20,
        },
        {
            category: 'videogame_console',
            startUrl: 'https://www.olx.com.br/games/consoles-de-video-game/estado-pe?q=ps2',
            maxPages: 20,
        },
        {
            // Xbox fica numa busca só (sem separar por geração): ao contrário do
            // PlayStation, os vendedores escrevem "Xbox 360"/"Xbox One"/"Xbox
            // Series" por extenso no título, então q=xbox já cobre bem todas as
            // gerações sem precisar de uma run por modelo.
            category: 'videogame_console',
            startUrl: 'https://www.olx.com.br/games/consoles-de-video-game/estado-pe?q=xbox',
            maxPages: 20,
        }, */
    // PlayStation continua separado por geração (ps5/ps4/ps3/ps2 acima)
    // porque os vendedores normalmente abreviam ("PS5", "PS4") em vez de
    // escrever "Playstation" por extenso — uma busca única por "playstation"
    // arriscaria perder boa parte dos anúncios.
];

// ------------------------------------------------------------------
// Passo 1 — Disparar o Actor da Apify e pegar os itens do dataset
// ------------------------------------------------------------------
async function runApifyActor(startUrl, maxPages = 25) {
    // 1. Dispara a run (não espera terminar)
    const startResponse = await fetch(
        `https://api.apify.com/v2/actor-tasks/${APIFY_TASK_ID}/runs?token=${APIFY_TOKEN}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                startUrls: [{ url: startUrl }],
                maxPages,
            }),
        }
    );

    if (!startResponse.ok) {
        const errText = await startResponse.text();
        throw new Error(`Apify start run failed: ${startResponse.status} - ${errText}`);
    }

    const startData = await startResponse.json();
    const runId = startData.data.id;
    const datasetId = startData.data.defaultDatasetId;

    console.log(`  Run iniciada (id: ${runId}), aguardando conclusão...`);

    // 2. Fica checando o status a cada 10s, até terminar (sem teto de 5min)
    let status = startData.data.status;
    const POLL_INTERVAL_MS = 10000;
    const MAX_WAIT_MS = 20 * 60 * 1000; // 20 min de segurança, ajuste se precisar
    const startTime = Date.now();

    while (status === 'RUNNING' || status === 'READY') {
        if (Date.now() - startTime > MAX_WAIT_MS) {
            throw new Error(`Run ${runId} excedeu o tempo máximo de espera (${MAX_WAIT_MS / 1000}s).`);
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

        const statusResponse = await fetch(
            `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
        );
        const statusData = await statusResponse.json();
        status = statusData.data.status;
        console.log(`  Status da run: ${status}...`);
    }

    if (status !== 'SUCCEEDED') {
        throw new Error(`Run ${runId} terminou com status ${status} (esperado: SUCCEEDED).`);
    }

    // 3. Busca os itens do dataset, agora que a run terminou de verdade
    const itemsResponse = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&clean=true`
    );

    if (!itemsResponse.ok) {
        const errText = await itemsResponse.text();
        throw new Error(`Erro ao buscar itens do dataset: ${itemsResponse.status} - ${errText}`);
    }

    return itemsResponse.json();
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

IMPORTANTE: aceite qualquer número/versão de modelo, incluindo modelos muito recentes
que você talvez não reconheça (ex: iPhone 16, 17, ou versões futuras) — não é necessário
confirmar que aquele modelo específico existe ou que você já ouviu falar dele. Sua tarefa
é só identificar se o título descreve um APARELHO FÍSICO da categoria buscada (não um
acessório, capa, película, controle avulso, jogo, serviço, ou peça de reposição).

IMPORTANTE sobre variant (celulares): inclua APENAS modelo e armazenamento (quando
disponível), nessa ordem, em minúsculo e separado por hífen. NÃO inclua cor, operadora,
região (ex: "americano", "japonês"), nem outros detalhes.
Exemplos corretos: "iphone-13-128gb", "iphone-15-pro-max-256gb".
Exemplos INCORRETOS (não faça): "iphone-13-128gb-azul-marinho", "iphone-13-preto".

IMPORTANTE sobre variant (videogame/consoles): inclua APENAS modelo, edição
(fat/slim/pro, quando aplicável) e armazenamento (quando disponível), nessa ordem.
Cobre tanto linha PlayStation (ps2 a ps5) quanto linha Xbox (360 ao modelo mais
recente) — trate ambas as marcas com a mesma lógica de modelo+edição+armazenamento.
NÃO inclua se o anúncio é sobre versão "digital" ou "física" do console — isso é uma
característica do anúncio, não uma variante de modelo, e não deve aparecer no variant.
NÃO inclua acessórios inclusos no pacote (ex: "com 2 controles") no variant.
Exemplos corretos (PlayStation): "ps5-slim", "ps5-slim-1tb", "ps4-pro-1tb", "ps3-slim",
"ps2-slim", "ps2-fat".
Exemplos corretos (Xbox): "xbox-360", "xbox-360-slim", "xbox-one", "xbox-one-s",
"xbox-one-x-1tb", "xbox-series-s", "xbox-series-x".
Exemplos INCORRETOS (não faça): "ps5-digital", "ps5-slim-fisico", "ps5-slim-2-controles",
"xbox-360-arcade-com-kinect".
Se o armazenamento não for mencionado no título, use só modelo+edição: "ps5-slim",
"xbox-series-s". "Xbox Series X" e "Xbox Series S" são modelos diferentes (X tem mais
armazenamento e suporta 4K nativo) — nunca junte os dois num variant genérico
"xbox-series"; use sempre "xbox-series-x" ou "xbox-series-s" conforme o título indicar.
Se o título disser apenas "Xbox Series" sem especificar X ou S, e não houver outra pista
(preço, armazenamento, foto/descrição mencionando cor), classifique como categoryMatch
false por ambiguidade, em vez de chutar entre X e S.

IMPORTANTE sobre condition: este é um mercado de produtos usados — a ausência de
sinal claro de "novo" já é, por si só, evidência de que o produto é usado. Frases
como "com nota fiscal", "com caixa", ou "muito novo" NÃO são evidência confiável de
que o produto é novo — vendedores de produtos usados usam essas frases o tempo todo
pra transmitir confiança/conservação, não para indicar que nunca foi usado. Só
classifique como "novo" quando houver sinal inequívoco e específico de que o produto
nunca foi usado, como "lacrado", "lacrado de fábrica", "na caixa, nunca aberto",
"zero km", "sem uso". Em qualquer outro caso, incluindo quando não houver pista
alguma sobre a condição, classifique como "usado".



Para CADA título numerado na lista, responda com um objeto JSON contendo:
- "index": o número do item (mesmo da lista)
- "categoryMatch": true se o anúncio é realmente o produto principal da categoria (não acessório, peça, capa, jogo avulso, serviço, ou produto diferente que só menciona o termo buscado); false caso contrário
- "variant": uma string curta e padronizada identificando o modelo/variante específico (ex: "iphone-11-pro-max-256gb", "ps5-slim"), ou null se categoryMatch for false ou não for possível identificar com confiança
- "condition": "novo" ou "usado" (nunca null quando categoryMatch for true)

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
            ? (c.condition || 'usado')
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
// Passo 4 — Buscar a média de mercado (media_precos_mercado) pra cada
// combinação única de (category, variant, condition) presente em
// validItems, evitando chamar a mesma combinação mais de uma vez.
// ------------------------------------------------------------------
async function getMediaCache(validItems) {
    const mediaMap = new Map();
    const seen = new Set();

    for (const item of validItems) {
        const key = `${item.category}|${item.variant}|${item.condition}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const { data, error } = await supabase.rpc('media_precos_mercado', {
            p_category: item.category,
            p_variant: item.variant,
            p_condition: item.condition,
        });

        if (error) throw new Error(`Erro ao consultar media_precos_mercado (${key}): ${error.message}`);

        mediaMap.set(key, data?.[0] ?? null);
    }

    return mediaMap;
}

// Compara price com a média de mercado segmentada (mediaRow, vinda de
// getMediaCache) e aplica os limiares de desconto. Exige pelo menos 3
// amostras antes de confiar na média — caso contrário os dados ainda
// são insuficientes pra classificar a oportunidade.
function calcularOpportunityLevel(price, mediaRow) {
    if (!mediaRow || mediaRow.amostras < 3 || mediaRow.preco_mediano == null) {
        return 'nenhuma';
    }

    // preco_mediano já vem ajustado (mediana × (1 - desconto_pct/100),
    // aplicado dentro de media_precos_mercado) pra compensar o viés de
    // preço pedido vs. preço de venda real — não usar preco_medio aqui.
    const precoReferencia = Number(mediaRow.preco_mediano);
    const desconto = (precoReferencia - Number(price)) / precoReferencia;
    if (desconto >= 0.30) return 'extraordinaria';
    if (desconto >= 0.25) return 'otima';
    if (desconto >= 0.10) return 'boa';
    return 'nenhuma';
}

// Busca url+price+last_price_change_at em anuncios_ativos pros urls
// informados, em lotes de 40 — o Supabase já deu erro de "headers
// overflow" com .in() em lotes maiores que isso. last_price_change_at
// vem junto porque o upsert em lote precisa preservá-lo pras linhas
// cujo preço não mudou (coluna not null — não pode ficar de fora do
// payload nem virar NULL).
async function selectExistingPrices(urls, chunkSize = 40) {
    const priceMap = new Map();
    if (urls.length === 0) return priceMap;

    for (let i = 0; i < urls.length; i += chunkSize) {
        const chunk = urls.slice(i, i + chunkSize);
        const { data, error } = await supabase
            .from('anuncios_ativos')
            .select('url, price, last_price_change_at')
            .in('url', chunk);

        if (error) throw new Error(`Erro ao consultar preços existentes em anuncios_ativos: ${error.message}`);

        data.forEach((row) => priceMap.set(row.url, row));
    }

    return priceMap;
}

// ------------------------------------------------------------------
// Passo 5 — Gravar validItems em anuncios_ativos (upsert) e registrar
// pontos de preço em historico_precos (só na 1ª aparição da URL ou
// quando o preço muda).
// ------------------------------------------------------------------
async function processValidItems(validItems, category, mediaMap) {
    // Deduplica por url — o Apify pode raspar o mesmo anúncio mais de
    // uma vez (ex: em páginas diferentes da busca), e o Postgres não
    // permite ON CONFLICT DO UPDATE afetar a mesma linha duas vezes
    // dentro de um único comando de upsert. Mantém a última ocorrência.
    const dedupedMap = new Map();
    validItems.forEach((item) => dedupedMap.set(item.url, item));
    const dedupedItems = Array.from(dedupedMap.values());

    const urls = dedupedItems.map((item) => item.url);
    const existingMap = await selectExistingPrices(urls);

    const nowIso = new Date().toISOString();
    const anunciosRows = [];
    const historicoRows = [];

    for (const item of dedupedItems) {
        // price > 0 é exigido pelo check constraint de anuncios_ativos e
        // historico_precos. Anúncios "a combinar", doação/troca, ou com
        // falha de parsing do preço no Actor chegam aqui com price
        // nulo/0/negativo — descarta só esse item em vez de deixar o
        // upsert em lote inteiro falhar por causa de uma linha ruim.
        const priceNum = Number(item.price);
        if (!(priceNum > 0)) {
            console.warn(`  Item descartado (price inválido: ${item.price}): ${item.url}`);
            continue;
        }

        const existing = existingMap.get(item.url);
        const isNew = existing === undefined;
        const priceChanged = !isNew && Number(existing.price) !== Number(item.price);

        const mediaKey = `${item.category}|${item.variant}|${item.condition}`;
        const opportunityLevel = calcularOpportunityLevel(item.price, mediaMap.get(mediaKey));

        const anuncioRow = {
            url: item.url,
            title: item.title,
            category,
            variant: item.variant,
            condition: item.condition,
            price: item.price,
            location_city: 'Recife',
            location_neighborhood: item.location,
            image_url: item.imageUrl,
            opportunity_level: opportunityLevel,
            strikes: 0,
            last_seen_at: nowIso,
            // Coluna not null — sempre presente no payload do upsert em
            // lote: novo valor se é novo/mudou de preço, senão preserva
            // o que já estava salvo (senão o Supabase grava NULL).
            last_price_change_at: (isNew || priceChanged) ? nowIso : existing.last_price_change_at,
        };

        if (isNew || priceChanged) {
            historicoRows.push({
                url: item.url,
                category,
                variant: item.variant,
                condition: item.condition,
                price: item.price,
                recorded_at: nowIso,
            });
        }

        anunciosRows.push(anuncioRow);
    }

    if (anunciosRows.length > 0) {
        const { error } = await supabase
            .from('anuncios_ativos')
            .upsert(anunciosRows, { onConflict: 'url' });

        if (error) throw new Error(`Erro ao gravar anuncios_ativos: ${error.message}`);
    }

    if (historicoRows.length > 0) {
        const { error } = await supabase
            .from('historico_precos')
            .insert(historicoRows);

        if (error) throw new Error(`Erro ao gravar historico_precos: ${error.message}`);
    }

    return dedupedItems.map((item) => item.url);
}

// Extrai o ID numérico do anúncio a partir da URL canônica (/vi/<id>).
function extractAdId(url) {
    const m = String(url || '').match(/(\d{6,})/);
    return m ? m[1] : null;
}

// GET via curl (não via fetch): o Cloudflare do OLX bloqueia o
// fingerprint TLS do undici/fetch com 403, mas deixa o curl passar.
// Retorna o status HTTP, ou null se o curl falhou/não existe.
function curlStatus(url) {
    return new Promise((resolve) => {
        execFile(
            'curl',
            [
                '-s', '-o', os.devNull, '-w', '%{http_code}',
                '-A', BROWSER_UA,
                '-L', '--max-time', String(Math.ceil(OLX_PROBE_TIMEOUT_MS / 1000)),
                url,
            ],
            { timeout: OLX_PROBE_TIMEOUT_MS + 5000, windowsHide: true },
            (err, stdout) => {
                if (err) return resolve(null);
                const code = parseInt(String(stdout).trim(), 10);
                resolve(Number.isFinite(code) ? code : null);
            }
        );
    });
}

// Confirma direto no OLX se o anúncio ainda está no ar. A forma curta
// /vi/<id> responde bem mesmo de IP de datacenter:
//   200      -> anúncio ativo            => 'alive'  (não dar strike)
//   410/404  -> "Anúncio não encontrado" => 'gone'   (pode apagar)
//   null / 403 / 5xx / sem id            => 'inconclusive' (adia)
async function probeOlxAd(url) {
    const id = extractAdId(url);
    if (!id) return 'inconclusive';
    const status = await curlStatus(`https://www.olx.com.br/vi/${id}`);
    if (status === 200) return 'alive';
    if (status === 410 || status === 404) return 'gone';
    return 'inconclusive';
}

async function probeMany(rows) {
    const verdicts = new Map();
    for (let i = 0; i < rows.length; i += OLX_PROBE_CONCURRENCY) {
        const batch = rows.slice(i, i + OLX_PROBE_CONCURRENCY);
        const results = await Promise.all(batch.map((row) => probeOlxAd(row.url)));
        batch.forEach((row, j) => verdicts.set(row.url, results[j]));
    }
    return verdicts;
}

// ------------------------------------------------------------------
// Passo 6 — Tratar strikes: anúncios ativos dessa categoria que não
// apareceram nesta raspagem (currentUrls) ganham +1 strike. Ao chegar
// a 3, antes de apagar (hard delete), o worker confirma no OLX que o
// anúncio realmente saiu do ar — anúncio ainda ativo volta a strikes=0.
// ------------------------------------------------------------------
async function handleStrikes(category, currentUrls) {
    const { data: activeRows, error: fetchError } = await supabase
        .from('anuncios_ativos')
        .select('url, strikes')
        .eq('category', category);

    if (fetchError) throw new Error(`Erro ao consultar anuncios_ativos p/ strikes: ${fetchError.message}`);

    const currentSet = new Set(currentUrls);
    const activeList = activeRows || [];
    const missing = activeList.filter((row) => !currentSet.has(row.url));

    // Trava de segurança contra raspagem incompleta: se esta run enxergou
    // muito menos anúncios do que temos ativos no banco (bloqueio do OLX,
    // paginação interrompida, timeout do Actor), aplicar strike em massa
    // apagaria anúncios que continuam no ar. Nesse caso, pula o ciclo de
    // strikes desta run — perder um ciclo é inofensivo (o anúncio real
    // reaparece na próxima), apagar indevidamente não tem volta.
    const MIN_COBERTURA = 0.5;
    if (activeList.length >= 10 && currentSet.size < activeList.length * MIN_COBERTURA) {
        const pct = Math.round((100 * currentSet.size) / activeList.length);
        console.warn(
            `   ⚠ Strikes PULADOS (${category}): raspagem viu ${currentSet.size} anúncios ` +
            `vs. ${activeList.length} ativos no banco (${pct}%). Provável raspagem incompleta.`
        );
        return;
    }

    const toUpdate = [];        // { url, strikes }
    const gateCandidates = [];  // atingiriam 3 strikes → passam pela verificação no OLX

    for (const row of missing) {
        const newStrikes = row.strikes + 1;
        if (newStrikes >= 3) {
            gateCandidates.push(row);
        } else {
            toUpdate.push({ url: row.url, strikes: newStrikes });
        }
    }

    const toDelete = [];
    let aliveCount = 0;
    let inconclusiveCount = 0;

    if (gateCandidates.length > OLX_PROBE_MAX) {
        console.warn(
            `   ⚠ ${gateCandidates.length} anúncios atingiriam 3 strikes (> ${OLX_PROBE_MAX}): ` +
            `provável raspagem quebrada, não venda. Nada apagado neste ciclo.`
        );
    } else if (gateCandidates.length === 0) {
        // nada a verificar
    } else if (!VERIFY_STRIKES_ON_OLX) {
        gateCandidates.forEach((row) => toDelete.push(row.url));
    } else {
        console.log(`   Verificando ${gateCandidates.length} candidato(s) a exclusão direto no OLX...`);
        const verdicts = await probeMany(gateCandidates);
        for (const row of gateCandidates) {
            const verdict = verdicts.get(row.url);
            if (verdict === 'gone') {
                toDelete.push(row.url);
            } else if (verdict === 'alive') {
                aliveCount++;
                toUpdate.push({ url: row.url, strikes: 0 }); // confirmado ativo → zera
            } else {
                inconclusiveCount++;
                toUpdate.push({ url: row.url, strikes: 3 }); // trava em 3, re-verifica depois
            }
        }
    }

    for (const update of toUpdate) {
        const { error } = await supabase
            .from('anuncios_ativos')
            .update({ strikes: update.strikes })
            .eq('url', update.url);

        if (error) throw new Error(`Erro ao atualizar strikes (${update.url}): ${error.message}`);
    }

    const CHUNK_SIZE = 40;
    for (let i = 0; i < toDelete.length; i += CHUNK_SIZE) {
        const chunk = toDelete.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase
            .from('anuncios_ativos')
            .delete()
            .in('url', chunk);

        if (error) throw new Error(`Erro ao deletar anúncios com 3 strikes: ${error.message}`);
    }

    console.log(
        `   Strikes: ${missing.length} ausentes | ${toDelete.length} removidos (confirmados fora do ar) | ` +
        `${aliveCount} ainda ativos (strike zerado) | ${inconclusiveCount} inconclusivos (adiado).`
    );
    if (toDelete.length > 0) {
        console.log('   Removidos:');
        toDelete.forEach((url) => console.log(`     ${url}`));
    }
}

// ------------------------------------------------------------------
// Execução principal
// ------------------------------------------------------------------
async function run() {
    for (const search of SEARCHES) {
        console.log(`\n=== Processando categoria: ${search.category} ===`);

        console.log('1. Rodando Actor da Apify...');
        const rawItemsRaw = await runApifyActor(search.startUrl, search.maxPages);
        console.log(`   ${rawItemsRaw.length} itens raspados.`);

        // Deduplica por url — proteção extra contra duplicatas na
        // raspagem, além da normalização de URL feita no pageFunction
        // do Actor. Mantém a última ocorrência de cada url.
        const rawItemsMap = new Map();
        rawItemsRaw.forEach((item) => rawItemsMap.set(item.url, item));
        const rawItems = Array.from(rawItemsMap.values());

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

        if (validItems.length > 0) {
            console.log('4. Calculando médias...');
            const mediaMap = await getMediaCache(validItems);

            console.log('5. Gravando em anuncios_ativos e historico_precos...');
            const processedUrls = await processValidItems(validItems, search.category, mediaMap);

            console.log('6. Tratando strikes...');
            await handleStrikes(search.category, processedUrls);
        }
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