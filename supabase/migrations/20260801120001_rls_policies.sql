-- ============================================================
-- RLS — leitura pública (app mostrando oportunidades), escrita
-- só pelo backend da raspagem (service_role, que ignora RLS por
-- padrão no Supabase, mas deixamos explícito aqui mesmo assim).
-- Ajuste se o app cliente não for público.
-- ============================================================

alter table public.anuncios_ativos enable row level security;
alter table public.historico_precos enable row level security;

create policy "anuncios_ativos: leitura publica"
  on public.anuncios_ativos
  for select
  using (true);

create policy "historico_precos: leitura publica"
  on public.historico_precos
  for select
  using (true);

-- Nenhuma policy de insert/update/delete para anon/authenticated:
-- só o service_role (usado pelo worker de raspagem) escreve
-- nessas tabelas.
