// Lógica da calculadora, sem React: dá para testar e raciocinar sobre ela sozinha.
//
// O número digitado vive como string com ponto ("12.5"), para a digitação não ter
// que lidar com separador; a vírgula aparece só em toDisplay. `pending` guarda o
// operando da esquerda e a operação em aberto, e `fresh` diz se o próximo dígito
// começa um número novo (depois de "=", de um operador ou de um resultado).

export const ERROR = 'Erro'

const MAX_DIGITS = 12

const digitsOf = (raw) => raw.replace(/[-.]/g, '').length

// Corta o ruído de ponto flutuante (0,1 + 0,2) sem inventar precisão.
const fromNumber = (n) => (Number.isFinite(n) ? String(Number(n.toPrecision(12))) : ERROR)

const apply = (a, op, b) => {
  switch (op) {
    case '+':
      return a + b
    case '-':
      return a - b
    case '*':
      return a * b
    case '/':
      return b === 0 ? NaN : a / b
    default:
      return b
  }
}

// "1234.5" -> "1.234,5". Mantém a vírgula solta enquanto o usuário digita.
export function toDisplay(raw) {
  if (raw === ERROR || raw.includes('e')) return raw
  const negative = raw.startsWith('-')
  const [int, dec] = (negative ? raw.slice(1) : raw).split('.')
  const grouped = new Intl.NumberFormat('pt-BR').format(BigInt(int === '' ? '0' : int))
  const shown = dec === undefined ? grouped : `${grouped},${dec}`
  return negative ? `-${shown}` : shown
}

export const INITIAL = { raw: '0', pending: null, fresh: true }

export function reducer(state, action) {
  const { raw, pending, fresh } = state

  switch (action.type) {
    case 'digit': {
      if (raw === ERROR || fresh) return { ...state, raw: action.value, fresh: false }
      if (raw === '0') return { ...state, raw: action.value }
      if (raw === '-0') return { ...state, raw: `-${action.value}` }
      if (digitsOf(raw) >= MAX_DIGITS) return state
      return { ...state, raw: raw + action.value }
    }

    case 'decimal': {
      if (raw === ERROR || fresh) return { ...state, raw: '0.', fresh: false }
      if (raw.includes('.')) return state
      return { ...state, raw: `${raw}.` }
    }

    case 'operator': {
      if (raw === ERROR) return state
      // Só fecha a conta pendente se houver um segundo operando digitado; caso
      // contrário o usuário está apenas trocando de operação.
      if (pending && !fresh) {
        const next = fromNumber(apply(pending.value, pending.op, Number(raw)))
        if (next === ERROR) return { raw: ERROR, pending: null, fresh: true }
        return { raw: next, pending: { value: Number(next), op: action.op }, fresh: true }
      }
      return { ...state, pending: { value: Number(raw), op: action.op }, fresh: true }
    }

    case 'equals': {
      if (raw === ERROR || !pending) return state
      return {
        raw: fromNumber(apply(pending.value, pending.op, Number(raw))),
        pending: null,
        fresh: true,
      }
    }

    case 'backspace': {
      if (raw === ERROR) return INITIAL
      if (fresh) return state
      const next = raw.slice(0, -1)
      if (next === '' || next === '-') return { ...state, raw: '0', fresh: true }
      return { ...state, raw: next }
    }

    case 'percent': {
      if (raw === ERROR) return state
      return { ...state, raw: fromNumber(Number(raw) / 100), fresh: true }
    }

    case 'negate': {
      if (raw === ERROR || raw === '0') return state
      return { ...state, raw: raw.startsWith('-') ? raw.slice(1) : `-${raw}` }
    }

    case 'clear':
      return INITIAL

    default:
      return state
  }
}
