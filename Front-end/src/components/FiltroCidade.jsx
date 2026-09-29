import { useEffect, useRef, useState } from 'react'
import { ChevronDownIcon, PinIcon } from './icons.jsx'
import { GRUPOS, TODAS } from '../config/cidades.js'
import { classeBotaoPainel, classePosicaoPainel, useFecharPainel } from '../lib/usePainel.js'

// Seletor de cidade do header verde do Início: uma pílula de vidro sobre o
// petróleo que abre um painel com um mini-mapa e a lista de cidades. O mapa é
// decorativo — as ruas se desenham ao abrir, o pino cai sobre a escolha e, a
// cada cidade, o mapa desliza para outro ponto (tirado do nome, sempre o
// mesmo); "Todas" afasta a vista. Com mouse, o mapa inclina seguindo o cursor.
// Tudo anima só transform e opacity (ver "Filtros do Início" no index.css).
// `cidades` vem pronta de Home: [{ nome, total }], da que tem mais ofertas para
// a que tem menos. `lateral`: a versão da coluna lateral do desktop.

// Ruas do mapa, em % da camada: [x1, y1, x2, y2, espessura, opacidade].
const RUAS = [
  [0, 35, 100, 35, 4, 0.3],
  [0, 65, 100, 65, 4, 0.3],
  [30, 0, 30, 100, 3, 0.25],
  [70, 0, 70, 100, 3, 0.25],
  [0, 20, 100, 20, 1.5, 0.14],
  [0, 50, 100, 50, 1.5, 0.14],
  [0, 80, 100, 80, 1.5, 0.14],
  [15, 0, 15, 100, 1.5, 0.14],
  [45, 0, 45, 100, 1.5, 0.14],
  [55, 0, 55, 100, 1.5, 0.14],
  [85, 0, 85, 100, 1.5, 0.14],
]

// Quarteirões, em % da camada: [top, left, altura, largura].
const QUADRAS = [
  [40, 10, 20, 15],
  [15, 35, 15, 12],
  [70, 75, 18, 18],
  [20, 78, 25, 10],
  [55, 4, 12, 8],
  [6, 58, 10, 9],
  [72, 36, 14, 16],
  [40, 56, 12, 10],
]

// Para onde o mapa desliza em cada escolha: um ponto fixo por nome, dentro de
// ±12% para a borda da camada (que sobra 25% de cada lado) nunca aparecer.
function vista(valor) {
  if (valor === TODAS) return 'translate(0%, 0%) scale(0.9)'
  let h = 7
  for (const letra of valor) h = (h * 31 + letra.charCodeAt(0)) | 0
  const x = ((h & 0xff) / 255 - 0.5) * 24
  const y = (((h >> 8) & 0xff) / 255 - 0.5) * 24
  return `translate(${x.toFixed(1)}%, ${y.toFixed(1)}%) scale(1.12)`
}

const plural = (n) => `${n} ${n === 1 ? 'oferta' : 'ofertas'}`

