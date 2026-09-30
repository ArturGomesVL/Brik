import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useOpportunitiesStore } from '../stores/useOpportunitiesStore'
import { usePreferenciasStore } from '../stores/usePreferenciasStore.js'
import BrandHeader from '../components/BrandHeader.jsx'
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard.jsx'
import { SearchIcon } from '../components/icons.jsx'
import FiltroCidade from '../components/FiltroCidade.jsx'
import FiltroOfertas from '../components/FiltroOfertas.jsx'
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
  // Botão Filtros: selos ligados e o máximo que a pessoa quer gastar.
  const niveis = usePreferenciasStore((state) => state.niveis)
  const setNiveis = usePreferenciasStore((state) => state.setNiveis)
  const precoMaximo = usePreferenciasStore((state) => state.precoMaximo)
  const setPrecoMaximo = usePreferenciasStore((state) => state.setPrecoMaximo)

  const [category, setCategory] = useState(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetchOpportunities()
  }, [fetchOpportunities])

  // O que as Configurações deixam passar.
  const doConfig = useMemo(() => {
    const minimo = RANK[nivelMinimo] ?? 0
    return items.filter(
      (item) => categorias.includes(item.category) && (RANK[item.opportunity_level] ?? 0) >= minimo,
    )
  }, [items, categorias, nivelMinimo])

  // Selos do botão Filtros: só os permitidos pelo mínimo das Configurações. Se
  // nenhum dos escolhidos é permitido (o mínimo mudou depois), valem todos.
  const permitidos = useMemo(
    () => NIVEIS.filter(({ value }) => RANK[value] >= (RANK[nivelMinimo] ?? 0)).map(({ value }) => value),
    [nivelMinimo],
  )
  const niveisAtivos = useMemo(() => {
    const ligados = permitidos.filter((value) => niveis.includes(value))
    return ligados.length ? ligados : permitidos
  }, [permitidos, niveis])

  // Fim da régua de preço: o anúncio mais caro, arredondado para cima de 500 em 500.
  const teto = useMemo(
    () => Math.max(500, Math.ceil(doConfig.reduce((maior, item) => Math.max(maior, Number(item.price)), 0) / 500) * 500),
    [doConfig],
  )

  // Configurações + botão Filtros. As contagens do filtro de cidade saem daqui,
  // para o número ao lado de cada cidade bater com o que o feed mostra.
  const doFeed = useMemo(
    () =>
      doConfig.filter(
        (item) =>
          niveisAtivos.includes(item.opportunity_level) && (precoMaximo == null || Number(item.price) <= precoMaximo),
      ),
    [doConfig, niveisAtivos, precoMaximo],
  )

  // Cidades com ofertas, da que tem mais para a que tem menos.
  const cidades = useMemo(() => {
    const total = new Map()
    doFeed.forEach((item) => {
      const nome = cidadeDe(item)
      if (nome) total.set(nome, (total.get(nome) ?? 0) + 1)
    })
    return [...total].map(([nome, n]) => ({ nome, total: n })).sort((a, b) => b.total - a.total)
  }, [doFeed])

  // Tudo menos a categoria: daqui saem o feed e a contagem de cada categoria
  // (na coluna lateral do desktop).
  const semCategoria = useMemo(() => {
    const q = query.trim().toLowerCase()
    return doFeed.filter((item) => passaNaCidade(item, cidade) && (!q || item.title.toLowerCase().includes(q)))
  }, [doFeed, cidade, query])

  const porCategoria = useMemo(() => {
    const total = {}
    semCategoria.forEach((item) => {
      total[item.category] = (total[item.category] ?? 0) + 1
    })
    return total
  }, [semCategoria])

  const visible = useMemo(
    () => (category ? semCategoria.filter((item) => item.category === category) : semCategoria),
    [semCategoria, category],
  )

  const filtrosOferta = niveisAtivos.length < permitidos.length || precoMaximo != null
  const filtering = category !== null || query.trim() !== '' || cidade !== TODAS || filtrosOferta
  // Há ofertas, mas as Configurações (categorias ou selo mínimo) esconderam todas.
  const escondidasPelaConfig = !filtering && items.length > 0

  function limparFiltrosOferta() {
    setNiveis(NIVEIS.map(({ value }) => value))
    setPrecoMaximo(null)
  }

  function clearFilters() {
    setCategory(null)
    setQuery('')
    setCidade(TODAS)
    limparFiltrosOferta()
  }

  // Cidade e Filtros aparecem duas vezes: no header verde (celular) e na coluna
  // lateral (desktop, `lateral`). Só uma das duas fica visível.
  const filtroCidade = (lateral) => (
    <FiltroCidade lateral={lateral} value={cidade} onChange={setCidade} cidades={cidades} total={doFeed.length} />
  )
  const filtroOfertas = (lateral) => (
    <FiltroOfertas
      lateral={lateral}
      niveis={niveisAtivos}
      permitidos={permitidos}
      onNiveis={setNiveis}
      precoMaximo={precoMaximo}
      onPrecoMaximo={setPrecoMaximo}
      teto={teto}
      resultado={visible.length}
      onLimpar={limparFiltrosOferta}
    />
  )

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-surface pb-28 shadow-xl lg:max-w-none lg:pb-12 lg:shadow-none">
      <BrandHeader className="lg:rounded-none lg:px-0 lg:pb-8 lg:pt-8">
        {/* No desktop a logo fica na TopBar, e o header verde vira a faixa de busca,
            de ponta a ponta, com o conteúdo na mesma largura da TopBar (max-w-7xl). */}
        <div className="lg:mx-auto lg:max-w-7xl lg:px-8">
          <h1 className="mb-4 hidden text-2xl font-bold tracking-tight text-paper lg:block">Ofertas para garimpar</h1>
          {/* Busca, e embaixo cidade e Filtros. No desktop fica só a busca: cidade,
              Filtros e categorias vão para a coluna lateral, ao lado do feed. */}
          <div className="flex flex-col gap-3">
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
            {/* Cidade e Filtros lado a lado. relative: o painel dos Filtros se
                alinha a esta linha, não ao botão. */}
            <div className="relative flex items-center gap-2 lg:hidden">
              {filtroCidade(false)}
              {filtroOfertas(false)}
            </div>
          </div>
        </div>
      </BrandHeader>

      <nav className="flex justify-center gap-10 px-4 pb-2 pt-5 lg:hidden" aria-label="Categorias">
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

      {/* Desktop: o feed à esquerda e, à direita, a coluna com cidade, Filtros e
          categorias, que acompanha a rolagem. Com um painel aberto ela pode
          passar da altura da tela: aí rola sozinha. Ela vem antes no código para
          o Tab chegar aos filtros antes de centenas de cards. */}
      <div className="lg:mx-auto lg:flex lg:max-w-7xl lg:items-start lg:gap-8 lg:px-8 lg:pt-6">
        <aside
          aria-label="Filtrar ofertas"
          className="hidden lg:sticky lg:top-20 lg:order-last lg:flex lg:max-h-[calc(100dvh-6rem)] lg:w-80 lg:shrink-0 lg:flex-col lg:gap-5 lg:overflow-y-auto lg:overscroll-contain lg:rounded-2xl lg:bg-surface-card lg:p-4 lg:shadow-card lg:ring-1 lg:ring-line"
        >
          <div>
            <h2 className="text-base font-bold text-ink">Refinar ofertas</h2>
            <p className="text-xs text-mute">
              {visible.length} {visible.length === 1 ? 'oportunidade' : 'oportunidades'}
            </p>
          </div>

          <section className="flex flex-col gap-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-mute">Cidade</h3>
            {filtroCidade(true)}
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-mute">Selos e orçamento</h3>
            {filtroOfertas(true)}
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-mute">Categorias</h3>
            <ul className="flex flex-col gap-2">
              {visiveisNoFeed.map(({ value, label, Icon }) => {
                const active = category === value
                return (
                  <li key={value}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setCategory(active ? null : value)}
                      className={`flex w-full items-center gap-3 rounded-xl p-2 pr-3 text-left text-sm font-medium ring-1 transition-[background-color,box-shadow,transform] active:scale-[0.98] ${
                        active ? 'bg-brik/[0.06] text-brik ring-brik/40' : 'text-ink ring-line hover:bg-surface-raise'
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition ${
                          active ? 'bg-brik-dark ring-2 ring-accent/70' : 'bg-brik'
                        }`}
                      >
                        <Icon className="h-6 w-6" />
                      </span>
                      <span className="flex-1">{label}</span>
                      <span className="rounded-full bg-surface-raise px-2 py-0.5 text-[11px] font-bold tabular-nums text-mute">
                        {porCategoria[value] ?? 0}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          {filtering && (
            <button
              type="button"
              onClick={clearFilters}
              className="self-start text-sm font-medium text-brik underline underline-offset-2 hover:text-brik-dark"
            >
              Limpar todos os filtros
            </button>
          )}
        </aside>

        <main className="px-4 lg:min-w-0 lg:flex-1 lg:px-0">
          {!loading && visible.length > 0 && (
            <p className="pb-3 pt-4 text-xs text-ink/60 lg:pt-0" aria-live="polite">
              {visible.length} {visible.length === 1 ? 'oportunidade' : 'oportunidades'}
            </p>
          )}

          {loading ? (
            <ul className="mt-4 grid grid-cols-2 gap-4 lg:mt-0 xl:grid-cols-3" aria-busy="true" aria-label="Carregando ofertas">
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
                  ? 'Tente outro termo, outra cidade, outro valor ou limpe os filtros.'
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
            <ul className="grid grid-cols-2 gap-4 xl:grid-cols-3">
              {visible.map((item) => (
                <li key={item.id}>
                  <ProductCard item={item} />
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </div>
  )
}

export default Home
