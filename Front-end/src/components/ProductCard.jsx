import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore.js'
import { useSalvosStore } from '../stores/useSalvosStore.js'
import { GamepadIcon, PhoneIcon, PinIcon, StarIcon, WarningIcon } from './icons.jsx'

// Card de oferta do feed (e dos Salvos). Na foto, o quanto está abaixo da média
// e a estrela; embaixo, título, selo, local, média, valor e o lucro com o ícone
// de gráfico — que, com o mouse em cima, se desenha subindo (.card-oferta no
// index.css). O card todo abre o anúncio na OLX.

const LEVELS = {
  boa: { label: 'Bom negócio', className: 'bg-level-boa text-level-boa-ink' },
  otima: { label: 'Ótimo negócio', className: 'bg-level-otima text-white' },
  extraordinaria: { label: 'Extraordinário', className: 'bg-level-extra text-white' },
}

const CATEGORY_ICONS = { iphone: PhoneIcon, videogame_console: GamepadIcon }

const brl = (value) =>
  Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

// Três barras subindo e a seta por cima. As peças têm as classes que o hover
// anima; --i dá a ordem das barras.
function GraficoLucro({ className = '' }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <rect className="grafico-barra" style={{ '--i': 0 }} x="4" y="21" width="6" height="8" rx="1" fill="currentColor" opacity="0.55" />
      <rect className="grafico-barra" style={{ '--i': 1 }} x="13" y="16" width="6" height="13" rx="1" fill="currentColor" opacity="0.75" />
      <rect className="grafico-barra" style={{ '--i': 2 }} x="22" y="11" width="6" height="18" rx="1" fill="currentColor" />
      <path d="M3 30h26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <path
        className="grafico-seta"
        pathLength="1"
        d="M3 15 11 9l5 3 11-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className="grafico-ponta"
        d="M21 3h6v6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// `vendido` (nos Salvos, quando o anúncio sumiu da OLX): a foto fica borrada,
// com "Vendido" em vermelho por cima, e o selo de desconto some.
function ProductCard({ item, vendido = false }) {
  // A estrela grava em public.salvos (ver useSalvosStore).
  const saved = useSalvosStore((state) => state.itens.some((s) => s.anuncio_url === item.url))
  const alternarSalvo = useSalvosStore((state) => state.alternar)
  const logado = useAuthStore((state) => Boolean(state.session))
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // As animações do clique (pulo da estrela, onda) só valem depois de um clique
  // aqui: um card que já chega salvo não deve pular ao aparecer.
  const [clicou, setClicou] = useState(false)
  // Sem conta não há onde salvar: a estrela leva ao login e volta para cá.
  function clicarEstrela() {
    if (!logado) return navigate('/login', { state: { de: pathname }, viewTransition: true })
    setClicou(true)
    alternarSalvo(item)
  }
  const [imageFailed, setImageFailed] = useState(false)

  const level = LEVELS[item.opportunity_level]
  const FallbackIcon = CATEGORY_ICONS[item.category] ?? PhoneIcon
  // location_neighborhood já vem como "Cidade, Bairro"; location_city é fixo no worker.
  const location = item.location_neighborhood || item.location_city
  const hasMarket = item.market_price != null
  const profit = hasMarket ? item.market_price - item.price : null
  // Quanto o preço está abaixo da média (desconto sobre a média, não o lucro %).
  const abaixoPct = hasMarket && profit > 0 ? Math.round((profit / item.market_price) * 100) : null

  return (
    <article className="card-oferta relative flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-surface-card shadow-[0_6px_18px_-6px_rgba(43,43,43,0.25)] ring-1 ring-ink/5">
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        title="Ver anúncio na OLX"
        className="flex flex-1 flex-col"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-brik/5">
          {item.image_url && !imageFailed ? (
            <img
              src={item.image_url}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImageFailed(true)}
              // O scale esconde a borda clara que o blur deixa nas beiradas.
              className={`card-oferta-foto h-full w-full object-cover ${vendido ? 'scale-110 blur-md' : ''}`}
            />
          ) : (
            <div
              className={`flex h-full w-full flex-col items-center justify-center gap-1 text-brik/40 ${vendido ? 'blur-[3px]' : ''}`}
            >
              <FallbackIcon className="h-10 w-10" />
              <span className="text-[10px] font-medium">Sem foto</span>
            </div>
          )}

          {vendido && (
            <span className="absolute inset-0 flex items-center justify-center text-2xl font-extrabold uppercase tracking-wider text-red-600 [text-shadow:0_0_6px_rgba(255,255,255,0.9),0_0_2px_rgba(255,255,255,0.9)] lg:text-3xl">
              Vendido
            </span>
          )}

          {/* Etiqueta de vidro sobre a foto (.glass-selo, no index.css). */}
          {abaixoPct !== null && !vendido && (
            <span className="glass-selo absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-bold text-white lg:left-3 lg:top-3 lg:text-xs">
              {abaixoPct}% abaixo<span className="max-lg:hidden"> da média</span>
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-3 lg:gap-2 lg:p-4">
          {/* Título e selo OLX, e o nível: à direita no desktop; no celular, à
              esquerda, descendo para a linha de baixo quando não cabe. */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <div className="flex min-w-0 max-w-full items-center gap-1.5">
              <h2 className="truncate text-[13px] font-medium text-ink lg:text-[15px]">{item.title}</h2>
              <span
                title="Anúncio da OLX"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-700 text-[7px] font-bold text-white lg:h-6 lg:w-6 lg:text-[8px]"
              >
                olx
              </span>
            </div>
            {level && (
              <span
                className={`shrink-0 whitespace-nowrap lg:ml-auto rounded-md px-2 py-1 text-[10px] font-bold ${level.className}`}
              >
                {level.label}
              </span>
            )}
          </div>

          {location && (
            <p className="flex items-center gap-1 text-[11px] text-ink/55 lg:text-xs">
              <PinIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{location}</span>
            </p>
          )}

          {item.defeito && (
            <p
              role="note"
              title="A média de mercado é de aparelhos sem defeito."
              className="flex items-start gap-1 text-[11px] font-medium leading-tight text-loss"
            >
              <WarningIcon className="h-3.5 w-3.5 shrink-0" />
              <span>
                Com defeito<span className="max-lg:hidden"> · a média é de aparelhos sem defeito</span>
              </span>
            </p>
          )}

          {/* No desktop o lucro fica à direita dos valores, como no desenho; no
              celular, sem largura para os dois, desce para uma linha própria. */}
          <div className="mt-auto flex flex-col gap-1.5 pt-1 lg:flex-row lg:items-end lg:justify-between lg:gap-2">
            <dl className="min-w-0 space-y-1 leading-tight">
              <div>
                <dt className="text-[11px] text-ink/55 lg:text-xs">
                  Média<span className="max-lg:hidden"> de mercado</span>
                </dt>
                <dd className="text-[14px] font-medium text-ink/60 lg:text-base">
                  {hasMarket ? brl(item.market_price) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-ink/55 lg:text-xs">Valor</dt>
                <dd className="text-base font-bold text-ink lg:text-lg">{brl(item.price)}</dd>
              </div>
            </dl>

            {hasMarket ? (
              <div className="flex shrink-0 items-center gap-1.5 text-lucro">
                <GraficoLucro className="h-6 w-6 lg:h-10 lg:w-10" />
                <p className="text-sm font-bold leading-tight lg:text-lg">
                  <span className="lg:block lg:text-sm">Lucro: </span>
                  <span className="lg:block">{brl(profit)}</span>
                </p>
              </div>
            ) : (
              <p className="text-[11px] leading-tight text-ink/55 lg:max-w-[45%] lg:text-right">Lucro sem média ainda</p>
            )}
          </div>
        </div>
      </a>

      {/* Salvar: círculo de vidro que, com o mouse em cima, se alarga para a
          esquerda e mostra o texto; a estrela fica parada à direita. No clique o
          botão afunda, a estrela pula e, ao salvar, sai uma onda. */}
      <button
        type="button"
        aria-label={saved ? 'Remover dos salvos' : 'Salvar oferta'}
        aria-pressed={saved}
        onClick={clicarEstrela}
        className={`group/salvar absolute right-2.5 top-2.5 h-8 w-8 rounded-full transition-[width,background-color,filter,scale] duration-300 hover:w-[5.25rem] active:scale-90 lg:right-3 lg:top-3 ${
          saved ? 'glass-selo glass-selo-ativo' : 'glass-selo hover:brightness-125'
        }`}
      >
        {/* O corte do texto fica nesta camada, para a onda poder sair do botão. */}
        <span aria-hidden="true" className="absolute inset-0 flex items-center overflow-hidden rounded-full">
          <span className="translate-x-2 whitespace-nowrap pl-3 text-xs font-bold text-white opacity-0 transition-[opacity,translate] duration-200 group-hover/salvar:translate-x-0 group-hover/salvar:opacity-100">
            {saved ? 'Salvo' : 'Salvar'}
          </span>
        </span>

        <span className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center">
          {clicou && saved && <span aria-hidden="true" className="estrela-onda" />}
          <StarIcon
            key={String(saved)}
            className={`h-4 w-4 drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)] ${saved ? 'text-white' : 'text-white/90'} ${
              clicou ? (saved ? 'star-pop' : 'estrela-solta') : ''
            }`}
          />
        </span>
      </button>
    </article>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[1.75rem] bg-surface-card shadow-[0_6px_18px_-6px_rgba(43,43,43,0.25)] ring-1 ring-ink/5" aria-hidden="true">
      <div className="skeleton aspect-[4/3] w-full" />
      <div className="flex flex-col gap-2 p-3 lg:p-4">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
        <div className="mt-2 flex items-end justify-between">
          <div className="skeleton h-12 w-2/5 rounded" />
          <div className="skeleton h-9 w-1/3 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export default ProductCard
