const number = (options) => new Intl.NumberFormat('pt-BR', options)

const integer = number({ maximumFractionDigits: 0 })
const oneDecimal = number({ minimumFractionDigits: 1, maximumFractionDigits: 1 })
const currency = number({ style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

export const formatInt = (value) => integer.format(value)
export const formatDecimal = (value) => oneDecimal.format(value)
export const formatBRL = (value) => currency.format(value)
export const formatPercent = (value) => `${oneDecimal.format(value)}%`
export const formatPoints = (value) => `${oneDecimal.format(value)} p.p.`
// 5600 -> "5,6k"
export const formatCompact = (value) => `${oneDecimal.format(value / 1000)}k`

// (12) 34567-8910 enquanto o usuário digita.
export function mascaraTelefone(valor) {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  const meio = d.length === 11 ? 7 : 6
  return `(${d.slice(0, 2)}) ${d.slice(2, meio)}-${d.slice(meio)}`
}

// "1.234,56" (saída de mascaraReais) -> 1234.56
export const reaisParaNumero = (texto) => Number(texto.replace(/\D/g, '')) / 100

// 1.234,56 enquanto o usuário digita: os dígitos entram pelos centavos.
const reais = number({ minimumFractionDigits: 2, maximumFractionDigits: 2 })
export function mascaraReais(valor) {
  const d = valor.replace(/\D/g, '').replace(/^0+/, '').slice(0, 11)
  return d ? reais.format(Number(d) / 100) : ''
}
