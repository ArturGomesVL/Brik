import { useId, useRef, useState } from 'react'
import { formatCompact } from '../../lib/format.js'
import { useHidden } from './hidden.js'

const W = 340
const H = 150
const PAD = { l: 36, r: 12, t: 10, b: 24 }
const PLOT_W = W - PAD.l - PAD.r
const PLOT_H = H - PAD.t - PAD.b
const SURFACE = '#161617'
const GRID = '#29292c'
const MUTED = '#8d8d95'

// Marcas de eixo "redondas" (1k, 2k, 2,5k, 5k, 10k…) que cobrem o intervalo dos dados.
function niceTicks(min, max) {
  const raw = ((max - min) || max || 1) / 3
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw)
  const start = Math.floor(min / step) * step
  const ticks = [start]
  for (let i = 1; ticks[ticks.length - 1] < max; i++) ticks.push(Math.round((start + i * step) * 100) / 100)
  return ticks
}

// Gráfico de linhas (até ~4 séries) com área sob a primeira, marcador no fim,
// cursor + dica com todas as séries no ponto e tabela para leitores de tela.
function LineChart({ labels, series, formatValue, ariaLabel }) {
  const hidden = useHidden()
  const gradientId = `area-${useId().replace(/:/g, '')}`
  const svgRef = useRef(null)
  const [active, setActive] = useState(null)

  const n = labels.length
  const all = series.flatMap((s) => s.values)

  if (n === 0 || all.length === 0) {
    return (
      <div className="flex h-[150px] items-center justify-center text-sm text-night-mute">
        Sem dados neste período
      </div>
    )
  }

  const ticks = niceTicks(Math.min(...all), Math.max(...all))
  const lo = ticks[0]
  const hi = ticks[ticks.length - 1]
  const xAt = (i) => PAD.l + (n > 1 ? (i * PLOT_W) / (n - 1) : PLOT_W / 2)
  const yAt = (v) => PAD.t + PLOT_H - ((v - lo) / (hi - lo)) * PLOT_H
  const baseline = PAD.t + PLOT_H

  const points = (values) => values.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(' ')

  // Rótulos do eixo X: no máximo ~7, sempre incluindo o último.
  const every = Math.ceil(n / 7)
  const showLabel = (i) => i % every === 0 || i === n - 1

  function moveTo(clientX) {
    const rect = svgRef.current.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * W
    const i = Math.round(((x - PAD.l) / PLOT_W) * (n - 1))
    setActive(Math.min(Math.max(i, 0), n - 1))
  }

  function onKeyDown(event) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    setActive((current) => {
      const from = current ?? n - 1
      return Math.min(Math.max(from + (event.key === 'ArrowRight' ? 1 : -1), 0), n - 1)
    })
  }

  const primary = series[0]
  const tooltipLeft = active === null ? 0 : Math.min(Math.max((xAt(active) / W) * 100, 24), 76)

  return (
    <div>
      <div
        role="group"
        aria-roledescription="gráfico"
        aria-label={`${ariaLabel}. Use as setas para percorrer os pontos.`}
        tabIndex={0}
        className="relative touch-pan-y rounded-lg outline-offset-4"
        onPointerMove={(e) => moveTo(e.clientX)}
        onPointerDown={(e) => moveTo(e.clientX)}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive((current) => current ?? n - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={onKeyDown}
      >
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="block w-full" aria-hidden="true">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={primary.color} stopOpacity="0.14" />
              <stop offset="1" stopColor={primary.color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.l} x2={W - PAD.r} y1={yAt(tick)} y2={yAt(tick)} stroke={GRID} strokeWidth="1" />
              {!hidden && (
                <text
                  x={PAD.l - 8}
                  y={yAt(tick)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill={MUTED}
                  fontSize="9"
                  fontFamily="ui-monospace, monospace"
                >
                  {formatCompact(tick)}
                </text>
              )}
            </g>
          ))}

          {labels.map(
            (label, i) =>
              showLabel(i) && (
                <text
                  key={i}
                  x={xAt(i)}
                  y={H - 6}
                  textAnchor="middle"
                  fill={MUTED}
                  fontSize="9"
                  fontFamily="ui-monospace, monospace"
                >
                  {label}
                </text>
              ),
          )}

          {n > 1 && (
            <polygon
              points={`${xAt(0)},${baseline} ${points(primary.values)} ${xAt(n - 1)},${baseline}`}
              fill={`url(#${gradientId})`}
            />
          )}

          {[...series].reverse().map((s) => (
            <polyline
              key={s.key}
              points={points(s.values)}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={s.dashed ? '4 4' : undefined}
            />
          ))}

          {active === null ? (
            <circle
              cx={xAt(n - 1)}
              cy={yAt(primary.values[n - 1])}
              r="4"
              fill={primary.color}
              stroke={SURFACE}
              strokeWidth="2"
            />
          ) : (
            <>
              <line x1={xAt(active)} x2={xAt(active)} y1={PAD.t} y2={baseline} stroke={MUTED} strokeWidth="1" />
              {series.map((s) => (
                <circle
                  key={s.key}
                  cx={xAt(active)}
                  cy={yAt(s.values[active])}
                  r="4"
                  fill={s.color}
                  stroke={SURFACE}
                  strokeWidth="2"
                />
              ))}
            </>
          )}
        </svg>

        {active !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 min-w-32 -translate-x-1/2 rounded-xl border border-night-line bg-night-raise px-3 py-2 text-xs shadow-lg"
            style={{ left: `${tooltipLeft}%` }}
          >
            <p className="mb-1 font-mono text-[10px] text-night-mute">{labels[active]}</p>
            {series.map((s) => (
              <p key={s.key} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block h-0 w-3.5 shrink-0 border-t-2"
                  style={{ borderColor: s.color, borderStyle: s.dashed ? 'dotted' : 'solid' }}
                />
                <strong className="font-bold text-white">{hidden ? '••••' : formatValue(s.values[active])}</strong>
                <span className="text-night-mute">{s.label}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      <ul className="mt-3 flex gap-4 border-t border-night-line pt-3 text-xs text-night-mute">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <svg width="16" height="4" aria-hidden="true">
              <line
                x1="1"
                x2="15"
                y1="2"
                y2="2"
                stroke={s.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={s.dashed ? '2 3' : undefined}
              />
            </svg>
            {s.label}
          </li>
        ))}
      </ul>

      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Ponto</th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((label, i) => (
            <tr key={i}>
              <th scope="row">{label}</th>
              {series.map((s) => (
                <td key={s.key}>{hidden ? 'oculto' : formatValue(s.values[i])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default LineChart
