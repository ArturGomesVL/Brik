-- ============================================================
-- Brique MVP — schema inicial
-- Categorias suportadas nesta fase: iphone, videogame_console
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- anuncios_ativos
-- Estado atual dos anúncios sendo acompanhados pela raspagem.
-- Só recebe anúncios com category_match = true (a classificação
-- da IA acontece antes do insert; anúncios que não batem com a
-- categoria buscada nunca chegam aqui).
-- Ao acumular 3 strikes consecutivos, a linha é DELETADA
-- (decisão do produto: sem soft delete). O histórico de preço
-- já registrado para essa URL permanece intacto em
-- historico_precos, que não tem FK para esta tabela.
-- ------------------------------------------------------------
create table public.anuncios_ativos (
  id                    uuid primary key default gen_random_uuid(),
  url                   text not null unique,
  title                 text not null,
  category              text not null
                          check (category in ('iphone', 'videogame_console')),
  variant               text not null,
  condition             text not null default 'desconhecido'
                          check (condition in ('novo', 'usado', 'desconhecido')),
  price                 numeric(10,2) not null check (price > 0),
  location_city         text,
  location_neighborhood text,
  opportunity_level     text not null default 'nenhuma'
                          check (opportunity_level in ('nenhuma', 'boa', 'otima', 'extraordinaria')),
  strikes               smallint not null default 0
                          check (strikes between 0 and 3),
  first_seen_at         timestamptz not null default now(),
  last_seen_at          timestamptz not null default now(),
  last_price_change_at  timestamptz not null default now(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.anuncios_ativos is
  'Estado atual dos anúncios acompanhados. Linha é removida (hard delete) ao acumular 3 strikes consecutivos sem aparecer na raspagem.';
comment on column public.anuncios_ativos.strikes is
  'Zerado sempre que o anúncio reaparece em uma raspagem; incrementado quando não aparece. Ao chegar em 3, a linha é deletada pela aplicação.';
comment on column public.anuncios_ativos.opportunity_level is
  'Classificação calculada comparando price com a média segmentada (categoria+variante+condição) vinda de historico_precos. Limiares (%) ficam hardcoded na aplicação.';

-- Índice composto pedido: é como o app vai filtrar/agrupar os
-- anúncios ativos na listagem (por categoria+variante+condição).
create index idx_anuncios_ativos_category_variant_condition
  on public.anuncios_ativos (category, variant, condition);

-- Acelera a tela "oportunidades" (filtra fora 'nenhuma').
create index idx_anuncios_ativos_opportunity_level
  on public.anuncios_ativos (opportunity_level)
  where opportunity_level <> 'nenhuma';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_anuncios_ativos_updated_at
  before update on public.anuncios_ativos
  for each row
  execute function public.set_updated_at();

-- ------------------------------------------------------------
-- historico_precos
-- Série append-only de pontos de preço: 1 linha na 1ª vez que a
-- URL é vista, + 1 linha nova toda vez que o preço muda depois
-- disso. NÃO grava 1 linha por ciclo de raspagem (2h) — só
-- eventos reais de preço. Contém TODOS os anúncios válidos
-- (category_match = true), inclusive os que nunca viraram
-- oportunidade, para a média de mercado não sofrer viés de
-- retroalimentação.
--
-- Sem FK para anuncios_ativos de propósito: essa tabela precisa
-- sobreviver ao hard delete do anúncio ao bater 3 strikes.
-- ------------------------------------------------------------
create table public.historico_precos (
  id           uuid primary key default gen_random_uuid(),
  url          text not null,
  category     text not null
                 check (category in ('iphone', 'videogame_console')),
  variant      text not null,
  condition    text not null
                 check (condition in ('novo', 'usado', 'desconhecido')),
  price        numeric(10,2) not null check (price > 0),
  recorded_at  timestamptz not null default now()
);

comment on table public.historico_precos is
  'Pontos de preço (1ª aparição + toda mudança de preço) de todos os anúncios válidos (category_match=true). Fonte da média de mercado — deliberadamente desacoplada de anuncios_ativos e de opportunity_level para não viesar o cálculo.';

-- Índice composto pedido: é exatamente como a média vai ser
-- consultada (categoria+variante+condição), com recorded_at no
-- fim para suportar a janela recente (ex: últimos 30 dias) sem
-- scan completo.
create index idx_historico_precos_segmentacao
  on public.historico_precos (category, variant, condition, recorded_at desc);

create index idx_historico_precos_url
  on public.historico_precos (url);
