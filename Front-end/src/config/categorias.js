import { PhoneIcon, GamepadIcon } from '../components/icons.jsx'

// Categorias que o worker raspa. Os filtros do Início e as Configurações leem
// daqui; ao começar a raspar uma categoria nova, adicione-a aqui.
export const CATEGORIAS = [
  { value: 'iphone', label: 'Iphones', Icon: PhoneIcon },
  { value: 'videogame_console', label: 'Video Games', Icon: GamepadIcon },
]

// Selos de oportunidade, do menor para o maior desconto. Os limiares são os do
// worker (calcularOpportunityLevel): desconto sobre a mediana de mercado.
export const NIVEIS = [
  { value: 'boa', label: 'Bom negócio', desconto: 10 },
  { value: 'otima', label: 'Ótimo negócio', desconto: 25 },
  { value: 'extraordinaria', label: 'Extraordinário', desconto: 30 },
]
