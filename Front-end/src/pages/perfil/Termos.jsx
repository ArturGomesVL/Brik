import { DocIcon } from '../../components/icons.jsx'
import { SubPagina } from '../../components/SubPagina.jsx'

// Termos de Uso. O texto jurídico ainda não existe e não deve ser inventado:
// quando a versão revisada chegar, ela entra aqui no lugar do aviso.
function Termos() {
  return (
    <SubPagina titulo="Termos de Uso">
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface-card px-6 py-12 text-center ring-1 ring-line">
        <DocIcon aria-hidden="true" className="h-10 w-10 text-line" />
        <p className="mt-1 font-medium text-ink">Os Termos de Uso estão sendo finalizados</p>
        <p className="max-w-sm text-sm text-ink/60">
          A versão completa vai aparecer aqui antes do lançamento do Brik.
        </p>
      </div>
    </SubPagina>
  )
}

export default Termos
