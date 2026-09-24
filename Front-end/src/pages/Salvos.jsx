import BrandHeader from '../components/BrandHeader.jsx'
import { StarIcon } from '../components/icons.jsx'

// "Salvos": os briques que o usuário marcou com a estrela no feed. Ainda não há
// onde guardar essa marcação (ela vive só no card, em ProductCard.jsx), então a
// tela mostra o estado vazio. Quando a fonte existir, a lista entra aqui no
// mesmo formato do feed (ProductCard).
function Salvos() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-paper pb-28 shadow-xl">
      <BrandHeader />

      <main className="px-4 pt-6">
        <h1 className="text-[28px] font-bold leading-none tracking-tight text-ink">Salvos</h1>

        <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
          <StarIcon className="h-10 w-10 text-line" aria-hidden="true" />
          <p className="mt-1 font-medium">Você ainda não tem nenhum item salvo</p>
          <p className="text-sm text-ink/60">
            Toque na estrelinha de uma oferta no Início para guardar um possível brique e
            acompanhá-lo por aqui.
          </p>
        </div>
      </main>
    </div>
  )
}

export default Salvos
