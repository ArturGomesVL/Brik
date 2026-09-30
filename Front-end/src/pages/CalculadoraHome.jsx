import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BrandHeader from '../components/BrandHeader.jsx'
import { PrecisaLogin } from '../components/PrecisaLogin.jsx'
import { CalculatorIcon, ChevronRightIcon, TrashIcon } from '../components/icons.jsx'
import { resultado } from '../lib/calc.js'
import { apagarCalculo, listarCalculos, paraValores } from '../lib/calculos.js'
import { formatBRL, formatDecimal } from '../lib/format.js'
import { useUsuarioId } from '../stores/useAuthStore.js'

// Porta de entrada da calculadora, aberta pelo botão flutuante do Dashboard.
// Fica no tema verde da Home (e não no tema claro do Dashboard) porque é uma tela
// de navegação, com navbar; quem faz a conta é /calculadora/nova. Embaixo, os
// cálculos salvos (public.calculos): tocar reabre na calculadora.

const dataCurta = (iso) => new Date(iso).toLocaleDateString('pt-BR')

function CalculoSalvo({ calculo, onApagar }) {
  const navigate = useNavigate()
  const r = resultado(paraValores(calculo))
  const tom = r.lucro > 0 ? 'text-profit' : r.lucro < 0 ? 'text-loss' : 'text-ink'

  return (
    <li className="flex items-center gap-2 rounded-2xl bg-surface-card p-1.5 pr-2 ring-1 ring-line">
      <button
        type="button"
        onClick={() => navigate('/calculadora/nova', { state: { calculo }, viewTransition: true })}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-surface-raise"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-ink">{calculo.nome}</span>
          <span className="block text-[11px] text-mute">
            {dataCurta(calculo.created_at)} · custo {formatBRL(r.custo)} · venda {formatBRL(r.venda)}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className={`block text-sm font-bold tabular-nums ${tom}`}>{formatBRL(r.lucro)}</span>
          <span className="block text-[11px] tabular-nums text-mute">
            {r.margem == null ? '—' : `${formatDecimal(r.margem)}%`}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => onApagar(calculo)}
        aria-label={`Excluir o cálculo ${calculo.nome}`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-mute transition-colors hover:bg-loss/10 hover:text-loss"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </li>
  )
}

function CalculadoraHome() {
  const userId = useUsuarioId()
  // null enquanto carrega.
  const [calculos, setCalculos] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!userId || userId === 'carregando') return
    let ativo = true
    listarCalculos()
      .then((lista) => ativo && setCalculos(lista))
      .catch((error) => {
        console.error('Erro ao carregar os cálculos:', error)
        if (ativo) {
          setErro('Não foi possível carregar seus cálculos.')
          setCalculos([])
        }
      })
    return () => {
      ativo = false
    }
  }, [userId])

  async function apagar(calculo) {
    if (!window.confirm(`Excluir o cálculo "${calculo.nome}"?`)) return
    const antes = calculos
    setCalculos((lista) => lista.filter((c) => c.id !== calculo.id))
    try {
      await apagarCalculo(calculo.id)
    } catch (error) {
      console.error('Erro ao excluir o cálculo:', error)
      setCalculos(antes)
      setErro('Não foi possível excluir o cálculo. Tente de novo.')
    }
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-surface pb-28 shadow-xl lg:max-w-2xl lg:pb-12 lg:shadow-none">
      <BrandHeader />

      <main className="px-4 pt-6 lg:pt-12">
        <h1 className="text-[28px] font-bold leading-none tracking-tight text-ink">Calculadora</h1>
        <p className="mt-2.5 text-sm text-ink/60">
          Simule e descubra o lucro estimado do seu brique
        </p>

        <Link
          to="/calculadora/nova"
          viewTransition
          className="mt-6 flex items-center gap-4 rounded-2xl bg-gradient-to-r from-brik-dark to-brik p-4 text-white shadow-[0_10px_24px_-12px_rgba(15,76,92,0.6)] transition-opacity hover:opacity-95"
        >
          <CalculatorIcon className="h-11 w-11 shrink-0" />

          <span className="min-w-0 flex-1">
            <span className="block font-bold">Calcular novo Brique</span>
            <span className="mt-1 block text-xs leading-snug text-white/75">
              Preencha as informações e veja seu lucro estimado
            </span>
          </span>

          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper text-brik"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </span>
        </Link>

        <section className="mt-8" aria-labelledby="calculos-salvos">
          <h2 id="calculos-salvos" className="text-sm font-bold text-ink">
            Cálculos salvos
          </h2>

          {erro && (
            <p role="alert" className="mt-3 rounded-lg bg-loss/10 px-3 py-2 text-sm text-loss">
              {erro}
            </p>
          )}

          {userId === null ? (
            <PrecisaLogin mensagem="Entre na sua conta para guardar e rever seus cálculos." />
          ) : calculos === null ? (
            <ul className="mt-3 flex flex-col gap-2" aria-busy="true" aria-label="Carregando cálculos">
              {[0, 1].map((i) => (
                <li key={i} className="skeleton h-16 rounded-2xl" />
              ))}
            </ul>
          ) : calculos.length === 0 ? (
            <p className="mt-2 text-sm text-ink/60">
              Ao terminar uma conta, toque em "Salvar cálculo" para guardá-la aqui.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {calculos.map((calculo) => (
                <CalculoSalvo key={calculo.id} calculo={calculo} onApagar={apagar} />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}

export default CalculadoraHome
