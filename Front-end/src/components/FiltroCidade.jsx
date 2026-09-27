import { ChevronDownIcon, PinIcon } from './icons.jsx'
import { GRUPOS, TODAS } from '../config/cidades.js'

// Seletor de cidade do header verde do Início. É um <select> nativo (no celular
// abre a roleta do sistema), vestido de pílula de vidro sobre o petróleo.
// `cidades` vem pronta de Home: [{ nome, total }], da que tem mais ofertas para
// a que tem menos.
function FiltroCidade({ value, onChange, cidades, total }) {
  const contagem = Object.fromEntries(cidades.map(({ nome, total: n }) => [nome, n]))
  // Uma cidade escolhida antes pode estar sem ofertas agora: continua na lista
  // (com 0), senão o select mostraria outra opção no lugar dela.
  const soltas =
    value !== TODAS && !GRUPOS.some((g) => g.value === value) && !(value in contagem)
      ? [...cidades, { nome: value, total: 0 }]
      : cidades

  return (
    <label className="relative inline-flex w-fit items-center gap-2 rounded-full bg-white/15 py-2 pl-4 pr-9 text-sm font-medium text-paper ring-1 ring-white/25 transition-colors focus-within:ring-2 focus-within:ring-mint hover:bg-white/20">
      <PinIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span className="sr-only">Cidade</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="cursor-pointer appearance-none bg-transparent outline-none [&>*]:text-ink"
      >
        <option value={TODAS}>Todas as cidades ({total})</option>
        {GRUPOS.map(({ value: grupo, label, cidades: doGrupo }) => (
          <option key={grupo} value={grupo}>
            {label}: {doGrupo.join(' e ')} ({doGrupo.reduce((soma, nome) => soma + (contagem[nome] ?? 0), 0)})
          </option>
        ))}
        <optgroup label="Cidades">
          {soltas.map(({ nome, total: n }) => (
            <option key={nome} value={nome}>
              {nome} ({n})
            </option>
          ))}
        </optgroup>
      </select>
      <ChevronDownIcon aria-hidden="true" className="pointer-events-none absolute right-3.5 h-4 w-4" />
    </label>
  )
}

export default FiltroCidade
