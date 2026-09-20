// Formato dos dados do Dashboard. Ainda não existe no Supabase uma fonte de
// estoque/vendas do usuário, então o padrão é o estado vazio. Quando a fonte
// existir, basta devolver um objeto neste formato em useDashboardData().

const emptyPeriod = { total: 0, variacao: null, labels: [], lucro: [], investimento: [] }

const monthName = () => {
  const name = new Date().toLocaleString('pt-BR', { month: 'long' })
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export const dashboardVazio = () => ({
  lucro: { periodos: { '30D': emptyPeriod, '90D': emptyPeriod, '12M': emptyPeriod } },
  capitalParado: { valor: 0, pct: 0, itens: 0 },
  giroMedio: { dias: 0, deltaDias: 0, barras: [0, 0, 0, 0, 0, 0, 0], destaque: 3 },
  investimentoRetorno: { investido: 0, retornado: 0, roi: 0 },
  mes: {
    nome: monthName(),
    lucro: 0,
    lucroVar: null,
    vendidos: 0,
    vendidosVar: null,
    ticket: 0,
    ticketVar: null,
    margem: 0,
    margemVar: null,
  },
  roisPorModelo: [],
  estoque: { ativos: 0, vendidos: 0, itens: [], vendidosItens: [] },
})

// ---------------------------------------------------------------------------
// Dados de exemplo (os números do mockup). Só aparecem em desenvolvimento, em
// /dashboard?exemplo — servem para ver a tela completa antes de haver dados reais.
// ---------------------------------------------------------------------------

const mil = (values) => values.map((v) => Math.round(v * 1000))
const dias = (count) => Array.from({ length: count }, (_, i) => String(i + 1).padStart(2, '0'))

export const dashboardExemplo = () => ({
  lucro: {
    periodos: {
      '30D': {
        total: 5320,
        variacao: 18.2,
        labels: dias(30),
        lucro: mil([
          3.95, 4.1, 3.9, 3.85, 3.9, 4.05, 4.3, 4.5, 4.6, 4.7, 4.75, 4.65, 4.55, 4.5, 4.55, 4.7, 4.85, 4.95, 4.9, 4.8,
          4.7, 4.75, 4.9, 5.05, 5.1, 5.15, 5.2, 5.25, 5.3, 5.32,
        ]),
        investimento: mil([
          4.3, 4.35, 4.4, 4.35, 4.3, 4.25, 4.3, 4.4, 4.5, 4.6, 4.65, 4.55, 4.45, 4.4, 4.45, 4.5, 4.55, 4.5, 4.45, 4.5,
          4.55, 4.6, 4.65, 4.7, 4.72, 4.75, 4.78, 4.8, 4.82, 4.85,
        ]),
      },
      '90D': {
        total: 14870,
        variacao: 9.4,
        labels: ['03/07', '10/07', '17/07', '24/07', '31/07', '07/08', '14/08', '21/08', '28/08', '04/09', '11/09', '18/09', '25/09'],
        lucro: mil([6.2, 7.1, 7.6, 8.4, 9.3, 9.9, 10.8, 11.5, 12.2, 12.9, 13.6, 14.2, 14.87]),
        investimento: mil([7.5, 8.1, 8.6, 9.2, 9.9, 10.4, 11.0, 11.6, 12.1, 12.7, 13.2, 13.7, 14.2]),
      },
      '12M': {
        total: 11930,
        variacao: 22.6,
        labels: ['out', 'nov', 'dez', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set'],
        lucro: mil([1.1, 2.0, 3.2, 4.1, 4.9, 6.0, 7.2, 8.1, 9.0, 10.1, 11.0, 11.93]),
        investimento: mil([2.4, 4.1, 6.0, 8.2, 10.1, 12.5, 14.6, 16.8, 19.1, 21.0, 22.9, 24.5]),
      },
    },
  },
  capitalParado: { valor: 12380, pct: 58, itens: 12 },
  giroMedio: { dias: 9.4, deltaDias: -1.8, barras: [7, 12, 10, 16, 9, 6, 4], destaque: 3 },
  investimentoRetorno: { investido: 24500, retornado: 36430, roi: 48.7 },
  mes: {
    nome: 'Setembro',
    lucro: 5320,
    lucroVar: 18.2,
    vendidos: 14,
    vendidosVar: 4,
    ticket: 1940,
    ticketVar: -3.1,
    margem: 32.6,
    margemVar: 2.4,
  },
  roisPorModelo: [
    { nome: 'iPhone 11 · 128GB', modelo: 'iPhone 11', un: 7, roi: 46, lucro: 4488 },
    { nome: 'PlayStation 4 Slim', un: 5, roi: 38, lucro: 3120 },
    { nome: 'iPhone XR · 64GB', modelo: 'iPhone XR', un: 6, roi: 33, lucro: 2760 },
    { nome: 'Nintendo Switch V2', un: 3, roi: 29, lucro: 1290 },
    { nome: 'Xbox Series S', un: 2, roi: 24, lucro: 780 },
  ],
  estoque: {
    ativos: 12,
    vendidos: 38,
    itens: [
      { id: 1, titulo: 'iPhone 12 · 64GB Azul', compra: 1850, dias: 4, status: 'anunciado', preco: 2490 },
      { id: 2, titulo: 'PlayStation 5 Digital', compra: 2750, dias: 9, status: 'reservado', preco: 3390 },
      { id: 3, titulo: 'iPhone XR · 64GB', compra: 1120, dias: 2, status: 'anunciado', preco: 1590 },
      { id: 4, titulo: 'Nintendo Switch OLED', compra: 1480, dias: 12, status: 'anunciado', preco: 1990 },
      { id: 5, titulo: 'Xbox Series S 512GB', compra: 1290, dias: 6, status: 'reservado', preco: 1780 },
    ],
    vendidosItens: [
      { id: 11, titulo: 'iPhone 13 · 128GB', compra: 2900, dias: 6, status: 'vendido', preco: 3750 },
      { id: 12, titulo: 'PlayStation 5 Slim', compra: 2600, dias: 9, status: 'vendido', preco: 3290 },
      { id: 13, titulo: 'Xbox Series X', compra: 2900, dias: 4, status: 'vendido', preco: 3450 },
    ],
  },
})
