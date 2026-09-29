import { NavLink } from 'react-router-dom'
import { NAV_ITEMS, ADD_ITEM, DESKTOP_ITEMS } from '../config/navItems.js'
import { useAuthStore } from '../stores/useAuthStore.js'
import { fotoDoProvedor } from '../lib/conta.js'
import { FotoPerfil } from './conta.jsx'
import { PlusIcon } from './icons.jsx'

// A conta vira a pílula com avatar à direita; as outras abas ficam em linha,
// ao lado da logo, seguidas das telas que só existem no desktop.
const CONTA = NAV_ITEMS.find((item) => item.conta)
const ABAS = [...NAV_ITEMS.filter((item) => !item.conta), ...DESKTOP_ITEMS]

// Navegação do desktop (a partir de lg). Faz o papel da Navbar, que no desktop
// some: logo à esquerda, as abas numa pílula no centro e, à direita, a conta e
// o "+" como botão de destaque. Na pílula, as abas inativas são só o ícone (o
// nome fica no title e para leitores de tela); a ativa ganha fundo e o nome se
// abre ao lado do ícone (.nav-rotulo, no index.css).
function TopBar() {
  const foto = useAuthStore((state) => fotoDoProvedor(state.session?.user))

  return (
    <header className="sticky top-0 z-50 hidden border-b border-line bg-surface-card lg:block">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-6 px-8">
        {/* O arquivo da logo é branco; aqui ele vira máscara sobre o petróleo. */}
        <NavLink to="/" viewTransition aria-label="Brik, início" className="justify-self-start">
          <span
            aria-hidden="true"
            className="block aspect-[1815/676] h-8 bg-brik [mask:url(/logoBrik.png)_center/contain_no-repeat]"
          />
        </NavLink>

        <nav
          aria-label="Navegação principal"
          className="rounded-full border border-line bg-surface-card p-1.5 shadow-[0_8px_24px_-12px_rgba(43,43,43,0.35)]"
        >
          <ul className="flex items-center gap-1">
            {ABAS.map(({ path, label, Icon }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  end={path === '/'}
                  viewTransition
                  title={label}
                  className={({ isActive }) =>
                    `flex h-10 min-w-11 items-center justify-center rounded-full px-3 transition-[background-color,color,transform] duration-200 active:scale-[0.97] ${
                      isActive ? 'bg-brik/10 text-brik' : 'text-mute hover:bg-surface-raise hover:text-ink'
                    }`
                  }
                >
                  <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
                  <span className="nav-rotulo">
                    <span className="text-sm font-bold">{label}</span>
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-4 justify-self-end">
          <NavLink
            to={CONTA.path}
            viewTransition
            className={({ isActive }) =>
              `flex items-center gap-2 whitespace-nowrap rounded-full border py-1 pl-1 pr-4 text-sm font-medium text-ink transition-colors hover:bg-surface-raise ${
                isActive ? 'border-brik' : 'border-line'
              }`
            }
          >
            <FotoPerfil src={foto} alt="" className="h-8 w-8" iconClassName="h-5 w-5" />
            {CONTA.label}
          </NavLink>

          <NavLink
            to={ADD_ITEM.path}
            viewTransition
            className="flex items-center gap-2 whitespace-nowrap rounded-full bg-brik px-5 py-2.5 text-sm font-bold text-paper transition-colors hover:bg-brik-dark"
          >
            <PlusIcon className="h-5 w-5" />
            {/* Até xl não cabe o texto inteiro ao lado da pílula das abas. */}
            Adicionar<span className="max-xl:hidden"> produto</span>
          </NavLink>
        </div>
      </div>
    </header>
  )
}

export default TopBar
