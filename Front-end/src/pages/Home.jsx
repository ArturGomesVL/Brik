import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useOpportunitiesStore } from '../stores/useOpportunitiesStore'
import { usePreferenciasStore } from '../stores/usePreferenciasStore.js'
import BrandHeader from '../components/BrandHeader.jsx'
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard.jsx'
import { SearchIcon } from '../components/icons.jsx'
import FiltroCidade from '../components/FiltroCidade.jsx'
import { CATEGORIAS, NIVEIS } from '../config/categorias.js'
import { TODAS, cidadeDe, passaNaCidade } from '../config/cidades.js'

// Posição de cada selo na escala (boa = 0), para comparar com o nível mínimo.
const RANK = Object.fromEntries(NIVEIS.map(({ value }, i) => [value, i]))

function Home() {
  const items = useOpportunitiesStore((state) => state.items)
  const loading = useOpportunitiesStore((state) => state.loading)
  const fetchOpportunities = useOpportunitiesStore((state) => state.fetchOpportunities)

  // Configurações do Meu Perfil: quais categorias e a partir de qual selo o feed mostra.
  const categorias = usePreferenciasStore((state) => state.categorias)
  const nivelMinimo = usePreferenciasStore((state) => state.nivelMinimo)
  const visiveisNoFeed = CATEGORIAS.filter(({ value }) => categorias.includes(value))
  const cidade = usePreferenciasStore((state) => state.cidade)
  const setCidade = usePreferenciasStore((state) => state.setCidade)

  const [category, setCategory] = useState(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetchOpportunities()
  }, [fetchOpportunities])

  // O que as Configurações deixam passar. As contagens do filtro de cidade saem
  // daqui, para o número ao lado de cada cidade bater com o que o feed mostra.
  const doFeed = useMemo(() => {
    const minimo = RANK[nivelMinimo] ?? 0
    return items.filter(
      (item) => categorias.includes(item.category) && (RANK[item.opportunity_level] ?? 0) >= minimo,
    )
  }, [items, categorias, nivelMinimo])

  // Cidades com ofertas, da que tem mais para a que tem menos.
  const cidades = useMemo(() => {
    const total = new Map()
    doFeed.forEach((item) => {
      const nome = cidadeDe(item)
      if (nome) total.set(nome, (total.get(nome) ?? 0) + 1)
    })
    return [...total].map(([nome, n]) => ({ nome, total: n })).sort((a, b) => b.total - a.total)
  }, [doFeed])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return doFeed.filter(
      (item) =>
        passaNaCidade(item, cidade) &&
        (!category || item.category === category) &&
        (!q || item.title.toLowerCase().includes(q)),
    )
  }, [doFeed, cidade, category, query])

  const filtering = category !== null || query.trim() !== '' || cidade !== TODAS
  // Há ofertas, mas as Configurações (categorias ou selo mínimo) esconderam todas.
  const escondidasPelaConfig = !filtering && items.length > 0

  function clearFilters() {
    setCategory(null)
    setQuery('')
    setCidade(TODAS)
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-surface pb-28 shadow-xl lg:max-w-none lg:pb-12 lg:shadow-none">
      <BrandHeader className="lg:rounded-none lg:px-0 lg:pb-8 lg:pt-8">
        {/* No desktop a logo fica na TopBar, e o header verde vira a faixa de busca,
            de ponta a ponta, com o conteúdo na mesma largura da TopBar (max-w-7xl). */}
        <div className="lg:mx-auto lg:max-w-7xl lg:px-8">
          <h1 className="mb-4 hidden text-2xl font-bold tracking-tight text-paper lg:block">Ofertas para garimpar</h1>
          {/* Busca e cidade: uma embaixo da outra no celular, lado a lado no desktop. */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
            <label className="flex items-center gap-3 rounded-full bg-surface-card px-5 py-3 shadow-[0_8px_20px_-8px_rgba(43,43,43,0.5)] focus-within:ring-4 focus-within:ring-white/40 lg:w-full lg:max-w-xl">
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
            <FiltroCidade value={cidade} onChange={setCidade} cidades={cidades} total={doFeed.length} />
          </div>
        </div>
      </BrandHeader>

      <nav className="flex justify-center gap-10 px-4 pb-2 pt-5 lg:mx-auto lg:max-w-7xl lg:justify-start lg:gap-2 lg:px-3 lg:pt-8" aria-label="Categorias">
        {visiveisNoFeed.map(({ value, label, Icon }) => {
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
                className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md transition ${active ? 'bg-brik-dark ring-4 ring-accent/70' : 'bg-brik'
                  }`}
              >
                <Icon className="h-8 w-8" />
              </span>
              <span className={active ? 'text-brik' : ''}>{label}</span>
            </button>
          )
        })}
      </nav>

      <main className="px-4 lg:mx-auto lg:max-w-7xl lg:px-8">
        {!loading && visible.length > 0 && (
          <p className="pb-3 pt-4 text-xs text-ink/60" aria-live="polite">
            {visible.length} {visible.length === 1 ? 'oportunidade' : 'oportunidades'}
          </p>
        )}

        {loading ? (
          <ul className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" aria-busy="true" aria-label="Carregando ofertas">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i}>
                <ProductCardSkeleton />
              </li>
            ))}
          </ul>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <p className="font-medium">
              {filtering
                ? 'Nenhuma oferta com esse filtro'
                : escondidasPelaConfig
                  ? 'Nenhuma oferta com as suas Configurações'
                  : 'Ainda não há oportunidades'}
            </p>
            <p className="text-sm text-ink/60">
              {filtering
                ? 'Tente outro termo, outra cidade ou limpe os filtros.'
                : escondidasPelaConfig
                  ? 'Ligue mais categorias ou mostre selos a partir de "Bom negócio".'
                  : 'As ofertas aparecem aqui assim que a próxima raspagem terminar.'}
            </p>
            {escondidasPelaConfig && (
              <Link
                to="/perfil/configuracoes"
                viewTransition
                className="rounded-full bg-brik px-5 py-2 text-sm font-medium text-paper transition-colors hover:bg-brik-dark"
              >
                Abrir Configurações
              </Link>
            )}
            {filtering && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full bg-brik px-5 py-2 text-sm font-medium text-paper transition-colors hover:bg-brik-dark"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
