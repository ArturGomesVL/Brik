import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { dashboardExemplo, dashboardVazio } from '../data/dashboardData.js'
import BrandHeader from '../components/BrandHeader.jsx'
import { CapitalParado, GiroMedio } from '../components/dashboard/CapitalGiro.jsx'
import InvestimentoRetorno from '../components/dashboard/InvestimentoRetorno.jsx'
import LucroAcumulado from '../components/dashboard/LucroAcumulado.jsx'
import MelhoresRois from '../components/dashboard/MelhoresRois.jsx'
import MetricasMes from '../components/dashboard/MetricasMes.jsx'
import MeuEstoque from '../components/dashboard/MeuEstoque.jsx'
import { HiddenProvider } from '../components/dashboard/hidden.js'
import { ENTRANCE_MS, RevealContext, surfaceProps } from '../components/dashboard/reveal.js'

// Ainda não há tabela de estoque/vendas do usuário no Supabase. Quando existir, é
// aqui que os dados reais entram (mesmo formato de data/dashboardData.js).
// Em desenvolvimento, /dashboard?exemplo mostra a tela com os números do mockup.
function useDashboardData() {
  const { search } = useLocation()
  const exemplo = import.meta.env.DEV && new URLSearchParams(search).has('exemplo')
  return useMemo(() => (exemplo ? dashboardExemplo() : dashboardVazio()), [exemplo])
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
  const [hidden, setHidden] = useState(false)

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
          {...surfaceProps(entering, 'mx-auto min-h-screen w-full max-w-md bg-surface pb-36 text-strong shadow-xl')}
        >
          <BrandHeader dashboard />

          <h1 className="sr-only">Dashboard</h1>

          <main className="flex flex-col gap-3 px-4 pt-4">
            <LucroAcumulado
              step={STEP.lucro}
              data={data.lucro}
              hidden={hidden}
              onToggleHidden={() => setHidden((h) => !h)}
            />

            <div className="grid grid-cols-[1.25fr_1fr] gap-3">
              <CapitalParado step={STEP.capitalParado} data={data.capitalParado} />
              <GiroMedio step={STEP.giroMedio} data={data.giroMedio} />
            </div>

            <InvestimentoRetorno step={STEP.investimentoRetorno} data={data.investimentoRetorno} />

            <div className="mt-4">
              <MetricasMes step={STEP.mes} data={data.mes} />
            </div>

            <MelhoresRois step={STEP.rois} data={data.roisPorModelo} />

            <div className="mt-4">
              <MeuEstoque step={STEP.estoque} data={data.estoque} />
            </div>
          </main>
        </div>
      </HiddenProvider>
    </RevealContext.Provider>
  )
}

export default Dashboard
