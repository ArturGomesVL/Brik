-- ============================================================
-- Reset de descricao_defeito ambíguo (iPhone) — dado, não schema
--
-- Antes da migration anterior (descricao_diverge), descricao_defeito=true
-- significava "defeito OU divergência de título" e sempre removia o
-- anúncio. Agora, pra iPhone (mantemDefeituosos), descricao_defeito=true
-- passa a MANTER o anúncio (com aviso) em vez de removê-lo — só
-- descricao_diverge=true remove.
--
-- As linhas de iPhone gravadas com o código antigo são ambíguas: podem ter
-- sido reprovadas por defeito de verdade OU por divergência (produto
-- errado, só acessório) — não dá pra saber qual sem reler a descrição.
-- Resetamos pra false: se o mesmo anúncio voltar a aparecer numa raspagem
-- futura, ele é tratado como novo (sem bloqueio automático) e, se ainda
-- tiver lucro alto, passa de novo pela verificação — agora respondendo às
-- duas perguntas (defeito e diverge) separadamente.
--
-- Consoles (videogame_console) não precisam de reset: lá descricao_defeito
-- e descricao_diverge levam ao mesmo destino (remove), então o significado
-- antigo continua válido pra eles.
-- ------------------------------------------------------------
update public.classificacoes_ia
set descricao_defeito = false
where descricao_defeito = true
  and category = 'iphone';
