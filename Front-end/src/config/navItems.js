import { HomeIcon, ChartIcon, StarIcon, UserIcon } from '../components/icons.jsx'

// Fonte única das telas da navbar (na ordem da barra). Ao criar uma nova tela,
// adicione aqui e a rota em App.jsx. A navbar divide a lista ao meio: a primeira
// metade fica à esquerda do botão "+" e a segunda à direita, então mantenha o
// número de itens par.
export const NAV_ITEMS = [
  { path: '/', label: 'Início', Icon: HomeIcon },
  { path: '/dashboard', label: 'Dashboard', Icon: ChartIcon },
  { path: '/salvos', label: 'Salvos', Icon: StarIcon },
  { path: '/perfil', label: 'Meu Perfil', Icon: UserIcon },
]

// Botão "+" no centro da navbar, entre as duas metades.
export const ADD_ITEM = { path: '/adicionar', label: 'Adicionar' }
