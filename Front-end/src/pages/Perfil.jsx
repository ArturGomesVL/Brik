import { Link, useNavigate } from 'react-router-dom'
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
import { supabase } from '../lib/supabase.js'

// "Meu Perfil": conta e ajustes. O nome ainda é um genérico. Cada item da lista
// abre a sua tela (pages/perfil/); o "Sair" encerra a sessão.

const ITENS = [
  { key: 'privacidade', label: 'Privacidade', Icon: LockIcon, to: '/perfil/privacidade' },
  { key: 'notificacoes', label: 'Notificações', Icon: BellIcon, to: '/perfil/notificacoes' },
  { key: 'configuracoes', label: 'Configurações', Icon: GearIcon, to: '/perfil/configuracoes' },
  { key: 'ajuda', label: 'Ajuda e Suporte', Icon: SupportIcon, to: '/perfil/ajuda' },
  { key: 'termos', label: 'Termos de Uso', Icon: DocIcon, to: '/perfil/termos' },
  { key: 'sair', label: 'Sair', Icon: LogoutIcon, perigo: true },
]

// Com `to` o item é um link para a sua tela; sem, é um botão (o "Sair").
function Item({ label, Icon, perigo, to, onClick }) {
  const Tag = to ? Link : 'button'
  const props = to ? { to, viewTransition: true } : { type: 'button', onClick }
  return (
    <li>
      <Tag
        {...props}
        className="flex w-full items-center gap-3 rounded-xl bg-surface-card px-3 py-3 text-left ring-1 ring-line transition-colors hover:bg-surface-raise"
      >
        <span
          aria-hidden="true"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${perigo ? 'bg-loss' : 'bg-brik'
            }`}
        >
          <Icon className="h-5 w-5" />
        </span>

        <span className={`flex-1 text-sm font-medium ${perigo ? 'text-loss' : 'text-ink'}`}>
          {label}
        </span>

        <ChevronRightIcon
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 ${perigo ? 'text-loss' : 'text-brik'}`}
        />
      </Tag>
    </li>
  )
}

function Perfil() {
  const navigate = useNavigate()

  async function sair() {
    await supabase.auth.signOut()
    navigate('/login', { viewTransition: true })
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-paper pb-28 shadow-xl lg:max-w-2xl lg:pb-12 lg:shadow-none">
      <BrandHeader />

      <main className="px-4 lg:pt-6">
        <div className="flex flex-col items-center pt-6">
          <span
            aria-hidden="true"
            className="flex h-24 w-24 items-center justify-center rounded-full bg-brik-dark text-white shadow-[0_8px_20px_-10px_rgba(43,43,43,0.6)]"
          >
            <AvatarIcon className="h-14 w-14" />
          </span>

          <p className="mt-3 text-lg font-bold text-ink">Usuário</p>

          <Link
            to="/perfil/editar"
            viewTransition
            className="mt-2.5 rounded-lg border border-brik/40 px-6 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface-raise"
          >
            Editar perfil
          </Link>
        </div>

        {/* Atalho para o passo a passo de quem está começando. */}
        <Link
          to="/perfil/primeiro-brique"
          viewTransition
          className="mt-6 flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-brik-dark to-brik p-4 text-left text-white transition-opacity hover:opacity-95"
        >
          <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-paper">
            <TrophyIcon className="h-6 w-6 text-brik" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block font-bold">Passos para seu primeiro Brique</span>
            <span className="mt-1 block text-[11px] leading-snug text-white/75">
              Siga um passo a passo simples e faça seu primeiro brique com sucesso!
            </span>
          </span>

          <ChevronRightIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-white/75" />
        </Link>

        <h1 className="sr-only">Meu Perfil</h1>

        <ul className="mt-5 flex flex-col gap-2.5">
          {ITENS.map((item) => (
            <Item key={item.key} {...item} onClick={item.key === 'sair' ? sair : undefined} />
          ))}
        </ul>
      </main>
    </div>
  )
}

export default Perfil
