import { dashboardVazio } from '../data/dashboardData.js'

// Monta os números do Dashboard a partir do estoque do usuário (public.estoque,
// como vem de listarEstoque). Custo e venda são por unidade e multiplicam pela
// quantidade. Uma venda é um produto com status "vendido": entra na data de
// vendido_em (o banco preenche ao marcar), e o tempo até vender conta a partir
// de quando o produto foi adicionado (created_at).

const DIA = 24 * 60 * 60 * 1000

const soma = (lista, valor) => lista.reduce((total, item) => total + valor(item), 0)
const media = (lista) => (lista.length ? lista.reduce((a, b) => a + b, 0) / lista.length : 0)
// Variação percentual; sem base para comparar, não há variação.
const variacao = (atual, anterior) => (anterior ? ((atual - anterior) / Math.abs(anterior)) * 100 : null)

const nomeDoMes = (data, month) => {
  const nome = data.toLocaleString('pt-BR', { month }).replace('.', '')
  return month === 'long' ? nome.charAt(0).toUpperCase() + nome.slice(1) : nome
}
const diaMes = (data) => data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

// Intervalos [inicio, fim) de cada ponto do gráfico, do mais antigo ao de hoje.
function intervalos(periodo, hoje) {
  const amanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1)
  if (periodo === '30D') {
    return Array.from({ length: 30 }, (_, i) => {
      const inicio = new Date(amanha.getTime() - (30 - i) * DIA)
      return { inicio, fim: new Date(inicio.getTime() + DIA), label: String(inicio.getDate()).padStart(2, '0') }
    })
  }
  if (periodo === '90D') {
    return Array.from({ length: 13 }, (_, i) => {
      const inicio = new Date(amanha.getTime() - (13 - i) * 7 * DIA)
      return { inicio, fim: new Date(inicio.getTime() + 7 * DIA), label: diaMes(inicio) }
    })
  }
  return Array.from({ length: 12 }, (_, i) => {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 11 + i, 1)
    return { inicio, fim: new Date(inicio.getFullYear(), inicio.getMonth() + 1, 1), label: nomeDoMes(inicio, 'short') }
  })
}

const dentro = (data, inicio, fim) => data >= inicio && data < fim

// Lucro acumulado das vendas e investimento acumulado das compras, ponto a
// ponto, comparando o total com o período anterior de mesmo tamanho.
function periodo(nome, hoje, vendas, compras) {
  const pontos = intervalos(nome, hoje)
  const inicio = pontos[0].inicio
  const fim = pontos[pontos.length - 1].fim
  const antes = new Date(inicio.getTime() - (fim - inicio))

  const acumulado = (eventos, valor) => {
    let total = 0
    return pontos.map(({ inicio: de, fim: ate }) => {
      total += soma(eventos.filter((e) => dentro(e.data, de, ate)), valor)
      return total
    })
  }

  const lucro = acumulado(vendas, (v) => v.lucro)
  const total = lucro[lucro.length - 1]
  const anterior = soma(vendas.filter((v) => dentro(v.data, antes, inicio)), (v) => v.lucro)

  return {
    total,
    variacao: variacao(total, anterior),
    labels: pontos.map((p) => p.label),
    lucro,
    investimento: acumulado(compras, (c) => c.custo),
  }
}

// Resumo das vendas de um mês: lucro, unidades, ticket médio e margem.
function resumoDoMes(vendas, inicio, fim) {
  const doMes = vendas.filter((v) => dentro(v.data, inicio, fim))
  const lucro = soma(doMes, (v) => v.lucro)
  const receita = soma(doMes, (v) => v.receita)
  const unidades = soma(doMes, (v) => v.unidades)
  return {
    lucro,
    unidades,
    ticket: unidades ? receita / unidades : 0,
    margem: receita ? (lucro / receita) * 100 : 0,
    vazio: doMes.length === 0,
  }
}

