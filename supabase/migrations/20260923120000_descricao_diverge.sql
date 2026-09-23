-- ============================================================
-- classificacoes_ia.descricao_diverge + redefinição de descricao_defeito
--
-- A verificação da descrição (Haiku lendo o anúncio no OLX) agora julga dois
-- problemas independentes: defeito físico e divergência entre título e
-- descrição (produto errado, só acessório/caixa, réplica, ou preço que não é
-- do aparelho inteiro). Até aqui os dois caíam na mesma coluna e o mesmo
-- destino (remover o anúncio). A partir de agora:
--
--   descricao_diverge = true  -> o anúncio NÃO é o que promete. Sempre
--     removido de anuncios_ativos e bloqueado (não volta enquanto a marca
--     existir) — igual sempre foi.
--
--   descricao_defeito = true  -> o aparelho tem defeito físico confirmado.
--     Nas categorias que mantêm anúncio defeituoso (defeito.mantemDefeituosos;
--     hoje só iPhone), o anúncio CONTINUA em anuncios_ativos: aviso no front
--     (mesma coluna anuncios_ativos.defeito do defeito de título) e
--     opportunity_level nunca acima de "boa" (o desconto se explica pelo
--     defeito, não é uma oportunidade de verdade). Nas categorias que
--     descartam defeituoso (consoles), continua sendo removido como antes.
-- ------------------------------------------------------------
alter table public.classificacoes_ia
  add column descricao_diverge boolean not null default false;

comment on column public.classificacoes_ia.descricao_diverge is
  'true quando o Haiku, lendo a descrição do anúncio no OLX, viu que ela não bate com o título (produto errado, só acessório/caixa, réplica, ou preço que não é do aparelho inteiro). O anúncio é removido de anuncios_ativos e não volta enquanto esta marca existir.';

comment on column public.classificacoes_ia.descricao_defeito is
  'true quando o Haiku, lendo a descrição do anúncio no OLX, confirmou defeito físico. Nas categorias que mantêm anúncio defeituoso (defeito.mantemDefeituosos; hoje só iPhone) o anúncio continua em anuncios_ativos com aviso e opportunity_level nunca acima de "boa"; nas demais categorias é removido, como antes.';
