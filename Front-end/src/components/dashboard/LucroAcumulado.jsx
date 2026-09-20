import { useState } from 'react'
import { EyeIcon, EyeOffIcon } from '../icons.jsx'
import { formatBRL, formatInt } from '../../lib/format.js'
import LineChart from './LineChart.jsx'
import { useReveal } from './reveal.js'
import { Card, Delta, Eyebrow, Masked, Segmented } from './ui.jsx'

const RANGES = [
  { value: '30D', label: '30D', compare: '30 dias anteriores' },
  { value: '90D', label: '90D', compare: '90 dias anteriores' },
  { value: '12M', label: '12M', compare: '12 meses anteriores' },
]

const SERIES_STYLE = {
  lucro: { key: 'lucro', label: 'Lucro', color: '#ffffff' },
  investimento: { key: 'investimento', label: 'Investimento', color: '#4f7df0', dashed: true },
}

function LucroAcumulado({ step, data, hidden, onToggleHidden }) {
  const [range, setRange] = useState('30D')
  const reveal = useReveal(step)
  const period = data.periodos[range]
  const compare = RANGES.find((r) => r.value === range).compare

  return (
    <Card {...reveal(0, 'p-5')}>
      <div className="flex items-start justify-between">
        <div>
          <Eyebrow {...reveal(1)}>Lucro acumulado</Eyebrow>
          <p {...reveal(2, 'mt-3 flex items-baseline gap-1.5')}>
            <span className="text-lg font-medium text-night-mute">R$</span>
            <span className="text-[44px] font-bold leading-none tracking-tight">
              <Masked>{formatInt(period.total)}</Masked>
            </span>
          </p>
        </div>

        <button
          type="button"
          aria-pressed={hidden}
          aria-label={hidden ? 'Mostrar valores' : 'Ocultar valores'}
          onClick={onToggleHidden}
          {...reveal(
            1,
            'flex h-10 w-10 items-center justify-center rounded-xl border border-night-line bg-night-raise text-night-mute transition-colors hover:text-white',
          )}
        >
          {hidden ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
        </button>
      </div>

      <p {...reveal(3, 'mt-3 flex items-center gap-2 text-xs text-night-mute')}>
        {period.variacao != null && (
          <span className="rounded-md bg-up/15 px-2 py-1 text-xs">
            <Delta value={period.variacao} />
          </span>
        )}
        vs. {compare}
      </p>

      <Segmented
        label="Período"
        options={RANGES}
        value={range}
        onChange={setRange}
        {...reveal(4, 'mt-4')}
      />

      <div {...reveal(5, 'mt-4')}>
        <LineChart
          labels={period.labels}
          series={[
            { ...SERIES_STYLE.lucro, values: period.lucro },
            { ...SERIES_STYLE.investimento, values: period.investimento },
          ]}
          formatValue={formatBRL}
          ariaLabel={`Lucro e investimento, ${compare.replace(' anteriores', '')}`}
        />
      </div>
    </Card>
  )
}

export default LucroAcumulado
