import { NavLink } from 'react-router-dom'
import { NAV_ITEMS, ADD_ITEM, DESKTOP_ITEMS } from '../config/navItems.js'
import { AvatarIcon, PlusIcon } from './icons.jsx'

// A conta vira a pílula com avatar à direita; as outras abas ficam em linha,
// ao lado da logo, seguidas das telas que só existem no desktop.
const CONTA = NAV_ITEMS.find((item) => item.conta)
const ABAS = [...NAV_ITEMS.filter((item) => !item.conta), ...DESKTOP_ITEMS]

// Navegação do desktop (a partir de lg). Faz o papel da Navbar, que no desktop
// some: as mesmas abas de NAV_ITEMS numa barra branca no topo, com a aba ativa
// sublinhada, e o "+" vira o botão de destaque na ponta direita.
function TopBar() {
  return (
    <header className="sticky top-0 z-50 hidden border-b border-line bg-surface-card lg:block">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-10 px-8">
        {/* O arquivo da logo é branco; aqui ele vira máscara sobre o petróleo. */}
        <NavLink to="/" viewTransition aria-label="Brik, início" className="shrink-0">
          <span
            aria-hidden="true"
            className="block aspect-[1815/676] h-8 bg-brik [mask:url(/logoBrik.png)_center/contain_no-repeat]"
          />
        </NavLink>

        <nav aria-label="Navegação principal" className="h-full">
          <ul className="flex h-full gap-7">
            {ABAS.map(({ path, label, Icon }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  end={path === '/'}
                  viewTransition
                  className={({ isActive }) =>
                    `flex h-full items-center gap-2 border-b-2 pt-0.5 text-sm transition-colors ${
                      isActive
                        ? 'border-brik font-bold text-brik'
                        : 'border-transparent font-medium text-ink hover:text-brik'
                    }`
                  }
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <NavLink
            to={CONTA.path}
            viewTransition
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-full border py-1 pl-1 pr-4 text-sm font-medium text-ink transition-colors hover:bg-surface-raise ${
                isActive ? 'border-brik' : 'border-line'
              }`
            }
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-brik-dark text-white"
            >
              <AvatarIcon className="h-5 w-5" />
            </span>
            {CONTA.label}
          </NavLink>

          <NavLink
            to={ADD_ITEM.path}
            viewTransition
            className="flex items-center gap-2 rounded-full bg-brik px-5 py-2.5 text-sm font-bold text-paper transition-colors hover:bg-brik-dark"
          >
            <PlusIcon className="h-5 w-5" />
            Adicionar produto
          </NavLink>
        </div>
      </div>
    </header>
  )
}

export default TopBar
