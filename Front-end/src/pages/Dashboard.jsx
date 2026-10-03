import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { dashboardExemplo, dashboardVazio } from '../data/dashboardData.js'
import BrandHeader from '../components/BrandHeader.jsx'
import { CalculatorIcon } from '../components/icons.jsx'
import { CapitalParado, GiroMedio } from '../components/dashboard/CapitalGiro.jsx'
import InvestimentoRetorno from '../components/dashboard/InvestimentoRetorno.jsx'
import LucroAcumulado from '../components/dashboard/LucroAcumulado.jsx'
import MelhoresRois from '../components/dashboard/MelhoresRois.jsx'
import MetricasMes from '../components/dashboard/MetricasMes.jsx'
import MeuEstoque from '../components/dashboard/MeuEstoque.jsx'
import { HiddenProvider } from '../components/dashboard/hidden.js'
import { dashboardDoEstoque } from '../lib/dashboard.js'
import { listarEstoque } from '../lib/estoque.js'
import { useUsuarioId } from '../stores/useAuthStore.js'
import { usePreferenciasStore } from '../stores/usePreferenciasStore.js'
import { ENTRANCE_MS, RevealContext, surfaceProps } from '../components/dashboard/reveal.js'

// Os números vêm do estoque do usuário (public.estoque): o que está em estoque
// aparece em "Meu estoque" e o que foi marcado como vendido entra no lucro, nas
// métricas e nos ROIs. Sem login, ou enquanto carrega, a tela fica zerada.
// Em desenvolvimento, /dashboard?exemplo mostra a tela com os números do mockup.
function useDashboardData() {
  const { search } = useLocation()
  const exemplo = import.meta.env.DEV && new URLSearchParams(search).has('exemplo')
  const userId = useUsuarioId()
  const [linhas, setLinhas] = useState(null)

  useEffect(() => {
    if (exemplo || !userId || userId === 'carregando') return
    let ativo = true
    listarEstoque()
      .then((lista) => ativo && setLinhas(lista))
      .catch((error) => console.error('Erro ao carregar o estoque do dashboard:', error))
    return () => {
      ativo = false
    }
  }, [exemplo, userId])

  return useMemo(() => {
    if (exemplo) return dashboardExemplo()
    return linhas && userId ? dashboardDoEstoque(linhas) : dashboardVazio()
  }, [exemplo, linhas, userId])
}

// Ordem em que a tela se monta. Cada bloco numera os próprios elementos a partir
// do número que recebe aqui, então é só mexer nesta lista para reordenar.
// A logo não entra nesta lista: quem faz a entrada dela é a view transition, que
// a traz da Home deslizando até o centro. Dar um pop nela por cima esconderia
// justamente essa viagem (o pop a deixa invisível no instante da captura).
const STEP = {
  lucro: 1, // + título, valor, comparação, período e gráfico (1 a 6)
  capitalParado: 7,
  giroMedio: 8,
  investimentoRetorno: 9, // + anel, investido e retornado (9 a 12)
  mes: 13, // + os quatro cartões (13 a 17)
  rois: 18, // + rosca e lista (18 a 20)
  estoque: 21, // + abas e itens (21 a 23)
}

function Dashboard() {
  const data = useDashboardData()
  // Abre com os valores escondidos se o usuário pediu isso em Privacidade.
  const [hidden, setHidden] = useState(() => usePreferenciasStore.getState().ocultarValores)

  // A entrada acontece só na montagem: depois dela a animação é desligada, para que
  // trocar de aba ou de período não faça o conteúdo novo aparecer com atraso.
  const [entering, setEntering] = useState(true)
  useEffect(() => {
    const timer = setTimeout(() => setEntering(false), ENTRANCE_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    <RevealContext.Provider value={entering}>
      <HiddenProvider value={hidden}>
        <div
          {...surfaceProps(
            entering,
            'mx-auto min-h-screen w-full max-w-md bg-surface pb-36 text-strong shadow-xl lg:max-w-7xl lg:pb-12 lg:shadow-none',
          )}
        >
          <BrandHeader dashboard />

          {/* No celular o título é só para leitores de tela (a logo ocupa o topo) e a
              calculadora é o botão flutuante lá embaixo. No desktop o header da logo
              some (ela está na TopBar), e os dois aparecem aqui, lado a lado. */}
          <div className="flex items-center justify-between lg:px-8 lg:pt-10">
            <h1 className="sr-only text-[28px] font-bold leading-none tracking-tight lg:not-sr-only">Dashboard</h1>
            <Link
              to="/calculadora"
              viewTransition
              className="hidden items-center gap-2 rounded-xl bg-strong px-4 py-2.5 text-sm font-medium text-surface transition-opacity hover:opacity-90 lg:flex"
            >
              <CalculatorIcon className="h-5 w-5" />
              Calcular Brique
            </Link>
          </div>

          {/* No desktop: lucro e gráfico à esquerda, os indicadores menores à direita,
              e o estoque ocupando a largura toda embaixo. Os wrappers mantêm a mesma
              ordem da coluna do celular. */}
          <main className="flex flex-col gap-3 px-4 pt-4 lg:grid lg:grid-cols-12 lg:gap-5 lg:px-8 lg:pt-6">
            <div className="lg:col-span-7">
              <LucroAcumulado
                step={STEP.lucro}
                data={data.lucro}
                hidden={hidden}
                onToggleHidden={() => setHidden((h) => !h)}
              />
            </div>

            <div className="flex flex-col gap-3 lg:col-span-5 lg:gap-5">
              <div className="grid grid-cols-[1.25fr_1fr] gap-3 lg:gap-5">
                <CapitalParado step={STEP.capitalParado} data={data.capitalParado} />
                <GiroMedio step={STEP.giroMedio} data={data.giroMedio} />
              </div>

              <InvestimentoRetorno step={STEP.investimentoRetorno} data={data.investimentoRetorno} />
            </div>

            <div className="mt-4 lg:col-span-7 lg:mt-0">
              <MetricasMes step={STEP.mes} data={data.mes} />
            </div>

            <div className="lg:col-span-5">
              <MelhoresRois step={STEP.rois} data={data.roisPorModelo} />
            </div>

            <div className="mt-4 lg:col-span-12">
              <MeuEstoque step={STEP.estoque} data={data.estoque} />
            </div>
          </main>

          {/* Atalho flutuante da calculadora (só no celular). Fica por cima do
              dashboard e não rola com a página. O wrapper repete mx-auto + max-w-md
              da coluna para o botão não descolar dela, e o top-52 o coloca no alto à
              direita, logo abaixo do seletor de período. */}
          <div className="pointer-events-none fixed inset-x-0 top-52 z-40 mx-auto flex w-full max-w-md justify-end px-4 lg:hidden">
            <Link
              to="/calculadora"
              viewTransition
              className="pointer-events-auto flex size-20 flex-col items-center justify-center gap-1 rounded-2xl bg-strong text-[10px] font-medium leading-none text-surface shadow-[0_8px_24px_-8px_rgba(43,43,43,0.45)] transition-opacity hover:opacity-90"
            >
              <CalculatorIcon className="h-6 w-6" />
              <span className="text-center leading-tight">
                Calcular
                <br />
                Brique
              </span>
            </Link>
          </div>
        </div>
      </HiddenProvider>
    </RevealContext.Provider>
  )
}

export default Dashboard
