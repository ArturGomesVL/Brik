import { Link } from 'react-router-dom'
import BrandHeader from '../components/BrandHeader.jsx'
import {
  AvatarIcon,
  BellIcon,
  ChevronRightIcon,
  DocIcon,
  GearIcon,
  LockIcon,
  LogoutIcon,
  SupportIcon,
  TrophyIcon,
} from '../components/icons.jsx'

// "Meu Perfil": conta e ajustes. Ainda não existe login, então o nome é um
// genérico e os itens da lista não levam a lugar nenhum — cada um espera a sua
// própria tela.

const ITENS = [
  { key: 'privacidade', label: 'Privacidade', Icon: LockIcon },
  { key: 'notificacoes', label: 'Notificações', Icon: BellIcon },
  { key: 'configuracoes', label: 'Configurações', Icon: GearIcon },
  { key: 'ajuda', label: 'Ajuda e Suporte', Icon: SupportIcon },
  { key: 'termos', label: 'Termos de Uso', Icon: DocIcon },
  { key: 'sair', label: 'Sair', Icon: LogoutIcon, perigo: true },
]

function Item({ label, Icon, perigo }) {
  return (
    <li>
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-xl bg-paper px-3 py-3 text-left transition-colors hover:bg-black/5"
      >
        <span
          aria-hidden="true"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${
            perigo ? 'bg-red-600' : 'bg-brik'
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>

        <span className={`flex-1 text-sm font-medium ${perigo ? 'text-red-600' : 'text-ink'}`}>
          {label}
        </span>

        <ChevronRightIcon
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 ${perigo ? 'text-red-600' : 'text-brik'}`}
        />
      </button>
    </li>
  )
}

function Perfil() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-white pb-28 shadow-xl">
      <BrandHeader />

      <main className="px-4">
        <div className="flex flex-col items-center pt-6">
          <span
            aria-hidden="true"
            className="flex h-24 w-24 items-center justify-center rounded-full bg-brik-dark text-white shadow-[0_8px_20px_-10px_rgba(11,27,77,0.6)]"
          >
            <AvatarIcon className="h-14 w-14" />
          </span>

          <p className="mt-3 text-lg font-bold text-ink">Usuário</p>

          <Link
            to="/perfil/editar"
            viewTransition
            className="mt-2.5 rounded-lg border border-brik/40 px-6 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-paper"
          >
            Editar perfil
          </Link>
        </div>

        {/* Atalho para o passo a passo de quem está começando. */}
        <button
          type="button"
          className="mt-6 flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-brik-dark to-brik p-4 text-left text-white"
        >
          <TrophyIcon className="h-9 w-9 shrink-0" aria-hidden="true" />

          <span className="min-w-0 flex-1">
            <span className="block font-bold">Passos para seu primeiro Brique</span>
            <span className="mt-1 block text-[11px] leading-snug text-white/75">
              Siga um passo a passo simples e faça seu primeiro brique com sucesso!
            </span>
          </span>

          <ChevronRightIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
        </button>

        <h1 className="sr-only">Meu Perfil</h1>

        <ul className="mt-5 flex flex-col gap-2.5">
          {ITENS.map((item) => (
            <Item key={item.key} {...item} />
          ))}
        </ul>
      </main>
    </div>
  )
}

export default Perfil
