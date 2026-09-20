import { formatBRL, formatInt, formatPercent, formatPoints } from '../../lib/format.js'
import { useReveal } from './reveal.js'
import { Card, Delta, Eyebrow, Masked } from './ui.jsx'

function Tile({ label, children, delta, reveal }) {
  return (
    <Card as="div" {...reveal}>
      <p className="text-xs text-mute">{label}</p>
      <p className="mt-2 text-[22px] font-bold leading-none tracking-tight">{children}</p>
      <p className="mt-2 min-h-4 text-[11px]">{delta}</p>
    </Card>
  )
}

function MetricasMes({ step, data }) {
  const reveal = useReveal(step)

  return (
    <section aria-labelledby="mes-titulo">
      <Eyebrow as="h2" id="mes-titulo" {...reveal(0, 'mb-3 px-1')}>
        Este mês · {data.nome}
      </Eyebrow>

      <div className="grid grid-cols-2 gap-3">
        <Tile
          label="Lucro do mês"
          delta={data.lucroVar != null && <Delta value={data.lucroVar} />}
          reveal={reveal(1, 'p-3.5')}
        >
          <Masked>{formatBRL(data.lucro)}</Masked>
        </Tile>

        <Tile
          label="Vendidos no mês"
          delta={data.vendidosVar != null && <Delta value={data.vendidosVar} format={formatInt} note="vs. ago" />}
          reveal={reveal(2, 'p-3.5')}
        >
          {formatInt(data.vendidos)}
          <span className="ml-1 text-sm font-medium text-mute">un</span>
        </Tile>

        <Tile
          label="Ticket médio"
          delta={data.ticketVar != null && <Delta value={data.ticketVar} />}
          reveal={reveal(3, 'p-3.5')}
        >
          <Masked>{formatBRL(data.ticket)}</Masked>
        </Tile>

        <Tile
          label="Margem média"
          delta={data.margemVar != null && <Delta value={data.margemVar} format={formatPoints} />}
          reveal={reveal(4, 'p-3.5')}
        >
          {formatPercent(data.margem)}
        </Tile>
      </div>
    </section>
  )
}

export default MetricasMes
