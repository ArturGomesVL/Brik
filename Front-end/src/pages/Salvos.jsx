import { useEffect, useMemo, useState } from 'react'
import BrandHeader from '../components/BrandHeader.jsx'
import { PrecisaLogin } from '../components/PrecisaLogin.jsx'
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard.jsx'
import { StarIcon } from '../components/icons.jsx'
import { supabase } from '../lib/supabase.js'
import { useUsuarioId } from '../stores/useAuthStore.js'
import { useOpportunitiesStore } from '../stores/useOpportunitiesStore.js'
import { useSalvosStore } from '../stores/useSalvosStore.js'

// "Salvos": os briques que o usuário marcou com a estrela no feed
// (public.salvos). Enquanto o anúncio segue no feed, o card mostra os dados de
// agora (preço, selo, média); se ele saiu, mostra o retrato de quando foi salvo.
// Saiu de dois jeitos: sumiu da OLX (o worker apaga de anuncios_ativos depois de
// 3 raspagens completas sem ele), e aí o card aparece como vendido; ou segue
// anunciado mas deixou de ser oportunidade, e aí vai só um aviso.
function Salvos() {
  const userId = useUsuarioId()
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

  // Dos salvos fora do feed, os que ainda existem em anuncios_ativos (os demais
  // foram vendidos). null enquanto não consultou.
  const [aindaAtivos, setAindaAtivos] = useState(null)
  const foraDoFeed = useMemo(() => {
    const noFeed = new Set(feed.map((item) => item.url))
    return salvos.map((s) => s.anuncio_url).filter((url) => !noFeed.has(url))
  }, [salvos, feed])
  const chaveFora = foraDoFeed.join(' ')

  useEffect(() => {
    if (!carregado || esperandoFeed || foraDoFeed.length === 0) return
    let ativo = true
    supabase
      .from('anuncios_ativos')
      .select('url')
      .in('url', foraDoFeed)
      .then(({ data, error }) => {
        if (!ativo) return
        if (error) console.error('Erro ao conferir os salvos fora do feed:', error.message)
        // Sem resposta, nenhum vira "vendido": todos ficam só com o aviso.
        setAindaAtivos(new Set(error ? foraDoFeed : data.map((linha) => linha.url)))
      })
    return () => {
      ativo = false
    }
    // chaveFora resume foraDoFeed: só consulta de novo quando a lista muda.
  }, [carregado, esperandoFeed, chaveFora]) // eslint-disable-line react-hooks/exhaustive-deps

  const lista = useMemo(() => {
    const porUrl = new Map(feed.map((item) => [item.url, item]))
    return salvos.map(({ anuncio_url, anuncio }) => {
      const atual = porUrl.get(anuncio_url)
      const vendido = !atual && aindaAtivos !== null && !aindaAtivos.has(anuncio_url)
      return { url: anuncio_url, item: atual ?? anuncio, saiu: !atual && !vendido, vendido }
    })
  }, [salvos, feed, aindaAtivos])

  const pronto = carregado && !esperandoFeed && (foraDoFeed.length === 0 || aindaAtivos !== null)

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

        {userId === null ? (
          <PrecisaLogin mensagem="Entre na sua conta para salvar ofertas e acompanhá-las por aqui." />
        ) : !pronto ? (
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
              {lista.map(({ url, item, saiu, vendido }) => (
                <li key={url} className="flex flex-col gap-1.5">
                  {saiu && (
                    <p className="rounded-lg bg-surface-raise px-2.5 py-1.5 text-[11px] leading-snug text-mute">
                      Saiu do feed · dados de quando você salvou
                    </p>
                  )}
                  <div className={`flex-1 ${saiu ? 'opacity-75' : ''}`}>
                    <ProductCard item={item} vendido={vendido} />
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
