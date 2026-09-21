import { useEffect, useReducer } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftIcon } from '../components/icons.jsx'
import { INITIAL, reducer, toDisplay } from '../lib/calc.js'

// tone: como a tecla se pinta. num = branca com borda, op = azul, "=" = preta.
const KEYS = [
  { label: 'AC', tone: 'clear', aria: 'Limpar tudo', action: { type: 'clear' } },
  { label: '⌫', tone: 'aux', aria: 'Apagar último dígito', action: { type: 'backspace' } },
  { label: '%', tone: 'aux', aria: 'Porcentagem', action: { type: 'percent' } },
  { label: '÷', tone: 'op', aria: 'Dividir', action: { type: 'operator', op: '/' } },

  { label: '7', tone: 'num', action: { type: 'digit', value: '7' } },
  { label: '8', tone: 'num', action: { type: 'digit', value: '8' } },
  { label: '9', tone: 'num', action: { type: 'digit', value: '9' } },
  { label: '×', tone: 'op', aria: 'Multiplicar', action: { type: 'operator', op: '*' } },

  { label: '4', tone: 'num', action: { type: 'digit', value: '4' } },
  { label: '5', tone: 'num', action: { type: 'digit', value: '5' } },
  { label: '6', tone: 'num', action: { type: 'digit', value: '6' } },
  { label: '−', tone: 'op', aria: 'Subtrair', action: { type: 'operator', op: '-' } },

  { label: '1', tone: 'num', action: { type: 'digit', value: '1' } },
  { label: '2', tone: 'num', action: { type: 'digit', value: '2' } },
  { label: '3', tone: 'num', action: { type: 'digit', value: '3' } },
  { label: '+', tone: 'op', aria: 'Somar', action: { type: 'operator', op: '+' } },

  { label: '±', tone: 'aux', aria: 'Trocar o sinal', action: { type: 'negate' } },
  { label: '0', tone: 'num', action: { type: 'digit', value: '0' } },
  { label: ',', tone: 'num', aria: 'Vírgula decimal', action: { type: 'decimal' } },
  { label: '=', tone: 'equals', aria: 'Calcular', action: { type: 'equals' } },
]

const TONE = {
  num: 'border border-line bg-surface-card text-strong shadow-card hover:bg-surface-raise',
  aux: 'bg-surface-raise text-strong hover:bg-line',
  clear: 'bg-surface-raise text-loss hover:bg-line',
  op: 'bg-surface-raise text-profit hover:bg-line',
  equals: 'bg-strong text-surface hover:opacity-90',
}

// Teclado físico: no desktop a calculadora responde sem precisar do mouse.
const FROM_KEY = {
  '+': { type: 'operator', op: '+' },
  '-': { type: 'operator', op: '-' },
  '*': { type: 'operator', op: '*' },
  '/': { type: 'operator', op: '/' },
  '%': { type: 'percent' },
  '=': { type: 'equals' },
  Enter: { type: 'equals' },
  Backspace: { type: 'backspace' },
  Escape: { type: 'clear' },
  ',': { type: 'decimal' },
  '.': { type: 'decimal' },
}

const OP_LABEL = { '+': '+', '-': '−', '*': '×', '/': '÷' }

function Calculadora() {
  const [state, dispatch] = useReducer(reducer, INITIAL)

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const action = /^[0-9]$/.test(event.key)
        ? { type: 'digit', value: event.key }
        : FROM_KEY[event.key]
      if (!action) return
      event.preventDefault()
      dispatch(action)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-surface pb-36 text-strong shadow-xl">
      <header className="sticky top-0 z-40 flex items-center gap-2 bg-surface px-4 py-3">
        <Link
          to="/dashboard"
          viewTransition
          aria-label="Voltar para o dashboard"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface-card text-strong shadow-card transition-colors hover:bg-surface-raise"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <h1 className="text-base font-bold">Calculadora</h1>
      </header>

      <div className="flex flex-col px-4 pt-4">
        {/* Visor. A conta em aberto fica acima, pequena, para não se perder o fio
            depois de apertar um operador. */}
        <div className="flex min-h-28 flex-col justify-end rounded-3xl border border-line bg-surface-card px-5 py-4 text-right shadow-card">
          <p className="h-5 font-mono text-xs text-mute" aria-hidden="true">
            {state.pending
              ? `${toDisplay(String(state.pending.value))} ${OP_LABEL[state.pending.op]}`
              : ''}
          </p>
          <output
            aria-live="polite"
            className="mt-1 block overflow-x-auto text-[44px] font-bold leading-none tracking-tight tabular-nums"
          >
            {toDisplay(state.raw)}
          </output>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-3">
          {KEYS.map((key) => {
            const active =
              key.action.type === 'operator' && state.fresh && state.pending?.op === key.action.op

            return (
              <button
                key={key.label}
                type="button"
                aria-label={key.aria}
                aria-pressed={key.action.type === 'operator' ? active : undefined}
                onClick={() => dispatch(key.action)}
                className={`flex aspect-square items-center justify-center rounded-2xl text-2xl font-semibold transition-colors ${
                  active ? 'bg-profit text-surface' : TONE[key.tone]
                }`}
              >
                {key.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Calculadora
