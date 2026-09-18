import { useEffect, useMemo, useState } from 'react'
import { useOpportunitiesStore } from '../stores/useOpportunitiesStore'
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard.jsx'
import { PhoneIcon, GamepadIcon, SearchIcon } from '../components/icons.jsx'

const CATEGORIES = [
  { value: 'iphone', label: 'Iphones', Icon: PhoneIcon },
  { value: 'videogame_console', label: 'Video Games', Icon: GamepadIcon },
]

function Home() {
  const items = useOpportunitiesStore((state) => state.items)
  const loading = useOpportunitiesStore((state) => state.loading)
  const fetchOpportunities = useOpportunitiesStore((state) => state.fetchOpportunities)

  const [category, setCategory] = useState(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetchOpportunities()
  }, [fetchOpportunities])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter(
      (item) =>
        (!category || item.category === category) &&
        (!q || item.title.toLowerCase().includes(q)),
    )
  }, [items, category, query])

  const filtering = category !== null || query.trim() !== ''

  function clearFilters() {
    setCategory(null)
    setQuery('')
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-white pb-10 shadow-xl">
      <header className="rounded-b-[2rem] bg-brik px-5 pb-6 pt-6">
        <div className="mb-5 flex items-center ">
          <img src="/logoBrik.png" alt="Brik" className="h-9 w-auto" />
        </div>

        <label className="flex items-center gap-3 rounded-full bg-white px-5 py-3 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.5)] focus-within:ring-4 focus-within:ring-white/40">
          <SearchIcon className="h-5 w-5 shrink-0 text-brik" />
          <span className="sr-only">Procurar oferta de brique</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Procurar oferta de brique"
            className="w-full bg-transparent text-sm outline-none placeholder:text-ink/40"
          />
        </label>
      </header>

      <nav className="flex justify-center gap-10 px-4 pb-2 pt-5" aria-label="Categorias">
        {CATEGORIES.map(({ value, label, Icon }) => {
          const active = category === value
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => setCategory(active ? null : value)}
              className="flex w-24 flex-col items-center gap-2 rounded-xl text-xs font-medium"
            >
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md transition ${active ? 'bg-brik-dark ring-4 ring-brik/25' : 'bg-brik'
                  }`}
              >
                <Icon className="h-8 w-8" />
              </span>
              <span className={active ? 'text-brik' : ''}>{label}</span>
            </button>
          )
        })}
      </nav>

      <main className="px-4">
        {!loading && visible.length > 0 && (
          <p className="pb-3 pt-4 text-xs text-ink/60" aria-live="polite">
            {visible.length} {visible.length === 1 ? 'oportunidade' : 'oportunidades'}
          </p>
        )}

        {loading ? (
          <ul className="mt-4 grid grid-cols-2 gap-4" aria-busy="true" aria-label="Carregando ofertas">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i}>
                <ProductCardSkeleton />
              </li>
            ))}
          </ul>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <p className="font-medium">
              {filtering ? 'Nenhuma oferta com esse filtro' : 'Ainda não há oportunidades'}
            </p>
            <p className="text-sm text-ink/60">
              {filtering
                ? 'Tente outro termo ou volte a ver todas as categorias.'
                : 'As ofertas aparecem aqui assim que a próxima raspagem terminar.'}
            </p>
            {filtering && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full bg-brik px-5 py-2 text-sm font-medium text-white"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-4">
            {visible.map((item) => (
              <li key={item.id}>
                <ProductCard item={item} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

export default Home
