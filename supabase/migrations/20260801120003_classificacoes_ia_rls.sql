-- ============================================================
-- classificacoes_ia é cache interno do worker de raspagem, não
-- tem valor pro app cliente ler. RLS ligado, sem policy nenhuma
-- para anon/authenticated — só service_role acessa.
-- ============================================================

alter table public.classificacoes_ia enable row level security;