export function dashboardDoEstoque(linhas, hoje = new Date()) {
  const base = dashboardVazio()
  const agora = hoje.getTime()

  const vendidos = linhas
    .filter((l) => l.status === 'vendido' && l.vendido_em)
    .sort((a, b) => new Date(b.vendido_em) - new Date(a.vendido_em))
  const emEstoque = linhas.filter((l) => l.status !== 'vendido')

  const vendas = vendidos.map((l) => {
    const custo = Number(l.custo ?? 0) * l.quantidade
    const receita = Number(l.venda ?? 0) * l.quantidade
    const data = new Date(l.vendido_em)
    return {
      titulo: l.titulo,
      data,
      custo,
      receita,
      lucro: receita - custo,
      unidades: l.quantidade,
      giro: Math.max((data - new Date(l.created_at)) / DIA, 0),
    }
  })
  const compras = linhas.map((l) => ({ data: new Date(l.created_at), custo: Number(l.custo ?? 0) * l.quantidade }))

  // Capital parado: o custo do que ainda não foi vendido, sobre tudo o que já foi investido.
  const parado = soma(emEstoque, (l) => Number(l.custo ?? 0) * l.quantidade)
  const investidoTotal = soma(compras, (c) => c.custo)

  // Giro: dias entre adicionar e vender. As barras são as últimas 7 semanas
  // (a de destaque é a atual) e a diferença compara os últimos 30 dias com os 30 anteriores.
  const giroEntre = (de, ate) => media(vendas.filter((v) => dentro(v.data, de, ate)).map((v) => v.giro))
  const semanas = Array.from({ length: 7 }, (_, i) => giroEntre(new Date(agora - (7 - i) * 7 * DIA), new Date(agora - (6 - i) * 7 * DIA + 1)))
  const giro30 = giroEntre(new Date(agora - 30 * DIA), new Date(agora + 1))
  const giroAntes = giroEntre(new Date(agora - 60 * DIA), new Date(agora - 30 * DIA))

  // Investimento x Retorno: vendas dos últimos 12 meses.
  const doAno = vendas.filter((v) => v.data >= new Date(hoje.getFullYear() - 1, hoje.getMonth(), hoje.getDate()))
  const investido = soma(doAno, (v) => v.custo)
  const retornado = soma(doAno, (v) => v.receita)

  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
  const mes = resumoDoMes(vendas, inicioMes, new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1))
  const anterior = resumoDoMes(vendas, inicioMesAnterior, inicioMes)

  // Melhores ROIs: vendas agrupadas pelo título, só as que deram lucro.
  const porModelo = new Map()
  for (const v of vendas) {
    const chave = v.titulo.trim().toLowerCase()
    const grupo = porModelo.get(chave) ?? { nome: v.titulo.trim(), un: 0, lucro: 0, custo: 0 }
    grupo.un += v.unidades
    grupo.lucro += v.lucro
    grupo.custo += v.custo
    porModelo.set(chave, grupo)
  }
  const roisPorModelo = [...porModelo.values()]
    .map(({ custo, ...grupo }) => ({ ...grupo, roi: custo ? (grupo.lucro / custo) * 100 : 0 }))
    .filter((grupo) => grupo.roi > 0)
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 5)

  const diasDesde = (iso) => Math.max(Math.floor((agora - new Date(iso)) / DIA), 0)
  const paraLista = (l, desde) => ({
    id: l.id,
    titulo: l.titulo,
    compra: Number(l.custo ?? 0),
    preco: Number(l.venda ?? 0),
    dias: diasDesde(desde),
    status: l.status,
    imagem: l.capa ?? null,
  })

  return {
    ...base,
    lucro: {
      periodos: {
        '30D': periodo('30D', hoje, vendas, compras),
        '90D': periodo('90D', hoje, vendas, compras),
        '12M': periodo('12M', hoje, vendas, compras),
      },
    },
    capitalParado: {
      valor: parado,
      pct: investidoTotal ? (parado / investidoTotal) * 100 : 0,
      itens: soma(emEstoque, (l) => l.quantidade),
    },
    giroMedio: {
      dias: media(vendas.map((v) => v.giro)),
      deltaDias: giro30 && giroAntes ? giro30 - giroAntes : 0,
      barras: semanas,
      destaque: 6,
    },
    investimentoRetorno: {
      investido,
      retornado,
      roi: investido ? ((retornado - investido) / investido) * 100 : 0,
    },
    mes: {
      ...base.mes,
      lucro: mes.lucro,
      lucroVar: anterior.vazio ? null : variacao(mes.lucro, anterior.lucro),
      vendidos: mes.unidades,
      vendidosVar: anterior.vazio ? null : mes.unidades - anterior.unidades,
      ticket: mes.ticket,
      ticketVar: anterior.vazio ? null : variacao(mes.ticket, anterior.ticket),
      margem: mes.margem,
      margemVar: anterior.vazio ? null : mes.margem - anterior.margem,
    },
    roisPorModelo,
    estoque: {
      ativos: emEstoque.length,
      vendidos: vendidos.length,
      itens: emEstoque.map((l) => paraLista(l, l.created_at)),
      vendidosItens: vendidos.map((l) => paraLista(l, l.vendido_em)),
    },
  }
}
