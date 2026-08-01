-- ============================================================
-- classificacoes_ia
-- Cache permanente do resultado da classificação via IA (Claude
-- Haiku) por URL, incluindo os que NÃO batem com a categoria
-- buscada (category_match = false).
--
-- Sem isso, uma URL que nunca vira anúncio válido (ex: capinha
-- de iPhone aparecendo na busca de "iphone") seria reclassificada
-- pela IA a cada ciclo de raspagem (2h), pra sempre, gastando
-- chamada de IA à toa.
--
-- Fluxo: antes de chamar a IA, o worker consulta esta tabela por
-- url. Se já existir, reusa o resultado (category_match, variant,
-- condition) sem gastar chamada de IA. Se não existir, classifica
-- e grava aqui — independentemente do resultado ser match ou não.
--
-- Sem FK para anuncios_ativos nem historico_precos: é um cache de
-- classificação, sobrevive ao ciclo de vida (e ao hard delete) do
-- anúncio em anuncios_ativos.
-- ------------------------------------------------------------
create table public.classificacoes_ia (
  url            text primary key,
  category       text not null
                   check (category in ('iphone', 'videogame_console')),
  category_match boolean not null,
  variant        text,
  condition      text
                   check (condition in ('novo', 'usado', 'desconhecido')),
  classified_at  timestamptz not null default now(),
  last_seen_at   timestamptz not null default now(),
  constraint chk_match_requires_variant_condition check (
    category_match = false or (variant is not null and condition is not null)
  )
);

comment on table public.classificacoes_ia is
  'Cache permanente (por url) do resultado da classificação via IA, inclusive para anúncios que não batem com a categoria buscada. Consultada antes de chamar a IA para evitar reclassificar a mesma URL a cada ciclo de raspagem.';
comment on column public.classificacoes_ia.last_seen_at is
  'Atualizado sempre que a raspagem reencontra a URL. Não afeta o cálculo da média nem o ciclo de strikes — serve só para eventual expurgo futuro de cache muito antigo.';
