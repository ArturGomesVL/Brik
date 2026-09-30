import { useState } from 'react'
import { formatBRL, formatInt } from '../../lib/format.js'
import { COLOR, ROI_RAMP } from './palette.js'
import { useReveal } from './reveal.js'
import { Card, Eyebrow, Masked } from './ui.jsx'

// A fatia selecionada fica azul royal; as demais seguem a rampa de petróleo (mais escuro = melhor ROI).
const RAMP = ROI_RAMP
const SELECTED = COLOR.accent

const SIZE = 148
const RADIUS = 58
const STROKE = 17
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP = 2.5 // espaço de 2px na cor da superfície entre fatias

function MelhoresRois({ step, data }) {
  const [selected, setSelected] = useState(0)
  const [hovered, setHovered] = useState(null)
  const reveal = useReveal(step)

  if (data.length === 0) {
    return (
      <Card {...reveal(0, 'p-5')}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">Melhores ROIs</h2>
          <Eyebrow>por modelo</Eyebrow>
        </div>
        <p {...reveal(1, 'py-10 text-center text-sm text-mute')}>
          Os modelos com melhor retorno aparecem aqui.
        </p>
      </Card>
    )
  }

  const total = data.reduce((sum, item) => sum + item.roi, 0)
  const current = data[Math.min(selected, data.length - 1)]
  const colorOf = (i) => (i === selected ? SELECTED : RAMP[Math.min(i, RAMP.length - 1)])

  const arcs = data.map((item, i) => {
    const before = data.slice(0, i).reduce((sum, d) => sum + d.roi, 0)
    const length = (item.roi / total) * CIRCUMFERENCE
    return { i, length: Math.max(length - GAP, 0), offset: (before / total) * CIRCUMFERENCE }
  })

  const donut = reveal(1)

  return (
    <Card {...reveal(0, 'p-5')}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Melhores ROIs</h2>
        <Eyebrow>por modelo</Eyebrow>
      </div>

      <div
        className={`relative mx-auto mt-4 ${donut.className}`}
        style={{ width: SIZE, height: SIZE, ...donut.style }}
      >
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full -rotate-90" aria-hidden="true">
          {arcs.map(({ i, length, offset: start }) => (
            <circle
              key={data[i].nome}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={colorOf(i)}
              strokeWidth={hovered === i ? STROKE + 3 : STROKE}
              strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
              strokeDashoffset={-start}
              className="cursor-pointer transition-[stroke-width] duration-150"
              onClick={() => setSelected(i)}
              onPointerEnter={() => setHovered(i)}
              onPointerLeave={() => setHovered(null)}
            />
          ))}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[32px] font-bold leading-none tracking-tight">{formatInt(current.roi)}%</span>
          <span className="mt-1 max-w-[88px] truncate text-xs font-medium">{current.modelo ?? current.nome}</span>
          <span className="mt-1 font-mono text-[9px] text-mute">
            {formatInt(current.un)} un · <Masked>{formatBRL(current.lucro)}</Masked>
          </span>
        </div>
      </div>

      <p {...reveal(1, 'mt-4 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-mute')}>
        Toque em uma fatia
      </p>

      <ul {...reveal(2, 'mt-3 flex flex-col gap-1')}>
        {data.map((item, i) => {
          const active = i === selected
          return (
            <li key={item.nome}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => setSelected(i)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  active ? 'bg-surface-raise' : 'hover:bg-surface-raise/60'
                }`}
              >
                <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: colorOf(i) }} />
                <span className="flex-1 truncate font-semibold">{item.nome}</span>
                <span className="font-mono text-xs text-mute">{formatInt(item.un)} un</span>
                <span className="w-10 text-right font-bold">{formatInt(item.roi)}%</span>
              </button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

export default MelhoresRois
