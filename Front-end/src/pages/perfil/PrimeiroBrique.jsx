import { Link } from 'react-router-dom'
import { ChevronRightIcon } from '../../components/icons.jsx'
import { Nota, SubPagina } from '../../components/SubPagina.jsx'
import { usePreferenciasStore } from '../../stores/usePreferenciasStore.js'

// "Passos para seu primeiro Brique", aberto pelo card do Meu Perfil. Um roteiro
// que o usuário vai marcando; cada passo leva para a tela do app que o resolve.
// O progresso é guardado pelo índice, então mudar a ordem desta lista embaralha
// o que já foi marcado.
const PASSOS = [
  {
    titulo: 'Defina quanto pode investir',
    texto: 'Separe um valor que pode ficar parado algumas semanas sem apertar as suas contas.',
  },
  {
    titulo: 'Escolha uma categoria que você conhece',
    texto: 'Conhecer o produto ajuda a perceber defeitos e preços fora da curva.',
    link: { to: '/perfil/configuracoes', label: 'Escolher categorias' },
  },
  {
    titulo: 'Garimpe as oportunidades',
    texto: 'No Início, os selos mostram quanto o preço está abaixo do mercado. Comece pelos Ótimos e Extraordinários.',
    link: { to: '/', label: 'Ver ofertas' },
  },
  {
    titulo: 'Faça a conta antes de comprar',
    texto: 'Some reparos, transporte e outros custos e veja se o lucro ainda compensa.',
    link: { to: '/calculadora/nova', label: 'Abrir a calculadora' },
  },
  {
    titulo: 'Confira o produto pessoalmente',
    texto: 'Encontre o vendedor em local público e teste tudo. Em iPhone, confira se a conta do iCloud foi desconectada.',
  },
  {
    titulo: 'Registre no seu estoque',
    texto: 'Anote quanto pagou e quanto gastou para acompanhar o resultado de cada brique.',
    link: { to: '/adicionar/novo', label: 'Adicionar produto' },
  },
  {
    titulo: 'Anuncie e acompanhe',
    texto: 'Anuncie com boas fotos e acompanhe lucro e giro no Dashboard.',
    link: { to: '/dashboard', label: 'Ir para o Dashboard' },
  },
]

function PrimeiroBrique() {
  const feitos = usePreferenciasStore((state) => state.passosFeitos)
  const alternarPasso = usePreferenciasStore((state) => state.alternarPasso)
  const total = feitos.filter((i) => i < PASSOS.length).length
  const pct = Math.round((total / PASSOS.length) * 100)

  return (
    <SubPagina titulo="Seu primeiro Brique" descricao="Um passo a passo para comprar e revender com segurança.">
      <div className="rounded-2xl bg-gradient-to-r from-brik-dark to-brik p-4 text-white">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-bold">
            {total === PASSOS.length ? 'Tudo pronto! Bons negócios.' : 'Seu progresso'}
          </p>
          <p className="text-xs text-white/75">
            {total} de {PASSOS.length} passos
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Passos concluídos"
          aria-valuemin={0}
          aria-valuemax={PASSOS.length}
          aria-valuenow={total}
          className="mt-3 h-2 overflow-hidden rounded-full bg-white/20"
        >
          <div className="h-full rounded-full bg-mint transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ol className="flex flex-col gap-2.5">
        {PASSOS.map(({ titulo, texto, link }, i) => {
          const feito = feitos.includes(i)
          return (
            <li key={titulo} className="flex gap-3 rounded-2xl bg-surface-card p-4 ring-1 ring-line">
              <button
                type="button"
                role="checkbox"
                aria-checked={feito}
                aria-label={`Marcar "${titulo}" como feito`}
                onClick={() => alternarPasso(i)}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  feito ? 'bg-profit text-surface' : 'bg-surface-raise text-brik hover:bg-line'
                }`}
              >
                {feito ? '✓' : i + 1}
              </button>

              <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold ${feito ? 'text-ink/50 line-through' : 'text-ink'}`}>{titulo}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink/60">{texto}</p>
                {link && (
                  <Link
                    to={link.to}
                    viewTransition
                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brik hover:underline"
                  >
                    {link.label}
                    <ChevronRightIcon aria-hidden="true" className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <Nota>Toque no número de um passo para marcá-lo como feito. O progresso fica salvo neste aparelho.</Nota>
    </SubPagina>
  )
}

export default PrimeiroBrique
