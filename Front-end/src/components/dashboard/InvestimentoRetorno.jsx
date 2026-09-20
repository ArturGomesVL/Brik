import { formatBRL, formatPercent } from '../../lib/format.js'
import { COLOR } from './palette.js'
import { useReveal } from './reveal.js'
import { Card, Eyebrow, Masked } from './ui.jsx'

// O anel enche por completo em ROI = ROI_ESCALA (%).
const ROI_ESCALA = 100
const RADIUS = 38
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function RoiRing({ roi }) {
  const filled = Math.min(Math.max(roi / ROI_ESCALA, 0), 1) * CIRCUMFERENCE

  return (
    <div className="relative h-[92px] w-[92px] shrink-0">
      <svg viewBox="0 0 92 92" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="46" cy="46" r={RADIUS} fill="none" stroke={COLOR.line} strokeWidth="9" />
        {filled > 0 && (
          <circle
            cx="46"
            cy="46"
            r={RADIUS}
            fill="none"
            stroke={COLOR.profit}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[17px] font-bold leading-none tracking-tight">{formatPercent(roi)}</span>
        <span className="mt-1 font-mono text-[8px] tracking-[0.18em] text-mute">ROI</span>
      </div>
    </div>
  )
}

function BarRow({ label, value, max, color, reveal }) {
  const width = max > 0 ? (value / max) * 100 : 0

  return (
    <div {...reveal}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-mute">{label}</span>
        <span className="text-[15px] font-bold tracking-tight">
          <Masked>{formatBRL(value)}</Masked>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-raise">
        <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function InvestimentoRetorno({ step, data }) {
  const reveal = useReveal(step)
  const max = Math.max(data.investido, data.retornado)

  return (
    <Card {...reveal(0, 'p-5')}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Investimento x Retorno</h2>
        <Eyebrow>12 meses</Eyebrow>
      </div>

      <div className="mt-4 flex items-center gap-5">
        <div {...reveal(1)}>
          <RoiRing roi={data.roi} />
        </div>
        <div className="flex flex-1 flex-col gap-4">
          <BarRow label="Investido" value={data.investido} max={max} color={COLOR.mute} reveal={reveal(2)} />
          <BarRow label="Retornado" value={data.retornado} max={max} color={COLOR.profit} reveal={reveal(3)} />
        </div>
      </div>
    </Card>
  )
}

export default InvestimentoRetorno
