-- ============================================================
-- defeito
-- Marca anúncio cujo TÍTULO já diz que o produto tem defeito
-- (quebrado, não liga, sem Face ID, pra peças...).
--
-- Em iPhone o anúncio com defeito continua no banco e o front mostra
-- um aviso no card. Ele NÃO entra em historico_precos, que é a fonte
-- das médias de mercado: um aparelho quebrado é barato justamente por
-- isso e puxaria a mediana dos que funcionam. O opportunity_level dele
-- continua sendo calculado contra a média dos aparelhos bons.
--
-- classificacoes_ia.defeito guarda só o julgamento do Haiku sobre o
-- título (o cache é por URL); a detecção por palavras no título é
-- recalculada a cada raspagem e não fica no cache.
-- ------------------------------------------------------------
alter table public.anuncios_ativos
  add column defeito boolean not null default false;

comment on column public.anuncios_ativos.defeito is
  'true quando o título diz que o produto tem defeito. O front mostra aviso no card; o anúncio não entra em historico_precos (não influencia a média de mercado).';

alter table public.classificacoes_ia
  add column defeito boolean not null default false;

comment on column public.classificacoes_ia.defeito is
  'Julgamento do Haiku (true = o título diz que o produto tem defeito), guardado junto da classificação cacheada por URL.';
