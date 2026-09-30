import { Grupo, Interruptor, Linha, Nota, SubPagina } from '../../components/SubPagina.jsx'
import { CATEGORIAS, NIVEIS } from '../../config/categorias.js'
import { usePreferenciasStore } from '../../stores/usePreferenciasStore.js'

// Configurações: a aparência do app e o que aparece no feed. As escolhas do feed
// filtram o Início de verdade (ver o `visible` de Home.jsx).
function Configuracoes() {
  const categorias = usePreferenciasStore((state) => state.categorias)
  const alternarCategoria = usePreferenciasStore((state) => state.alternarCategoria)
  const nivelMinimo = usePreferenciasStore((state) => state.nivelMinimo)
  const setNivelMinimo = usePreferenciasStore((state) => state.setNivelMinimo)
  const modoEscuro = usePreferenciasStore((state) => state.modoEscuro)
  const setModoEscuro = usePreferenciasStore((state) => state.setModoEscuro)

  return (
    <SubPagina titulo="Configurações" descricao="Ajuste a aparência do app e o que aparece no seu Início.">
      <Grupo titulo="Aparência">
        <Linha titulo="Modo escuro" detalhe="Deixa o app inteiro com fundo escuro, mais confortável à noite.">
          <Interruptor ligado={modoEscuro} onChange={setModoEscuro} label="Modo escuro" />
        </Linha>
      </Grupo>

      <Grupo titulo="Categorias no Início">
        {CATEGORIAS.map(({ value, label, Icon }) => {
          const ligada = categorias.includes(value)
          const ultima = ligada && categorias.length === 1
          return (
            <Linha key={value} titulo={label} detalhe={ultima ? 'Deixe pelo menos uma categoria ligada.' : undefined}>
              <Icon aria-hidden="true" className="order-first h-6 w-6 shrink-0 text-brik" />
              <Interruptor ligado={ligada} onChange={() => alternarCategoria(value)} label={label} />
            </Linha>
          )
        })}
      </Grupo>

      <section>
        <h2 id="nivel-minimo" className="mb-2 px-1 text-xs font-bold uppercase tracking-[0.14em] text-ink/50">
          Mostrar a partir de
        </h2>
        <div role="radiogroup" aria-labelledby="nivel-minimo" className="grid gap-2 lg:grid-cols-3">
          {NIVEIS.map(({ value, label, desconto }) => {
            const ativo = value === nivelMinimo
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={ativo}
                onClick={() => setNivelMinimo(value)}
                className={`rounded-2xl px-4 py-3 text-left ring-1 transition-colors ${
                  ativo ? 'bg-brik text-paper ring-brik' : 'bg-surface-card text-ink ring-line hover:bg-surface-raise'
                }`}
              >
                <span className="block text-sm font-bold">{label}</span>
                <span className={`mt-0.5 block text-xs ${ativo ? 'text-paper/75' : 'text-ink/55'}`}>
                  {desconto}% ou mais abaixo do mercado
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <Nota>
        O preço de mercado é a mediana dos anúncios do mesmo modelo e condição. Estas escolhas ficam
        salvas neste aparelho.
      </Nota>
    </SubPagina>
  )
}

export default Configuracoes
