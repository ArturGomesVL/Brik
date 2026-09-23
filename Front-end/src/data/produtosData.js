// Formato de "Meus Produtos". Ainda não existe tabela de estoque do usuário no
// Supabase, então o padrão é a lista vazia. Quando a fonte existir, basta
// devolver objetos neste formato em useProdutos().
//
// Em desenvolvimento, /adicionar?exemplo mostra a tela com os produtos do
// mockup — mesma convenção do Dashboard (ver data/dashboardData.js).

export const STATUS = [
  { key: 'anunciado', label: 'Anunciado' },
  { key: 'conserto', label: 'Conserto' },
  { key: 'vendido', label: 'Vendidos' },
  { key: 'aguardando', label: 'Aguardando' },
]

export const produtosVazio = () => []

export const produtosExemplo = () => [
  {
    id: 1,
    data: '23/05/2026',
    titulo: 'AirPods pro 3',
    compra: 900,
    venda: 1500,
    quantidade: 2,
    status: 'anunciado',
  },
  {
    id: 2,
    data: '23/05/2026',
    titulo: 'Controle Xbox Series',
    compra: 250,
    venda: 380,
    quantidade: 1,
    status: 'anunciado',
  },
  {
    id: 3,
    data: '23/05/2026',
    titulo: 'JBL CHARGE 3',
    compra: 450,
    venda: 690,
    quantidade: 2,
    status: 'anunciado',
  },
  {
    id: 4,
    data: '18/05/2026',
    titulo: 'iPhone 11 128GB',
    compra: 1450,
    venda: 1940,
    quantidade: 1,
    status: 'conserto',
  },
  {
    id: 5,
    data: '12/05/2026',
    titulo: 'PS5 Slim',
    compra: 2600,
    venda: 3200,
    quantidade: 1,
    status: 'conserto',
  },
  {
    id: 6,
    data: '02/05/2026',
    titulo: 'AirPods pro 2',
    compra: 700,
    venda: 1150,
    quantidade: 1,
    status: 'vendido',
  },
  {
    id: 7,
    data: '28/04/2026',
    titulo: 'Nintendo Switch OLED',
    compra: 1800,
    venda: 2400,
    quantidade: 1,
    status: 'vendido',
  },
  {
    id: 8,
    data: '26/05/2026',
    titulo: 'Galaxy Buds 2',
    compra: 320,
    venda: 520,
    quantidade: 3,
    status: 'aguardando',
  },
]
