-- ============================================================
-- profit_pct + verificação da descrição
--
-- profit_pct: lucro percentual do anúncio sobre a média de mercado,
--   (mediana ajustada - preço) / preço * 100 — a mesma conta que o
--   front fazia por card. Passa a ser gravado pela raspagem (a cada
--   upsert), pra filtrar/ordenar no banco e pra decidir quais anúncios
--   precisam ter a descrição verificada. NULL = ainda sem amostras
--   suficientes pra confiar na média do segmento.
--
-- Anúncio com profit_pct >= 50 e verified_at NULL entra na fila de
-- verificação: o worker abre o anúncio no OLX, manda a descrição pro
-- Haiku e, se houver defeito (ou algo que não é o produto), apaga o
-- anúncio; se estiver ok, preenche verified_at (coluna já existente).
--
-- classificacoes_ia.descricao_defeito guarda o veredito negativo por
-- URL. Sem isso, o anúncio reprovado (apagado de anuncios_ativos) seria
-- gravado de novo na próxima raspagem e reanalisado pra sempre.
-- ------------------------------------------------------------
alter table public.anuncios_ativos
  add column profit_pct numeric(7,1);

comment on column public.anuncios_ativos.profit_pct is
  'Lucro % sobre a média de mercado: (mediana ajustada de media_precos_mercado - price) / price * 100. Recalculado a cada raspagem. NULL quando o segmento (categoria+variante+condição) ainda não tem amostras suficientes.';

-- Fila de verificação: só linhas ainda não verificadas com profit_pct
-- calculado (o limiar de 50% fica na aplicação; o índice cobre qualquer um).
create index idx_anuncios_ativos_verificacao_pendente
  on public.anuncios_ativos (category, profit_pct)
  where verified_at is null and profit_pct is not null;

alter table public.classificacoes_ia
  add column descricao_defeito boolean not null default false;

comment on column public.classificacoes_ia.descricao_defeito is
  'true quando o Haiku, lendo a descrição do anúncio no OLX, encontrou defeito ou algo que não condiz com o produto. O anúncio reprovado é removido de anuncios_ativos e não volta enquanto esta marca existir.';
