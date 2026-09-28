import { Link } from 'react-router-dom'
import BrandHeader from './BrandHeader.jsx'
import { ArrowLeftIcon } from './icons.jsx'

// Moldura das telas abertas pela lista do Meu Perfil: header da marca (no
// desktop some, a logo está na TopBar), seta de voltar com o título e o
// conteúdo numa coluna, mais larga no desktop.
export function SubPagina({ titulo, descricao, voltarPara = '/perfil', children }) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-surface pb-28 shadow-xl lg:max-w-2xl lg:pb-12 lg:shadow-none">
      <BrandHeader />

      <div className="flex items-center gap-2 px-4 pt-4 lg:pt-12">
        <Link
          to={voltarPara}
          viewTransition
          aria-label="Voltar"
          className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink transition-colors hover:bg-surface-raise"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-ink lg:text-[28px]">{titulo}</h1>
      </div>
      {descricao && <p className="mt-1 px-4 text-sm text-ink/60 lg:pl-[3.25rem]">{descricao}</p>}

      <main className="flex flex-col gap-5 px-4 pt-5">{children}</main>
    </div>
  )
}

// Bloco com título pequeno e um cartão branco de linhas.
export function Grupo({ titulo, children }) {
  return (
    <section>
      {titulo && <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-[0.14em] text-ink/50">{titulo}</h2>}
      <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-surface-card ring-1 ring-line">{children}</ul>
    </section>
  )
}

// Linha com texto à esquerda e um controle (interruptor, selo) à direita.
export function Linha({ titulo, detalhe, children }) {
  return (
    <li className="flex items-center gap-4 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{titulo}</p>
        {detalhe && <p className="mt-0.5 text-xs leading-snug text-ink/55">{detalhe}</p>}
      </div>
      {children}
    </li>
  )
}

// Interruptor liga/desliga. O rótulo vem do texto da linha (aria-label).
export function Interruptor({ ligado, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={label}
      onClick={() => onChange(!ligado)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${ligado ? 'bg-brik' : 'bg-line'}`}
    >
      <span
        aria-hidden="true"
        className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
          ligado ? 'translate-x-5' : ''
        }`}
      />
    </button>
  )
}

// Selo para o que ainda não funciona: melhor dizer do que um botão que não faz nada.
export function EmBreveSelo() {
  return (
    <span className="shrink-0 rounded-full bg-surface-raise px-2.5 py-1 text-[11px] font-medium text-ink/55">
      Em breve
    </span>
  )
}

// Aviso discreto no pé da tela.
export function Nota({ children }) {
  return <p className="px-1 text-xs leading-relaxed text-ink/50">{children}</p>
}
