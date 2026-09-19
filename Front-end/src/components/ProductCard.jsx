import { useState } from 'react'
import { GamepadIcon, PhoneIcon, PinIcon, StarIcon } from './icons.jsx'

const LEVELS = {
  boa: { label: 'Bom negócio', className: 'bg-orange-500' },
  otima: { label: 'Ótimo negócio', className: 'bg-green-600' },
  extraordinaria: { label: 'Extraordinário', className: 'bg-purple-600' },
}

const CATEGORY_ICONS = { iphone: PhoneIcon, videogame_console: GamepadIcon }

const brl = (value) =>
  Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

function ProductCard({ item }) {
  const [saved, setSaved] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)

  const level = LEVELS[item.opportunity_level]
  const FallbackIcon = CATEGORY_ICONS[item.category] ?? PhoneIcon
  // location_neighborhood já vem como "Cidade, Bairro"; location_city é fixo no worker.
  const location = item.location_neighborhood || item.location_city
  const hasMarket =item.market_price != null
  const profit = hasMarket ? item.market_price - item.price : null
  const profitPct = hasMarket ? Math.round((profit / item.price) * 100) : null

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_6px_18px_-6px_rgba(11,27,77,0.25)] ring-1 ring-ink/5">
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
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-brik/40">
              <FallbackIcon className="h-10 w-10" />
              <span className="text-[10px] font-medium">Sem foto</span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2.5 p-3 pb-14">
          <div>
            <h2 className="line-clamp-2 min-h-[2.5em] text-[13px] font-medium leading-tight">{item.title}</h2>
            {location && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-ink/60">
                <PinIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{location}</span>
              </p>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-2 text-[11px] leading-tight text-ink/60">
            <div>
              <dt>Valor</dt>
              <dd className="mt-0.5 text-[15px] font-bold text-ink">{brl(item.price)}</dd>
            </div>
            <div>
              <dt>Média de mercado</dt>
              <dd className="mt-0.5 text-[15px] font-medium text-ink/70">{hasMarket ? brl(item.market_price) : '—'}</dd>
            </div>
          </dl>

          {hasMarket ? (
            <p className="flex items-baseline justify-between rounded-lg bg-gain-bg px-2.5 py-1.5 text-gain">
              <span className="text-[11px] font-medium">Lucro</span>
              <span className="text-[15px] font-bold">
                +{brl(profit)} <span className="text-[11px] font-medium">({profitPct}%)</span>
              </span>
            </p>
          ) : (
            <p className="rounded-lg bg-paper px-2.5 py-1.5 text-[11px] text-ink/60">Lucro ainda sem média de mercado</p>
          )}
        </div>
      </a>

      <div className="absolute bottom-3 left-3 right-12 flex items-center gap-2">
        {level && (
          <span className={`whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-bold text-white ${level.className}`}>
            {level.label}
          </span>
        )}
        <span
          title="Anúncio da OLX"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-700 text-[8px] font-bold text-white"
        >
          olx
        </span>
      </div>

      <button
        type="button"
        aria-label={saved ? 'Remover dos salvos' : 'Salvar oferta'}
        aria-pressed={saved}
        onClick={() => setSaved((s) => !s)}
        className="absolute bottom-2 right-2 rounded-full p-1"
      >
        <StarIcon key={String(saved)} className={`h-6 w-6 ${saved ? 'star-pop text-yellow-400' : 'text-gray-300'}`} />
      </button>
    </article>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_6px_18px_-6px_rgba(11,27,77,0.25)] ring-1 ring-ink/5" aria-hidden="true">
      <div className="skeleton aspect-[4/3] w-full" />
      <div className="flex flex-col gap-2.5 p-3 pb-14">
        <div className="skeleton h-3.5 w-full rounded" />
        <div className="skeleton h-3.5 w-2/3 rounded" />
        <div className="skeleton mt-1 h-8 w-full rounded" />
        <div className="skeleton h-8 w-full rounded-lg" />
      </div>
    </div>
  )
}

export default ProductCard
