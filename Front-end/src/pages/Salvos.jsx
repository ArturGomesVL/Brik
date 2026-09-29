import { useEffect, useMemo, useState } from 'react'
import BrandHeader from '../components/BrandHeader.jsx'
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard.jsx'
import { StarIcon } from '../components/icons.jsx'
import { useOpportunitiesStore } from '../stores/useOpportunitiesStore.js'
import { useSalvosStore } from '../stores/useSalvosStore.js'

// "Salvos": os briques que o usuário marcou com a estrela no feed
// (public.salvos). Enquanto o anúncio segue no feed, o card mostra os dados de
// agora (preço, selo, média); se ele saiu, mostra o retrato de quando foi salvo,
// com um aviso.
function Salvos() {
  const salvos = useSalvosStore((state) => state.itens)
  const carregado = useSalvosStore((state) => state.carregado)
  const erro = useSalvosStore((state) => state.erro)

  const feed = useOpportunitiesStore((state) => state.items)
  const fetchOpportunities = useOpportunitiesStore((state) => state.fetchOpportunities)

  // Quem abre direto aqui ainda não carregou o feed. Até ele chegar, todo salvo
  // pareceria "fora do feed", então a lista espera.
  const [esperandoFeed, setEsperandoFeed] = useState(() => useOpportunitiesStore.getState().items.length === 0)
  useEffect(() => {
    if (!esperandoFeed) return
    fetchOpportunities().finally(() => setEsperandoFeed(false))
    // Só na abertura.
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const lista = useMemo(() => {
    const porUrl = new Map(feed.map((item) => [item.url, item]))
    return salvos.map(({ anuncio_url, anuncio }) => {
      const atual = porUrl.get(anuncio_url)
      return { url: anuncio_url, item: atual ?? anuncio, saiu: !atual }
    })
  }, [salvos, feed])

  const pronto = carregado && !esperandoFeed

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-surface pb-28 shadow-xl lg:max-w-7xl lg:px-8 lg:pb-12 lg:shadow-none">
      <BrandHeader />

      <main className="px-4 pt-6 lg:px-0 lg:pt-12">
        <h1 className="text-[28px] font-bold leading-none tracking-tight text-ink">Salvos</h1>

        {erro && (
          <p role="alert" className="mt-4 rounded-lg bg-loss/10 px-3 py-2 text-sm text-loss">
            {erro}
          </p>
        )}

        {!pronto ? (
          <ul className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4" aria-busy="true" aria-label="Carregando salvos">
            {[0, 1].map((i) => (
              <li key={i}>
                <ProductCardSkeleton />
              </li>
            ))}
          </ul>
        ) : lista.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <StarIcon className="h-10 w-10 text-line" aria-hidden="true" />
            <p className="mt-1 font-medium">Você ainda não tem nenhum item salvo</p>
            <p className="text-sm text-ink/60">
              Toque na estrelinha de uma oferta no Início para guardar um possível brique e acompanhá-lo por aqui.
            </p>
          </div>
        ) : (
          <>
            <p className="pb-3 pt-4 text-xs text-ink/60">
              {lista.length} {lista.length === 1 ? 'oferta salva' : 'ofertas salvas'}
            </p>
            <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {lista.map(({ url, item, saiu }) => (
                <li key={url} className="flex flex-col gap-1.5">
                  {saiu && (
                    <p className="rounded-lg bg-surface-raise px-2.5 py-1.5 text-[11px] leading-snug text-mute">
                      Saiu do feed · dados de quando você salvou
                    </p>
                  )}
                  <div className={`flex-1 ${saiu ? 'opacity-75' : ''}`}>
                    <ProductCard item={item} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  )
}

export default Salvos
