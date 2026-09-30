import { formatBRL, formatDecimal, formatInt } from '../../lib/format.js'
import { useReveal } from './reveal.js'
import { Card, Eyebrow, Masked } from './ui.jsx'

export function CapitalParado({ step, data }) {
  const reveal = useReveal(step)
  const pct = Math.min(Math.max(data.pct, 0), 100)

  return (
    <Card {...reveal(0, 'p-4')}>
      <Eyebrow>Capital parado</Eyebrow>
      <p className="mt-2.5 text-[26px] font-bold leading-none tracking-tight">
        <Masked>{formatBRL(data.valor)}</Masked>
      </p>

      <div
        role="progressbar"
        aria-label="Parcela do capital parada em estoque"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-surface-raise"
      >
        <div className="h-full rounded-full bg-strong" style={{ width: `${pct}%` }} />
      </div>

      <p className="mt-2.5 text-[11px] text-mute">
        {formatInt(data.pct)}% do capital · {formatInt(data.itens)} {data.itens === 1 ? 'item' : 'itens'}
      </p>
    </Card>
  )
}

export function GiroMedio({ step, data }) {
  const reveal = useReveal(step)
  const max = Math.max(...data.barras, 1)
  const faster = data.deltaDias < 0
  const delta = Math.abs(data.deltaDias)

  return (
    <Card {...reveal(0, 'p-4')}>
      <Eyebrow>Giro médio</Eyebrow>
      <p className="mt-2.5 flex items-baseline gap-1.5 leading-none">
        <span className="text-[26px] font-bold tracking-tight">{formatDecimal(data.dias)}</span>
        <span className="text-sm text-mute">dias</span>
      </p>

      <div className="mt-3.5 flex h-7 items-end gap-1" aria-hidden="true">
        {data.barras.map((value, i) => (
          <span
            key={i}
            className={`flex-1 rounded-t-[3px] ${i === data.destaque ? 'bg-strong' : 'bg-line'}`}
            style={{ height: `${Math.max((value / max) * 100, 14)}%` }}
          />
        ))}
      </div>

      {delta > 0 && (
        <p className={`mt-2.5 text-[11px] font-medium ${faster ? 'text-profit' : 'text-loss'}`}>
          {formatDecimal(delta)} {delta < 2 ? 'dia' : 'dias'} mais {faster ? 'rápido' : 'lento'}
        </p>
      )}
    </Card>
  )
}
