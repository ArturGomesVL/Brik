import { HomeIcon, ChartIcon, StarIcon, UserIcon, ShieldCheckIcon } from '../components/icons.jsx'

// Fonte única das telas da navbar (na ordem da barra). Ao criar uma nova tela,
// adicione aqui e a rota em App.jsx. A navbar divide a lista ao meio: a primeira
// metade fica à esquerda do botão "+" e a segunda à direita, então mantenha o
// número de itens par. No desktop (TopBar), o item com `conta` vira a pílula com
// avatar à direita e os outros ficam em linha ao lado da logo.
export const NAV_ITEMS = [
  { path: '/', label: 'Início', Icon: HomeIcon },
  { path: '/dashboard', label: 'Dashboard', Icon: ChartIcon },
  { path: '/salvos', label: 'Salvos', Icon: StarIcon },
  { path: '/perfil', label: 'Meu Perfil', Icon: UserIcon, conta: true },
]

// Telas que só existem no desktop: entram na TopBar, depois das abas de
// NAV_ITEMS, e nunca na navbar do celular.
export const DESKTOP_ITEMS = [{ path: '/imei', label: 'Verificar IMEI', Icon: ShieldCheckIcon }]

// Botão "+" no centro da navbar, entre as duas metades.
export const ADD_ITEM = { path: '/adicionar', label: 'Adicionar' }
