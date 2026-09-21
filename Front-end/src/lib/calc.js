// Lógica da calculadora de revenda, sem React: dá para testar e raciocinar sobre
// ela sozinha. Cada campo guarda os dígitos digitados como string ("1450"), em
// reais inteiros — o teclado tem 00 e 000 justamente para não precisar de vírgula.

export const FIELDS = [
  { key: 'compra', label: 'Preço de compra' },
  { key: 'reparos', label: 'Reparos e peças' },
  { key: 'transporte', label: 'Transporte' },
  { key: 'outros', label: 'Outros custos' },
  { key: 'venda', label: 'Preço de venda' },
]

export const EMPTY = Object.fromEntries(FIELDS.map(({ key }) => [key, '']))

const MAX_DIGITS = 9

// Aplica uma tecla ao valor de um campo. key: '0'…'9', '00', '000', 'backspace', 'clear'.
export function press(value, key) {
  if (key === 'backspace') return value.slice(0, -1)
  if (key === 'clear') return ''
  const next = (value + key).replace(/^0+/, '')
  return next.length > MAX_DIGITS ? value : next
}

export function resultado(values) {
  const n = (key) => Number(values[key] || 0)
  const custo = n('compra') + n('reparos') + n('transporte') + n('outros')
  const venda = n('venda')
  const lucro = venda - custo

  return {
    custo,
    venda,
    lucro,
    // Margem sobre a venda. Sem preço de venda não há margem a mostrar.
    margem: venda > 0 ? (lucro / venda) * 100 : null,
    // Quanto da barra de equilíbrio o custo ocupa (0–100). Acima da venda, enche.
    custoPct: venda > 0 ? Math.min(custo / venda, 1) * 100 : custo > 0 ? 100 : 0,
  }
}
