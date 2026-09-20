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
  return <Tag className={`rounded-3xl border border-night-line bg-night-card ${className}`} {...props} />
}

// Rótulo pequeno em caixa alta, como "LUCRO ACUMULADO".
export function Eyebrow({ as: Tag = 'p', className = '', ...props }) {
  return (
    <Tag
      className={`font-mono text-[10px] uppercase tracking-[0.18em] text-night-mute ${className}`}
      {...props}
    />
  )
}

// Variação com seta e sinal (nunca só a cor): ▲ 18,2% / ▼ 3,1%.
export function Delta({ value, format = formatPercent, note, className = '' }) {
  const up = value >= 0
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${up ? 'text-up' : 'text-down'} ${className}`}>
      <span aria-hidden="true" className="text-[0.7em]">
        {up ? '▲' : '▼'}
      </span>
      <span className="sr-only">{up ? 'Alta de ' : 'Queda de '}</span>
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
      className={`inline-flex gap-1 rounded-xl bg-night-raise p-1 ${className}`}
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
              active ? 'bg-white text-night' : 'text-night-mute hover:text-white'
            }`}
          >
            {text}
          </button>
        )
      })}
    </div>
  )
}
