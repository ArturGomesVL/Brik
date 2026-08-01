-- ============================================================
-- media_precos_mercado
-- Função (em vez de view) para calcular a média/mediana de
-- preço segmentada por (category, variant, condition), usada
-- pra classificar o opportunity_level de cada anúncio novo
-- comparando o price dele contra o resultado desta função.
--
-- Função em vez de view porque a chamada é sempre point-lookup
-- (1 category + 1 variant + 1 condition por vez, no momento de
-- classificar um anúncio específico) — os parâmetros batem
-- exatamente com idx_historico_precos_segmentacao
-- (category, variant, condition, recorded_at desc), garantindo
-- index scan em vez de aggregate sobre a tabela toda. Uma view
-- sem parâmetros dependeria do planner empurrar o WHERE do
-- caller pra baixo do GROUP BY, o que nem sempre é garantido.
--
-- Janela default de 30 dias (p_janela_dias) pra média não ficar
-- desatualizada conforme o mercado muda; pode ser ajustada por
-- chamada sem precisar de nova migration.
-- ------------------------------------------------------------
create or replace function public.media_precos_mercado(
  p_category    text,
  p_variant     text,
  p_condition   text,
  p_janela_dias integer default 30
)
returns table (
  preco_medio     numeric(10,2),
  preco_mediano   numeric(10,2),
  amostras        bigint,
  ultimo_registro timestamptz
)
language sql
stable
as $$
  select
    avg(price)::numeric(10,2)                                             as preco_medio,
    (percentile_cont(0.5) within group (order by price))::numeric(10,2)   as preco_mediano,
    count(*)                                                              as amostras,
    max(recorded_at)                                                      as ultimo_registro
  from public.historico_precos
  where category    = p_category
    and variant     = p_variant
    and condition   = p_condition
    and recorded_at >= now() - (p_janela_dias || ' days')::interval;
$$;

comment on function public.media_precos_mercado(text, text, text, integer) is
  'Média e mediana de preço segmentadas por category+variant+condition, na janela recente (default 30 dias), a partir de historico_precos (todos os anúncios válidos, sem viés de retroalimentação). Base para classificar opportunity_level de um anúncio novo comparando price contra preco_medio/preco_mediano. amostras=0 e preco_medio/preco_mediano NULL indicam que ainda não há dados suficientes pra essa combinação.';
