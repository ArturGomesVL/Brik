-- ============================================================
-- media_precos_mercado — mediana ajustada por desconto_pct
--
-- Preço anunciado (mesmo vindo de historico_precos, que já é
-- desacoplado de anuncios_ativos) é sempre preço PEDIDO, nunca
-- preço de venda real — quem está anunciando é quem ainda não
-- vendeu, então a mediana crua tende a ficar enviesada pra cima.
-- Pra compensar, a função agora aplica um desconto percentual
-- (p_desconto_pct, default 10%) sobre a mediana antes de
-- devolvê-la: preco_mediano = mediana_crua × (1 - desconto_pct/100).
--
-- Esse é o valor (já ajustado) que deve ser usado como referência
-- de preço em qualquer cálculo de desconto/opportunity_level —
-- nunca a mediana crua. preco_medio continua cru (não ajustado);
-- não é usado como referência hoje, só informativo.
--
-- Assinatura muda (novo parâmetro p_desconto_pct), então precisa
-- dropar a função antiga primeiro — CREATE OR REPLACE não troca a
-- função existente quando o número de parâmetros muda, cria um
-- overload novo e deixa a chamada por nome ambígua.
-- ------------------------------------------------------------
drop function if exists public.media_precos_mercado(text, text, text, integer);

create or replace function public.media_precos_mercado(
  p_category     text,
  p_variant      text,
  p_condition    text,
  p_janela_dias  integer default 30,
  p_desconto_pct numeric default 10
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
    avg(price)::numeric(10,2)                                                                      as preco_medio,
    (
      percentile_cont(0.5) within group (order by price) * (1 - p_desconto_pct / 100.0)
    )::numeric(10,2)                                                                                as preco_mediano,
    count(*)                                                                                        as amostras,
    max(recorded_at)                                                                                as ultimo_registro
  from public.historico_precos
  where category    = p_category
    and variant     = p_variant
    and condition   = p_condition
    and recorded_at >= now() - (p_janela_dias || ' days')::interval;
$$;

comment on function public.media_precos_mercado(text, text, text, integer, numeric) is
  'Média (crua) e mediana (ajustada por p_desconto_pct, default 10%) de preço segmentadas por category+variant+condition, na janela recente (default 30 dias), a partir de historico_precos (todos os anúncios válidos, sem viés de retroalimentação). preco_mediano já sai com o desconto aplicado — compensa o viés de preço pedido vs. preço de venda real — e é essa referência (não a mediana crua) que deve ser usada para classificar opportunity_level. amostras=0 e preco_medio/preco_mediano NULL indicam que ainda não há dados suficientes pra essa combinação.';
