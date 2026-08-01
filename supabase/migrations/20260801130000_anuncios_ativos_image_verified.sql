-- ============================================================
-- anuncios_ativos: image_url + verified_at
-- ============================================================

alter table public.anuncios_ativos
  add column image_url text;

comment on column public.anuncios_ativos.image_url is
  'URL da imagem principal do anúncio no OLX, exibida pro usuário no app.';

alter table public.anuncios_ativos
  add column verified_at timestamptz default null;

comment on column public.anuncios_ativos.verified_at is
  'Timestamp da verificação manual/via IA do anúncio individual (abrir o anúncio e conferir a descrição) antes de confirmar como oportunidade real. Aplicável a anúncios com opportunity_level = ''extraordinaria''. NULL = ainda não verificado. Sem campo de resultado: a ausência de verificação (NULL) já é o sinal para o app tratar como pendente.';
