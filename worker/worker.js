// worker.js
//
// Worker de ingestão do Brique — conecta scraper Python (Selenium) → cache
// de classificação → Claude Haiku → Supabase.
//
// Fluxo:
//   1. Roda o script Python (Selenium) como subprocesso e espera terminar
//   2. Lê e valida o JSON gerado pelo script
//   3. Separa o que já está em cache (classificacoes_ia) do que é novo
//   4. Classifica os itens novos em lote via Claude Haiku
//   5. Grava em anuncios_ativos / historico_precos e trata strikes
//
// Rodar manualmente por enquanto: node worker.js
require('dotenv').config(); console.log('SUPABASE_URL:', JSON.stringify(process.env.SUPABASE_URL));
const { createClient } = require('@supabase/supabase-js');
const { execFile, spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { canonicalizeVariant, variantMatchesTitle } = require('./variantNormalizer');
const { alignClassifications } = require('./classificationAlignment');

// ------------------------------------------------------------------
// Configuração — tudo via variáveis de ambiente, nunca hardcoded
// ------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Caminho do app.py (Selenium) e do interpretador que tem o Selenium
// instalado (se você usa venv, aponte pro python.exe de dentro dele —
// senão o subprocess pode cair no Python global, sem as libs certas).
const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || 'python';
const PYTHON_SCRIPT_PATH = process.env.PYTHON_SCRIPT_PATH;
const PYTHON_TIMEOUT_MS = Number(process.env.PYTHON_TIMEOUT_MS) || 30 * 60 * 1000; // 30 min de segurança, ajuste via env se precisar

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const BATCH_SIZE = 25;

// Faixa de preço absurdo por categoria — abaixo/acima disso, descarta
// antes de gastar classificação de IA. Não é sobre achar preço "ruim"
// (isso é a oportunidade que o app existe pra achar), é sobre preço
// IMPOSSÍVEL pra um aparelho funcional de verdade (ex: iPhone por R$1 —
// bug de parsing, anúncio-isca, item roubado ou pra peça).
const FAIXA_PRECO_PLAUSIVEL = {
    iphone: { min: 150, max: 15000 },
    videogame_console: { min: 80, max: 8000 },
};

// Depois de classificado (já sabemos variant+condition), compara com a
// mediana do MESMO segmento (mesma fonte do opportunity_level) — pega o
// que a faixa absoluta acima não pega: um preço implausível pro MODELO
// específico, não pra categoria inteira (ex: iPhone 11 usado pelo preço
// de um iPhone novo topo de linha). Só entra em ação com amostras
// suficientes (mesmo mínimo do opportunity_level); antes disso, a faixa
// absoluta é a única proteção.
const DESCONTO_MAX_PLAUSIVEL = 0.85; // > 85% abaixo da mediana do segmento → descarta
const ACIMA_MAX_PLAUSIVEL = 2.5;     // > 2,5x a mediana do segmento → descarta

// Antes de apagar um anúncio por 3 strikes, o worker confirma direto no
// OLX se ele saiu mesmo do ar (a raspagem perde anúncio ativo por
// re-ranqueamento/hiccup, não só por venda). STRIKE_VERIFY=false volta ao
// comportamento antigo (apaga com 3 strikes sem confirmar).
const VERIFY_STRIKES_ON_OLX = process.env.STRIKE_VERIFY !== 'false';
const OLX_PROBE_CONCURRENCY = 3;
const OLX_PROBE_TIMEOUT_MS = 15000;
// Máximo de verificações no OLX por ciclo; o excedente é verificado nos
// ciclos seguintes (raspagem quebrada é barrada pela trava de cobertura).
const OLX_PROBE_MAX = 250;
const BROWSER_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

// O app.py define BUSCA/CATEGORIA/CONDICAO internamente (editado à mão
// antes de cada execução — não recebe argumentos do worker) e devolve a
// categoria OLX (slug) dentro do próprio JSON gerado. Este mapa traduz o
// slug do OLX pra categoria interna usada no resto do pipeline
// (classificação + upsert), evitando manter uma lista de buscas separada
// no Node que podia ficar desincronizada do que o script realmente raspou.
const CATEGORIA_OLX_PARA_INTERNA = {
    celulares: 'iphone',
    games: 'videogame_console',
};

// ------------------------------------------------------------------
// Passo 1 — Rodar o script Python (Selenium) como subprocesso e ler o
// JSON que ele gera ao final.
//
// spawn (em vez de execFile) porque: a raspagem pode levar minutos e gerar
// bastante log (execFile bufferiza stdout/stderr inteiro e tem um
// maxBuffer default de 1MB, que esse volume de log pode passar fácil);
// spawn dá o handle do processo pra matar no timeout (child.kill()); e os
// argumentos vão como array, sem shell, então um caminho com espaço (ex:
// "scrapping python\app.py") funciona sem escaping manual e sem risco de
// injeção de comando.
// ------------------------------------------------------------------
async function runPythonScraper() {
    if (!PYTHON_SCRIPT_PATH) {
        throw new Error('PYTHON_SCRIPT_PATH não está definido. Configure o caminho do app.py no .env.');
    }

    const scriptDir = path.dirname(PYTHON_SCRIPT_PATH);
    const startedAt = Date.now();

    console.log(`[scraper] Iniciando: ${PYTHON_EXECUTABLE} "${PYTHON_SCRIPT_PATH}"`);

    await new Promise((resolve, reject) => {
        const child = spawn(PYTHON_EXECUTABLE, [PYTHON_SCRIPT_PATH], { cwd: scriptDir });
        let timedOut = false;

        const timer = setTimeout(() => {
            timedOut = true;
            console.error(`[scraper] Excedeu o timeout de ${PYTHON_TIMEOUT_MS / 1000}s — encerrando processo.`);
            child.kill();
        }, PYTHON_TIMEOUT_MS);

        child.stdout.on('data', (chunk) => process.stdout.write(`[scraper] ${chunk}`));
        child.stderr.on('data', (chunk) => process.stderr.write(`[scraper] ${chunk}`));

        child.on('error', (err) => {
            clearTimeout(timer);
            reject(new Error(`Falha ao iniciar o script Python: ${err.message}`));
        });

        child.on('close', (code) => {
            clearTimeout(timer);
            if (timedOut) {
                reject(new Error(`Script Python excedeu o timeout de ${PYTHON_TIMEOUT_MS / 1000}s e foi encerrado.`));
            } else if (code !== 0) {
                reject(new Error(`Script Python terminou com exit code ${code}.`));
            } else {
                resolve();
            }
        });
    });

    console.log('[scraper] Processo Python finalizado. Procurando JSON gerado...');

    const jsonFile = findLatestJsonFile(scriptDir, startedAt);
    if (!jsonFile) {
        throw new Error(`Nenhum arquivo .json encontrado em "${scriptDir}" criado durante esta execução.`);
    }

    console.log(`[scraper] Lendo resultado: ${jsonFile}`);
    const raw = fs.readFileSync(jsonFile, 'utf-8');

    let payload;
    try {
        payload = JSON.parse(raw);
    } catch (err) {
        throw new Error(`Falha ao parsear JSON gerado pelo script Python (${jsonFile}): ${err.message}`);
    }

    return payload;
}

// O app.py nomeia o arquivo de saída como busca-estado-condicao-timestamp.json
// — em vez de replicar esse formato aqui (e desincronizar se o script
// mudar o padrão), pegamos o .json mais recente na pasta de saída criado
// depois do início desta execução.
function findLatestJsonFile(dir, sinceMs) {
    const candidates = fs.readdirSync(dir)
        .filter((name) => name.endsWith('.json'))
        .map((name) => {
            const fullPath = path.join(dir, name);
            return { fullPath, mtimeMs: fs.statSync(fullPath).mtimeMs };
        })
        .filter((file) => file.mtimeMs >= sinceMs - 2000); // margem pra diferença de clock

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return candidates[0].fullPath;
}

// O campo Imagem vem do atributo srcset do <img> (ex: "url1 1x, url2 2x"),
// não uma URL limpa — pega o último candidato (maior resolução), igual o
// pageFunction do Apify fazia antes de ser removido.
function bestImageFromSrcset(srcset) {
    if (!srcset) return null;
    const entries = srcset.split(',').map((s) => s.trim().split(' ')[0]).filter(Boolean);
    return entries.length ? entries[entries.length - 1] : null;
}

// Canonicaliza a URL do anúncio pelo ID numérico (6+ dígitos no fim do
// path). O OLX regenera o slug da URL sempre que o vendedor edita o
// título do anúncio — inclusive quando o preço vem embutido no título
// (ex: "iphone-11-128gb-1-250-00" -> "...-1-150-00" depois de um ajuste
// de preço) — mesmo ID, URL "nova". Sem canonicalizar, cada edição de
// título cria uma linha duplicada em anuncios_ativos e a linha antiga
// fica com o preço/strikes congelados pra sempre (a antiga nunca é
// vista de novo com essa URL, então nunca é atualizada nem apagada —
// o probeOlxAd do passo de strikes confirma que o ID está ativo e só
// zera o strike, sem corrigir o preço). Mesma lógica que já existia no
// pageFunction do Apify, agora aplicada aqui porque o Apify foi
// removido e o scraper Python (app.py) não normaliza o href.
function normalizeUrl(url) {
    try {
        const u = new URL(url);
        const idMatch = u.pathname.match(/(\d{6,})(?:\.html?)?\/?$/i);
        if (idMatch) return `https://www.olx.com.br/vi/${idMatch[1]}`;
        return `https://www.olx.com.br${u.pathname.replace(/\/+$/, '')}`;
    } catch (e) {
        return url;
    }
}

// ------------------------------------------------------------------
// Passo 2 — Validar o JSON do scraper (array não vazio + campos
// obrigatórios) e mapear os campos do app.py (Titulo, Preco, Local,
// Imagem, Link) pros nomes que o resto do pipeline já espera (title,
// price, location, imageUrl, url). Item sem título/link/preço válido é
// descartado em vez de travar o worker inteiro.
// ------------------------------------------------------------------
function mapAndValidateScraperOutput(payload) {
    const categoriaOlx = payload && payload.categoria;
    const category = CATEGORIA_OLX_PARA_INTERNA[categoriaOlx];
    if (!category) {
        throw new Error(`Categoria OLX "${categoriaOlx}" não mapeada em CATEGORIA_OLX_PARA_INTERNA.`);
    }

    const anuncios = Array.isArray(payload.anuncios) ? payload.anuncios : [];
    if (anuncios.length === 0) {
        throw new Error('JSON do scraper não contém nenhum anúncio (campo "anuncios" vazio ou ausente).');
    }

    const items = [];
    let descartados = 0;
    let descartadosPrecoImplausivel = 0;
    const faixa = FAIXA_PRECO_PLAUSIVEL[category];

    for (const raw of anuncios) {
        const title = (raw.Titulo || '').trim();
        const url = raw.Link ? normalizeUrl(raw.Link) : raw.Link;
        const price = raw.Preco;

        if (!title || !url || typeof price !== 'number' || !(price > 0)) {
            descartados++;
            continue;
        }

        if (faixa && (price < faixa.min || price > faixa.max)) {
            descartadosPrecoImplausivel++;
            console.warn(`[scraper] Descartado por preço implausível (R$ ${price}, faixa ${faixa.min}-${faixa.max}): ${url}`);
            continue;
        }

        items.push({
            title,
            url,
            price,
            location: raw.Local || null,
            imageUrl: bestImageFromSrcset(raw.Imagem),
        });
    }

    if (descartados > 0) {
        console.warn(`[scraper] ${descartados} anúncio(s) descartado(s): título, link ou preço inválido/ausente.`);
    }
    if (descartadosPrecoImplausivel > 0) {
        console.warn(`[scraper] ${descartadosPrecoImplausivel} anúncio(s) descartado(s) por preço fora da faixa plausível.`);
    }
    if (items.length === 0) {
        throw new Error('Nenhum anúncio com título/link/preço válidos após a validação.');
    }

    return { category, items };
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

    let invalidadas = 0;
    for (const item of items) {
        const hit = cacheMap.get(item.url);
        // Entrada de cache gravada por uma classificação trocada (variant que não
        // descreve o título) é refeita em vez de reaproveitada pra sempre.
        if (hit && hit.category_match === true && !variantMatchesTitle(hit.category, item.title, hit.variant)) {
            invalidadas++;
            toClassify.push(item);
        } else if (hit) {
            cached.push({ ...item, ...hit });
        } else {
            toClassify.push(item);
        }
    }
    if (invalidadas > 0) {
        console.warn(`   ${invalidadas} entrada(s) do cache não batem com o título — serão reclassificadas.`);
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
O MODELO é obrigatório no variant: nunca devolva só "iphone" nem "iphone-pro-max" sem o
número/nome do modelo. Se o título não permitir identificar o modelo (ex: "iPhone novíssimo",
"iPhone pro max 256"), devolva variant null (categoryMatch continua true se for um iPhone
físico). Escreva o modelo sempre com hífen entre as palavras: "iphone-xs-max",
"iphone-11-pro-max", "iphone-8-plus", "iphone-13-mini", "iphone-16e", "iphone-air".
ARMAZENAMENTO: inclua SEMPRE que aparecer no título, mesmo abreviado ("128", "128g",
"128 gb", "1tb"), no formato "128gb" ou "1tb". Se não aparecer, NÃO invente — omita.
iPhone SE: inclua o ano da geração ("iphone-se-2016", "iphone-se-2020", "iphone-se-2022");
se o título não permitir saber a geração, devolva variant null.

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



Devolva UM objeto para CADA título da lista, na mesma ordem, sem pular nenhum. Cada objeto contém:
- "index": o número do item (mesmo da lista, começando em 0)
- "titulo": o título do item COPIADO exatamente como veio na lista (sem o número). É obrigatório: serve pra conferir que a resposta pertence a este anúncio
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
            max_tokens: 4096,
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

    // Casa pelo título ecoado (não só pelo index): já houve execução em que a IA
    // devolveu a lista deslocada em uma posição e cada anúncio ficou com o
    // variant do título seguinte.
    const aligned = alignClassifications(items, classifications);
    const realinhados = aligned.filter((c, i) => c && c.index !== i).length;
    if (realinhados > 0) {
        console.warn(`  ⚠ IA devolveu ${realinhados} item(ns) fora da posição — realinhados pelo título.`);
    }
    const semResposta = aligned.filter((c) => !c).length;
    if (semResposta > 0) {
        console.warn(`  ⚠ ${semResposta} item(ns) sem resposta correspondente da IA — ficam pra próxima execução.`);
    }
    let divergentes = 0;

    const result = items.map((item, i) => {
        let c = aligned[i] || {};

        // Rede de segurança: o variant tem que descrever o aparelho do título.
        if (c.categoryMatch === true && !variantMatchesTitle(category, item.title, c.variant)) {
            divergentes++;
            console.warn(`  ⚠ variant não bate com o título, descartado: "${item.title}" -> ${c.variant}`);
            c = {};
        }

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

    if (divergentes > 0) {
        console.warn(`  ${divergentes} classificação(ões) descartada(s) neste lote (não vão pro cache nem pro banco).`);
    }
    return result;
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
    // Deduplica por url — o scraper pode raspar o mesmo anúncio mais de
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

        // Informa quando o vendedor mudou o preço do anúncio entre raspagens.
        // O upsert sempre grava o preço mais recente (item.price), que é
        // o comportamento correto — o banco deve refletir o preço atual do OLX.
        if (priceChanged) {
            console.log(
                `[PREÇO ATUALIZADO] ${item.url}\n` +
                `  anterior: R$ ${existing.price}\n` +
                `  atual   : R$ ${item.price}`
            );
        }

        const mediaKey = `${item.category}|${item.variant}|${item.condition}`;
        const mediaRow = mediaMap.get(mediaKey);

        // Preço implausível pro segmento (variant+condition) específico —
        // não é uma "oportunidade extraordinária" de verdade, é preço
        // impossível pra aquele modelo (ex: iPhone 11 usado pelo preço de
        // um topo de linha novo, ou um preço tão baixo que nenhum vendedor
        // real pediria). Só entra em ação com amostras suficientes no
        // segmento (mesmo mínimo do opportunity_level); não rejeita o
        // desconto genuíno de 10-30% que é a razão do app existir.
        if (mediaRow && mediaRow.amostras >= 3 && mediaRow.preco_mediano != null) {
            const referencia = Number(mediaRow.preco_mediano);
            const razao = priceNum / referencia;
            if (razao < (1 - DESCONTO_MAX_PLAUSIVEL) || razao > ACIMA_MAX_PLAUSIVEL) {
                console.warn(
                    `  Item descartado (preço implausível pro segmento ${mediaKey}: ` +
                    `R$ ${priceNum} vs. mediana R$ ${referencia.toFixed(2)}): ${item.url}`
                );
                continue;
            }
        }

        const opportunityLevel = calcularOpportunityLevel(item.price, mediaRow);

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
// O Supabase devolve no máximo 1000 linhas por consulta: sem paginar, o
// passo de strikes só enxergava as primeiras 1000 do banco e o resto nunca
// levava strike (anúncio vendido ficava "ativo" pra sempre).
async function fetchAllActiveRows(category, pageSize = 1000) {
    const rows = [];
    for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
            .from('anuncios_ativos')
            .select('url, strikes')
            .eq('category', category)
            .order('id')
            .range(from, from + pageSize - 1);

        if (error) throw new Error(`Erro ao consultar anuncios_ativos p/ strikes: ${error.message}`);
        rows.push(...data);
        if (data.length < pageSize) break;
    }
    return rows;
}

async function deleteActiveByUrl(urls, chunkSize = 40) {
    for (let i = 0; i < urls.length; i += chunkSize) {
        const { error } = await supabase
            .from('anuncios_ativos')
            .delete()
            .in('url', urls.slice(i, i + chunkSize));

        if (error) throw new Error(`Erro ao deletar de anuncios_ativos: ${error.message}`);
    }
}

async function handleStrikes(category, currentUrls) {
    const activeList = await fetchAllActiveRows(category);

    const currentSet = new Set(currentUrls);
    let missing = activeList.filter((row) => !currentSet.has(row.url));

    // Linha "ausente" pela URL, mas cujo anúncio (mesmo ID) foi visto agora sob
    // outra URL, é duplicata superada (ex: linha de URL antiga + linha /vi/<id>).
    // Não adianta dar strike: a sondagem no OLX a confirmaria ativa e ela
    // ficaria congelada com preço velho. Apaga direto.
    const currentIds = new Set(currentUrls.map(extractAdId).filter(Boolean));
    const superseded = missing.filter((row) => currentIds.has(extractAdId(row.url)));
    if (superseded.length > 0) {
        await deleteActiveByUrl(superseded.map((row) => row.url));
        const removidas = new Set(superseded.map((row) => row.url));
        missing = missing.filter((row) => !removidas.has(row.url));
        console.log(`   ${superseded.length} linha(s) duplicada(s) removida(s) (mesmo anúncio já visto sob outra URL).`);
    }

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

    if (gateCandidates.length === 0) {
        // nada a verificar
    } else if (!VERIFY_STRIKES_ON_OLX) {
        gateCandidates.forEach((row) => toDelete.push(row.url));
    } else {
        // Orçamento de verificações por ciclo (cada uma é uma ida ao OLX). O que
        // passar disso fica em strikes=2 e é verificado nos próximos ciclos —
        // nada é apagado sem confirmação, então não precisa travar tudo.
        const toProbe = gateCandidates.slice(0, OLX_PROBE_MAX);
        const adiados = gateCandidates.length - toProbe.length;
        console.log(
            `   Verificando ${toProbe.length} candidato(s) a exclusão direto no OLX` +
            (adiados > 0 ? ` (${adiados} ficam pro próximo ciclo)` : '') + '...'
        );
        const verdicts = await probeMany(toProbe);
        for (const row of toProbe) {
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

    // Uma atualização por valor de strike (em lotes), não uma por linha.
    const porStrike = new Map();
    for (const { url, strikes } of toUpdate) {
        if (!porStrike.has(strikes)) porStrike.set(strikes, []);
        porStrike.get(strikes).push(url);
    }
    const UPDATE_CHUNK = 40;
    for (const [strikes, urls] of porStrike) {
        for (let i = 0; i < urls.length; i += UPDATE_CHUNK) {
            const { error } = await supabase
                .from('anuncios_ativos')
                .update({ strikes })
                .in('url', urls.slice(i, i + UPDATE_CHUNK));

            if (error) throw new Error(`Erro ao atualizar strikes (${strikes}): ${error.message}`);
        }
    }

    await deleteActiveByUrl(toDelete);

    console.log(
        `   Strikes: ${missing.length} ausentes | ${toDelete.length} removidos (confirmados fora do ar) | ` +
        `${aliveCount} ainda ativos (strike zerado) | ${inconclusiveCount} inconclusivos (adiado).`
    );
    if (toDelete.length > 0) {
        console.log(`   Removidos (${toDelete.length}), primeiros 20:`);
        toDelete.slice(0, 20).forEach((url) => console.log(`     ${url}`));
    }
}

// ------------------------------------------------------------------
// Regras de variant — canonicaliza o variant de cada anúncio reconhecido
// pela IA (menos granular, ver variantNormalizer.js) e separa os que não
// têm modelo reconhecível: esses NÃO entram em anuncios_ativos nem em
// historico_precos (que alimenta as médias de mercado).
// ------------------------------------------------------------------
function applyVariantRules(allClassified) {
    const validItems = [];
    const rejectedUrls = [];
    const reasons = new Map();

    for (const item of allClassified) {
        if (item.category_match !== true) continue;

        const { variant, reason } = canonicalizeVariant(item.category, item.variant);
        if (variant === null) {
            rejectedUrls.push(item.url);
            reasons.set(reason, (reasons.get(reason) || 0) + 1);
            continue;
        }
        validItems.push({ ...item, variant });
    }

    return { validItems, rejectedUrls, reasons };
}

function printTop(counts, limit) {
    [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .forEach(([label, qtd]) => console.log(`    ${label}: ${qtd}`));
}

// Um anúncio que já estava no banco e agora é rejeitado (regra nova, ou
// reclassificação) sairia da raspagem "válida" e acabaria zumbi — o
// probeOlxAd do passo de strikes o confirmaria ativo e zeraria o strike
// pra sempre. Remove direto.
async function removeRejectedFromActive(urls, chunkSize = 40) {
    let removed = 0;
    for (let i = 0; i < urls.length; i += chunkSize) {
        const chunk = urls.slice(i, i + chunkSize);
        const { data, error } = await supabase
            .from('anuncios_ativos')
            .delete()
            .in('url', chunk)
            .select('url');

        if (error) throw new Error(`Erro ao remover anúncios rejeitados de anuncios_ativos: ${error.message}`);
        removed += data.length;
    }
    return removed;
}

// ------------------------------------------------------------------
// Execução principal
// ------------------------------------------------------------------
async function run() {
    console.log('1. Rodando script Python de raspagem...');
    const payload = await runPythonScraper();
    const { category, items: rawItemsRaw } = mapAndValidateScraperOutput(payload);
    console.log(`   ${rawItemsRaw.length} itens válidos raspados (categoria: ${category}).`);

    // Deduplica por url — proteção extra contra duplicatas na raspagem
    // (ex: mesmo anúncio patrocinado repetido entre páginas).
    const rawItemsMap = new Map();
    rawItemsRaw.forEach((item) => rawItemsMap.set(item.url, item));
    const rawItems = Array.from(rawItemsMap.values());

    console.log('2. Consultando cache de classificação...');
    const { cached, toClassify } = await splitCachedAndNew(rawItems);
    console.log(`   ${cached.length} já em cache, ${toClassify.length} novos a classificar.`);

    let newlyClassified = [];
    if (toClassify.length > 0) {
        console.log('3. Classificando itens novos via Claude Haiku...');
        newlyClassified = await classifyAllNew(toClassify, category);

        console.log('   Gravando resultado no cache (classificacoes_ia)...');
        await saveToCache(newlyClassified);
    }

    const allClassified = [...cached, ...newlyClassified];
    const matchCount = allClassified.filter((item) => item.category_match === true).length;
    const { validItems, rejectedUrls, reasons } = applyVariantRules(allClassified);

    console.log(`\nResumo (${category}):`);
    console.log(`  Total raspado: ${rawItems.length}`);
    console.log(`  category_match = true: ${matchCount}`);
    console.log(`  category_match = false: ${allClassified.length - matchCount}`);
    console.log(`  modelo não reconhecido (fora do banco): ${rejectedUrls.length}`);
    printTop(reasons, 10);
    console.log(`  entram no banco: ${validItems.length}`);

    if (rejectedUrls.length > 0) {
        const removed = await removeRejectedFromActive(rejectedUrls);
        if (removed > 0) {
            console.log(`  ${removed} linha(s) já gravada(s) em anuncios_ativos removida(s) (modelo não reconhecido).`);
        }
    }

    if (validItems.length > 0) {
        console.log('4. Calculando médias...');
        const mediaMap = await getMediaCache(validItems);

        console.log('5. Gravando em anuncios_ativos e historico_precos...');
        const processedUrls = await processValidItems(validItems, category, mediaMap);

        console.log('6. Tratando strikes...');
        await handleStrikes(category, processedUrls);
    }
}

if (require.main === module) {
    run()
        .then(() => console.log('\nWorker finalizado.'))
        .catch((err) => {
            console.error('\nErro no worker:', err);
            if (err.cause) {
                console.error('Causa raiz:', err.cause);
            }
            process.exit(1);
        });
}

module.exports = { classifyBatch, fetchAllActiveRows, extractAdId };