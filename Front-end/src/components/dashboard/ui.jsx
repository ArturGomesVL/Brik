import { formatPercent } from '../../lib/format.js'
import { useHidden } from './hidden.js'

// Mostra o conteúdo ou, com os valores ocultos, uma máscara (com aviso para leitores de tela).
export function Masked({ children }) {
  if (!useHidden()) return children
  return (
    <>
      <span aria-hidden="true">••••</span>
      <span className="sr-only">valor oculto</span>
    </>
  )
}

export function Card({ as: Tag = 'section', className = '', ...props }) {
  return (
    <Tag className={`rounded-3xl border border-line bg-surface-card shadow-card ${className}`} {...props} />
  )
}

// Rótulo pequeno em caixa alta, como "LUCRO ACUMULADO".
export function Eyebrow({ as: Tag = 'p', className = '', ...props }) {
  return (
    <Tag
      className={`font-mono text-[10px] uppercase tracking-[0.18em] text-mute ${className}`}
      {...props}
    />
  )
}

// Variação com seta e sinal (nunca só a cor): ▲ 18,2% / ▼ 3,1%.
// A cor sai do próprio valor: verde no lucro, vermelho no prejuízo, cinza no zero.
// No zero não há seta — não houve alta nem queda, e dizer o contrário enganaria
// tanto o olho quanto o leitor de tela.
export function Delta({ value, format = formatPercent, note, className = '' }) {
  const up = value > 0
  const down = value < 0
  const tone = up ? 'text-profit' : down ? 'text-loss' : 'text-mute'

  return (
    <span className={`inline-flex items-center gap-1 font-medium ${tone} ${className}`}>
      {(up || down) && (
        <>
          <span aria-hidden="true" className="text-[0.7em]">
            {up ? '▲' : '▼'}
          </span>
          <span className="sr-only">{up ? 'Alta de ' : 'Queda de '}</span>
        </>
      )}
      {format(Math.abs(value))}
      {note && <span> {note}</span>}
    </span>
  )
}

// Controle segmentado (30D / 90D / 12M, Estoque / Vendidos).
export function Segmented({ label, options, value, onChange, className = '', ...props }) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`inline-flex gap-1 rounded-xl bg-surface-raise p-1 ${className}`}
      {...props}
    >
      {options.map(({ value: optionValue, label: text }) => {
        const active = optionValue === value
        return (
          <button
            key={optionValue}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(optionValue)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
              active ? 'bg-surface text-strong shadow-card' : 'text-mute hover:text-strong'
            }`}
          >
            {text}
          </button>
        )
      })}
    </div>
  )
}
