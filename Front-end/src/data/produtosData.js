// Situações de um produto do estoque (public.estoque.status), na ordem das abas
// de "Meus Produtos". O check da coluna usa as mesmas chaves.
export const STATUS = [
  { key: 'nao_anunciado', label: 'Não anunciado' },
  { key: 'anunciado', label: 'Anunciado' },
  { key: 'conserto', label: 'Conserto' },
  { key: 'vendido', label: 'Vendidos' },
]

// Produto salvo sem situação: a pessoa tem o estoque mas ainda não anunciou.
export const STATUS_PADRAO = 'nao_anunciado'

// O que dá para escolher no seletor do card e no formulário. "Vendido" não
// entra: marca-se pelo ⋮ do card.
export const STATUS_SELETOR = STATUS.filter(({ key }) => key !== 'vendido')