function FiltroCidade({ value, onChange, cidades, total, lateral = false }) {
  const [aberto, setAberto] = useState(false)
  const raizRef = useRef(null)
  const botaoRef = useRef(null)
  const listaRef = useRef(null)
  const mapaRef = useRef(null)

  const contagem = Object.fromEntries(cidades.map(({ nome, total: n }) => [nome, n]))
  // Uma cidade escolhida antes pode estar sem ofertas agora: continua na lista
  // (com 0), senão a escolha sumiria da tela.
  const soltas =
    value !== TODAS && !GRUPOS.some((g) => g.value === value) && !(value in contagem)
      ? [...cidades, { nome: value, total: 0 }]
      : cidades

  const opcoes = [
    { value: TODAS, nome: 'Todas as cidades', total },
    ...GRUPOS.map(({ value: grupo, label, cidades: doGrupo }) => ({
      value: grupo,
      nome: label,
      detalhe: doGrupo.join(' e '),
      total: doGrupo.reduce((soma, nome) => soma + (contagem[nome] ?? 0), 0),
    })),
    ...soltas.map(({ nome, total: n }) => ({ value: nome, nome, total: n })),
  ]
  const atual = opcoes.find((opcao) => opcao.value === value) ?? opcoes[0]

  // Aberto: fecha com clique fora e com Esc, e o foco vai para a opção escolhida.
  useFecharPainel(aberto, setAberto, raizRef, botaoRef)
  useEffect(() => {
    if (aberto) listaRef.current?.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true })
  }, [aberto])

  function escolher(valor) {
    onChange(valor)
    setAberto(false)
    botaoRef.current?.focus()
  }

  // Setas para cima/baixo andam pela lista.
  function navegar(event) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const botoes = [...listaRef.current.querySelectorAll('button')]
    const i = botoes.indexOf(document.activeElement)
    const proximo = event.key === 'ArrowDown' ? Math.min(i + 1, botoes.length - 1) : Math.max(i - 1, 0)
    botoes[proximo]?.focus()
  }

  // Inclinação do mapa: escreve direto no estilo, sem re-render a cada movimento.
  function inclinar(event) {
    if (event.pointerType !== 'mouse' || !mapaRef.current) return
    const r = mapaRef.current.getBoundingClientRect()
    const x = (event.clientX - r.left) / r.width - 0.5
    const y = (event.clientY - r.top) / r.height - 0.5
    mapaRef.current.style.setProperty('--rx', `${(-y * 10).toFixed(2)}deg`)
    mapaRef.current.style.setProperty('--ry', `${(x * 10).toFixed(2)}deg`)
  }

  function endireitar() {
    mapaRef.current?.style.setProperty('--rx', '0deg')
    mapaRef.current?.style.setProperty('--ry', '0deg')
  }

  return (
    <div ref={raizRef} className={`relative ${lateral ? 'w-full' : 'w-fit'}`}>
      <button
        ref={botaoRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={aberto}
        onClick={() => setAberto((a) => !a)}
        className={classeBotaoPainel(lateral, aberto)}
      >
        <span className="sr-only">Cidade:</span>
        <PinIcon aria-hidden="true" className={`h-4 w-4 shrink-0 ${lateral ? 'text-brik' : 'text-mint'}`} />
        <span className={`truncate ${lateral ? 'flex-1 text-left' : 'max-w-[8.5rem] sm:max-w-[14rem]'}`}>{atual.nome}</span>
        <span
          className={`rounded-full px-1.5 text-[11px] font-bold tabular-nums ${
            lateral ? 'bg-surface-raise text-mute' : 'bg-white/15'
          }`}
        >
          {atual.total}
        </span>
        <ChevronDownIcon
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 transition-transform duration-300 ${aberto ? 'rotate-180' : ''}`}
        />
      </button>

      {aberto && (
        <div
          className={`painel-pop ${classePosicaoPainel(lateral)} overflow-hidden rounded-2xl bg-surface-card text-ink ring-1 ring-line`}
        >
          {/* Mini-mapa. A perspectiva fica no pai para a inclinação ter fundo. */}
          <div className="p-2 [perspective:900px]" onPointerMove={inclinar} onPointerLeave={endireitar}>
            <div
              ref={mapaRef}
              aria-hidden="true"
              className="cidade-mapa relative h-36 overflow-hidden rounded-xl bg-brik/[0.07] text-brik"
            >
              <div className="cidade-camada absolute -inset-1/4" style={{ transform: vista(value) }}>
                <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                  {RUAS.map(([x1, y1, x2, y2, largura, opacidade], i) => (
                    <line
                      key={i}
                      x1={`${x1}%`}
                      y1={`${y1}%`}
                      x2={`${x2}%`}
                      y2={`${y2}%`}
                      pathLength={1}
                      stroke="currentColor"
                      strokeWidth={largura}
                      strokeOpacity={opacidade}
                      className="cidade-rua"
                      style={{ '--i': i }}
                    />
                  ))}
                </svg>
                {QUADRAS.map(([top, left, altura, largura], i) => (
                  <span
                    key={i}
                    className="cidade-quadra absolute rounded-sm bg-brik/15 ring-1 ring-brik/10"
                    style={{ top: `${top}%`, left: `${left}%`, height: `${altura}%`, width: `${largura}%`, '--i': i }}
                  />
                ))}
              </div>

              {/* Base clara para o nome se ler sobre o mapa. */}
              <div className="absolute inset-0 bg-gradient-to-t from-surface-card via-surface-card/30 to-transparent" />

              {/* Pino no centro; a key refaz a queda a cada escolha. */}
              <div key={value} className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-full">
                <span className="cidade-pulso absolute bottom-0 left-1/2 h-3 w-6 -translate-x-1/2 translate-y-1/2 rounded-[50%] bg-brik/40" />
                <svg viewBox="0 0 24 24" className="cidade-pino relative h-8 w-8 drop-shadow-[0_4px_6px_rgba(15,76,92,0.45)]">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="currentColor" />
                  <circle cx="12" cy="9" r="2.6" className="fill-mint" />
                </svg>
              </div>

              <span className="absolute right-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-surface-card/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-mute">
                <span className="cidade-vivo h-1.5 w-1.5 rounded-full bg-profit" />
                Ao vivo
              </span>

              <div className="absolute inset-x-3 bottom-2.5">
                <p className="truncate text-sm font-bold text-ink">{atual.nome}</p>
                <p className="text-[11px] text-mute">
                  {atual.detalhe ? `${atual.detalhe} · ` : ''}
                  {plural(atual.total)}
                </p>
                <span key={value} className="cidade-sublinhado mt-1 block h-px bg-gradient-to-r from-brik/60 via-brik/30 to-transparent" />
              </div>
            </div>
          </div>

          <ul
            ref={listaRef}
            aria-label="Escolher cidade"
            onKeyDown={navegar}
            className="max-h-64 overflow-y-auto overscroll-contain px-2 pb-2"
          >
            {opcoes.map((opcao, i) => {
              const escolhida = opcao.value === value
              return (
                <li key={opcao.value} className="painel-item" style={{ '--i': Math.min(i, 10) }}>
                  <button
                    type="button"
                    aria-pressed={escolhida}
                    onClick={() => escolher(opcao.value)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brik/40 ${
                      escolhida ? 'bg-brik/10 font-bold text-brik' : 'text-ink hover:bg-surface-raise'
                    }`}
                  >
                    <PinIcon
                      aria-hidden="true"
                      className={`h-4 w-4 shrink-0 ${escolhida ? 'text-brik' : 'text-mute/60'}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{opcao.nome}</span>
                      {opcao.detalhe && (
                        <span className="block truncate text-[11px] font-normal text-mute">{opcao.detalhe}</span>
                      )}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                        escolhida ? 'bg-brik text-paper' : 'bg-surface-raise text-mute'
                      }`}
                    >
                      {opcao.total}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

export default FiltroCidade
