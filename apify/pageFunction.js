async function pageFunction(context) {
    const { page, request, log, customData, enqueueRequest, globalStore } = context;

    const MAX_PAGES = (customData && customData.maxPages) || 100;
    const startUrl = (request.userData && request.userData.startUrl) || request.url;
    const pageNumber = (request.userData && request.userData.pageNumber) || 1;

    // O OLX pagina pelo parâmetro "o" = número da página (1-indexado):
    // página 1 = sem "o", página 2 -> &o=2, página 3 -> &o=3, ...
    function buildPageUrl(baseUrl, pageNum) {
        const url = new URL(baseUrl);
        if (pageNum > 1) {
            url.searchParams.set('o', String(pageNum));
        } else {
            url.searchParams.delete('o');
        }
        return url.toString();
    }

    // ------------------------------------------------------------
    // Canonicaliza a URL do anúncio pelo ID numérico (6+ dígitos no
    // fim do path). Um mesmo anúncio aparece no OLX sob várias formas
    // entre páginas/renderizações/ciclos de raspagem:
    //   - query string de rastreamento (?rec=u&gallery_id=top_3060&...)
    //   - sufixo ".html"/".htm" ou barra final
    //   - subdomínio regional (pe.olx.com.br) vs www.olx.com.br
    //   - slug diferente antes do ID
    // Sem reduzir tudo ao ID, o worker trata cada variação como um
    // anúncio novo: o registro salvo no ciclo anterior "some" da
    // raspagem e leva strike mesmo continuando ativo (e ainda gasta
    // classificação de IA de novo). /vi/<id> é a forma curta canônica
    // do próprio OLX e redireciona pro anúncio completo.
    // ------------------------------------------------------------
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

    await page.waitForTimeout(2000);
    await page.waitForSelector('a[href*="olx.com.br"]', { timeout: 15000 }).catch(() => { });

    // --- Rola a página pra disparar o lazy-load das imagens ---
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let total = 0;
            const step = 600;
            const timer = setInterval(() => {
                window.scrollBy(0, step);
                total += step;
                if (total >= document.body.scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 150);
        });
    });
    await page.waitForTimeout(1500); // dá tempo das imagens que entraram na tela carregarem
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);

    // ============================================================
    // RASPAGEM CRUA — sem classificação/inferência (isso fica pra
    // uma etapa de IA depois, fora do Actor).
    // Duas estratégias combinadas pra não perder anúncio:
    //  1) por título (classes conhecidas do OLX)
    //  2) por padrão de URL do anúncio (termina em -<id numérico>),
    //     que muda bem menos que nome de classe
    // ============================================================
    const results = await page.evaluate(() => {
        function parsePriceToNumber(priceText) {
            if (!priceText) return null;
            const clean = priceText.replace(/[R$\s]/g, '');
            if (!clean) return null;
            const withoutThousands = clean.replace(/\.(?=\d{3}(\D|$))/g, '');
            const normalized = withoutThousands.replace(',', '.');
            const value = parseFloat(normalized);
            return isNaN(value) ? null : Math.round(value);
        }

        function splitLocationAndDate(raw) {
            if (!raw) return { location: null, postedAt: null };
            const parts = raw.split('\n').map((s) => s.trim()).filter(Boolean);
            if (parts.length === 0) return { location: null, postedAt: null };
            const dateRegex = /(hoje|ontem|\d{1,2}:\d{2}|\d{1,2}\s+de\s+\w+|seg|ter|qua|qui|sex|sáb|dom)/i;
            let location = null;
            let postedAt = null;
            for (const part of parts) {
                if (dateRegex.test(part) && !postedAt) postedAt = part;
                else if (!location) location = part;
            }
            return { location, postedAt };
        }

        function bestFromSrcset(srcset) {
            if (!srcset) return null;
            const entries = srcset.split(',').map((s) => s.trim().split(' ')[0]).filter(Boolean);
            return entries.length ? entries[entries.length - 1] : null;
        }

        function isRealImageSrc(src) {
            return !!src && !src.startsWith('data:image') && !/blank\.gif|spacer\.(png|gif)/i.test(src);
        }

        function findImageUrl(root) {
            // olha TODAS as <img> da região, não só a primeira (a primeira pode ser
            // um selo/ícone, não a foto do anúncio)
            const imgs = Array.from(root.querySelectorAll('img'));
            for (const imgEl of imgs) {
                const direct = imgEl.getAttribute('src') || imgEl.getAttribute('data-src')
                    || imgEl.getAttribute('data-lazy-src') || imgEl.getAttribute('data-original');
                if (isRealImageSrc(direct)) return direct;

                const fromSrcset = bestFromSrcset(imgEl.getAttribute('srcset') || imgEl.getAttribute('data-srcset'));
                if (isRealImageSrc(fromSrcset)) return fromSrcset;

                if (isRealImageSrc(imgEl.currentSrc)) return imgEl.currentSrc;
            }

            const sources = Array.from(root.querySelectorAll('picture source'));
            for (const sourceEl of sources) {
                const fromSource = bestFromSrcset(sourceEl.getAttribute('srcset') || sourceEl.getAttribute('data-srcset'));
                if (isRealImageSrc(fromSource)) return fromSource;
            }

            const bgEls = Array.from(root.querySelectorAll('[style*="background-image"]'));
            for (const bgEl of bgEls) {
                const match = (bgEl.getAttribute('style') || '').match(/url\((['"]?)(.*?)\1\)/);
                if (match && isRealImageSrc(match[2])) return match[2];
            }
            return null;
        }

        function findPriceText(root) {
            const priceEl = root.querySelector('[class*="price"], [class*="Price"]');
            if (priceEl && /R\$/.test(priceEl.innerText)) return priceEl.innerText.trim();
            const allEls = root.querySelectorAll('*');
            for (const el of allEls) {
                const text = (el.innerText || '').trim();
                if (/^R\$\s?[\d.,]+/.test(text) && text.length < 30) return text;
            }
            return null;
        }

        // Mesma canonicalização por ID do normalizeUrl de fora — este
        // escopo roda no browser e não compartilha closure, então
        // precisa da própria cópia. Manter as duas idênticas.
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

        const found = new Map();

        const titleEls = document.querySelectorAll(
            'h2[class*="olx-adcard__title"], h2[class*="adcard-title"], [data-testid="ad-title"], [data-testid="ad-card-title"]'
        );

        function findCardRoot(el) {
            let cur = el;
            let fallbackAnchor = null;

            // Passagem 1: prefere um container com preço E imagem (card completo)
            cur = el;
            for (let i = 0; i < 14 && cur; i++) {
                cur = cur.parentElement;
                if (!cur) break;
                const cls = cur.className || '';
                if (typeof cls === 'string' && /\bolx-adcard\b/.test(cls) && !/__/.test(cls)) return cur;
                if (cur.tagName === 'A' && cur.getAttribute('href') && cur.getAttribute('href').includes('olx.com.br') && !fallbackAnchor) {
                    fallbackAnchor = cur;
                }
                const hasPrice = /R\$/.test(cur.innerText || '') && (cur.innerText || '').length < 900;
                const hasImg = cur.querySelector('img') !== null;
                if (hasPrice && hasImg) return cur;
            }

            // Passagem 2: aceita só preço, mesmo sem imagem ainda visível
            cur = el;
            for (let i = 0; i < 14 && cur; i++) {
                cur = cur.parentElement;
                if (!cur) break;
                if (/R\$/.test(cur.innerText || '') && (cur.innerText || '').length < 900) return cur;
            }

            // Último recurso: o link do anúncio (ou pai direto do título)
            return fallbackAnchor ? (fallbackAnchor.parentElement || fallbackAnchor) : (el.closest('a') || el.parentElement);
        }

        titleEls.forEach((titleEl) => {
            const cardRoot = findCardRoot(titleEl);
            const linkEl = cardRoot.tagName === 'A' ? cardRoot : cardRoot.querySelector('a[href*="olx.com.br"]');
            const rawHref = linkEl ? linkEl.href : null;
            const href = rawHref ? normalizeUrl(rawHref) : null;
            if (!href || found.has(href)) return;

            const locationEl = cardRoot.querySelector('[class*="location"], [data-testid="location-date"]');
            const priceText = findPriceText(cardRoot);
            const rawLocation = locationEl ? locationEl.innerText.trim() : null;
            const { location, postedAt } = splitLocationAndDate(rawLocation);

            found.set(href, {
                title: titleEl.innerText.trim(),
                priceText,
                price: parsePriceToNumber(priceText),
                location,
                postedAtText: postedAt,
                url: href,
                imageUrl: findImageUrl(cardRoot),
            });
        });

        const idPattern = /-\d{6,}(?:\.html?)?\/?$/;
        const anchors = Array.from(document.querySelectorAll('a[href*="olx.com.br"]')).filter((a) => {
            try {
                return idPattern.test(new URL(a.href).pathname);
            } catch (e) {
                return false;
            }
        });

        anchors.forEach((a) => {
            const href = normalizeUrl(a.href);
            if (found.has(href)) return;

            let root = a;
            for (let i = 0; i < 6; i++) {
                if (/R\$/.test(root.innerText || '')) break;
                if (!root.parentElement) break;
                root = root.parentElement;
            }

            const titleEl = root.querySelector('h2, h3, [data-testid*="title"]');
            const title = titleEl ? titleEl.innerText.trim() : (a.innerText || '').trim().split('\n')[0];
            if (!title) return;

            const locationEl = root.querySelector('[class*="location"], [data-testid="location-date"]');
            const priceText = findPriceText(root);
            const rawLocation = locationEl ? locationEl.innerText.trim() : null;
            const { location, postedAt } = splitLocationAndDate(rawLocation);

            found.set(href, {
                title,
                priceText,
                price: parsePriceToNumber(priceText),
                location,
                postedAtText: postedAt,
                url: href,
                imageUrl: findImageUrl(root) || findImageUrl(root.parentElement || root),
            });
        });

        if (found.size === 0) {
            return { debug: true, htmlSample: document.body.innerHTML.slice(0, 3000) };
        }
        return { debug: false, items: Array.from(found.values()) };
    });

    if (results.debug) {
        log.warning('Página ' + pageNumber + ' sem anúncios (possível bloqueio/captcha do OLX).');

        // Uma página vazia/bloqueada NÃO pode encerrar a paginação: sem
        // enfileirar a próxima, todos os anúncios das páginas seguintes
        // somem da raspagem e levam strike sem estar inativos. Continua
        // tentando, até um teto de páginas vazias consecutivas.
        const emptyStreak = (globalStore.get('emptyStreak') || 0) + 1;
        globalStore.set('emptyStreak', emptyStreak);

        if (emptyStreak < 3 && pageNumber < MAX_PAGES) {
            try {
                await enqueueRequest({
                    url: buildPageUrl(startUrl, pageNumber + 1),
                    userData: { startUrl, pageNumber: pageNumber + 1 },
                });
                log.info('Página ' + (pageNumber + 1) + ' enfileirada apesar da página ' + pageNumber + ' ter vindo vazia.');
            } catch (e) {
                log.error('Falha ao enfileirar página ' + (pageNumber + 1) + ': ' + e.message);
            }
        } else {
            log.warning('Encerrando paginação após ' + emptyStreak + ' páginas vazias consecutivas.');
        }

        return [{ debug: true, url: request.url, pageNumber, htmlSample: results.htmlSample }];
    }

    const withoutPhoto = results.items.filter((it) => !it.imageUrl).length;
    log.info('Encontrados ' + results.items.length + ' anúncios na página ' + pageNumber
        + ' (' + withoutPhoto + ' sem foto) — ' + request.url);

    if (withoutPhoto === results.items.length && results.items.length > 0) {
        const cardSample = await page.evaluate(() => {
            const titleEls = document.querySelectorAll(
                'h2[class*="olx-adcard__title"], h2[class*="adcard-title"], [data-testid="ad-title"], [data-testid="ad-card-title"]'
            );
            if (titleEls.length === 0) return { found: false };

            function findCardRoot(el) {
                let cur = el;
                for (let i = 0; i < 12 && cur; i++) {
                    cur = cur.parentElement;
                    if (!cur) break;
                    const cls = cur.className || '';
                    if (typeof cls === 'string' && /\bolx-adcard\b/.test(cls) && !/__/.test(cls)) return cur;
                    if (cur.tagName === 'A' && cur.getAttribute('href') && cur.getAttribute('href').includes('olx.com.br')) return cur;
                    if (/R\$/.test(cur.innerText || '') && (cur.innerText || '').length < 600) return cur;
                }
                return el.closest('a') || el.parentElement;
            }

            const first = titleEls[0];
            const cardRoot = findCardRoot(first);
            const wider = cardRoot.parentElement || cardRoot;

            return {
                found: true,
                cardRootHtml: cardRoot.outerHTML.slice(0, 1500),
                widerImgCount: wider.querySelectorAll('img').length,
                widerHtml: wider.outerHTML.slice(0, 2000),
            };
        });
        log.warning('DIAGNÓSTICO DE CARD: ' + JSON.stringify(cardSample));
    }

    // Página veio com anúncios: zera o contador de páginas vazias.
    globalStore.set('emptyStreak', 0);

    let seenUrls = globalStore.get('seenUrls');
    if (!seenUrls) {
        seenUrls = new Set();
        globalStore.set('seenUrls', seenUrls);
    }
    const newItems = results.items.filter((it) => it.url && !seenUrls.has(it.url));
    results.items.forEach((it) => { if (it.url) seenUrls.add(it.url); });

    // Exige DUAS páginas seguidas sem item novo antes de considerar "acabou".
    // Evita parar cedo por causa de anúncios patrocinados/fixos que se repetem
    // entre páginas e podem, por coincidência, preencher uma página inteira.
    let zeroNewStreak = globalStore.get('zeroNewStreak') || 0;
    if (pageNumber > 1 && newItems.length === 0) {
        zeroNewStreak += 1;
    } else {
        zeroNewStreak = 0;
    }
    globalStore.set('zeroNewStreak', zeroNewStreak);

    const isLastPage = results.items.length === 0 || zeroNewStreak >= 2;

    log.info('DECISÃO DE PAGINAÇÃO: pageNumber=' + pageNumber + ' MAX_PAGES=' + MAX_PAGES
        + ' items=' + results.items.length + ' newItems=' + newItems.length
        + ' zeroNewStreak=' + zeroNewStreak + ' isLastPage=' + isLastPage);

    if (!isLastPage && pageNumber < MAX_PAGES) {
        try {
            await enqueueRequest({
                url: buildPageUrl(startUrl, pageNumber + 1),
                userData: { startUrl, pageNumber: pageNumber + 1 },
            });
            log.info('Página ' + (pageNumber + 1) + ' enfileirada com sucesso.');
        } catch (e) {
            log.error('Falha ao enfileirar página ' + (pageNumber + 1) + ': ' + e.message);
        }
    } else {
        log.info('Parando: isLastPage=' + isLastPage + ' ou pageNumber(' + pageNumber + ') >= MAX_PAGES(' + MAX_PAGES + ').');
    }

    return results.items.map((it) => Object.assign({}, it, { pageNumber, sourceUrl: request.url }));
}