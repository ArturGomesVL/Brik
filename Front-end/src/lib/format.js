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
