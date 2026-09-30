import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon } from '../components/icons.jsx'
import { Card } from '../components/dashboard/ui.jsx'
import { EMPTY, FIELDS, press, resultado } from '../lib/calc.js'
import { paraValores, salvarCalculo } from '../lib/calculos.js'
import { formatBRL, formatDecimal, formatInt } from '../lib/format.js'

// Calculadora de revenda: o usuário preenche os custos e o preço de venda com o
// teclado da própria tela, e o cartão do topo responde na hora com lucro, margem
// e quanto o preço ainda pode cair até empatar. Cores e fonte seguem o app:
// Rubik, verde para lucro, vermelho para prejuízo, verde da marca para ação.

// Rótulo pequeno em caixa alta, na Rubik (e não em mono, para não parecer genérico).
const LABEL = 'text-[10px] font-medium uppercase tracking-[0.14em]'

const KEYS = [
  { label: '7', key: '7' },
  { label: '8', key: '8' },
  { label: '9', key: '9' },
  { label: '⌫', key: 'backspace', aria: 'Apagar último dígito', tone: 'aux' },
  { label: '4', key: '4' },
  { label: '5', key: '5' },
  { label: '6', key: '6' },
  { label: 'C', key: 'clear', aria: 'Zerar este campo', tone: 'aux' },
  { label: '1', key: '1' },
  { label: '2', key: '2' },
  { label: '3', key: '3' },
  { label: 'Próximo', key: 'next', tone: 'next' },
  { label: '00', key: '00' },
  { label: '0', key: '0' },
  { label: '000', key: '000' },
]

const TONE = {
  num: 'border border-line bg-surface-card text-strong shadow-card hover:bg-surface-raise text-xl font-medium',
  aux: 'bg-surface-raise text-mute hover:text-strong text-xl font-medium',
  next: 'row-span-2 bg-brik px-2 text-center text-xs font-bold uppercase leading-tight tracking-[0.14em] text-paper hover:bg-brik-dark',
}

// Tom do resultado: verde no lucro, vermelho no prejuízo, neutro no zero.
const toneOf = (value) => (value > 0 ? 'text-profit' : value < 0 ? 'text-loss' : 'text-strong')

function Equilibrio({ lucro, margem }) {
  if (lucro > 0) {
    return (
      <span className="text-profit">
        Pode cair {formatBRL(lucro)} · {formatInt(Math.round(margem))}%
      </span>
    )
  }
  if (lucro < 0) return <span className="text-loss">Faltam {formatBRL(-lucro)} para empatar</span>
  return <span className="text-mute">No ponto de equilíbrio</span>
}

function Calculadora() {
  const navigate = useNavigate()
  // Aberta a partir de um cálculo salvo (lista da CalculadoraHome), começa com
  // os valores e o nome dele; salvar de novo cria outro cálculo.
  const { state } = useLocation()
  const [values, setValues] = useState(() => (state?.calculo ? paraValores(state.calculo) : EMPTY))
  const [active, setActive] = useState(0)
  const r = resultado(values)
  const field = FIELDS[active].key
  // No último campo (preço de venda) o botão verde deixa de avançar e passa a
  // oferecer o próximo passo natural: dar um nome à conta e guardá-la.
  const isLast = active === FIELDS.length - 1

  // Folha "nome do brique", aberta pelo botão verde no último campo.
  const [naming, setNaming] = useState(false)
  const [nome, setNome] = useState(state?.calculo?.nome ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erroSalvar, setErroSalvar] = useState('')

  function avancar() {
    if (active === FIELDS.length - 1) setNaming(true)
    else setActive((i) => i + 1)
  }

  function tap(key) {
    if (key === 'next') {
      avancar()
      return
    }
    setValues((v) => ({ ...v, [field]: press(v[field], key) }))
  }

  function limpar() {
    setValues(EMPTY)
    setActive(0)
  }

  function fecharFolha() {
    setNaming(false)
    setErroSalvar('')
  }

  // Grava em public.calculos e volta para a lista, onde ele já aparece.
  async function adicionar(event) {
    event.preventDefault()
    if (!nome.trim() || salvando) return
    setSalvando(true)
    setErroSalvar('')
    try {
      await salvarCalculo(nome, values)
      navigate('/calculadora', { viewTransition: true })
    } catch (error) {
      console.error('Erro ao salvar o cálculo:', error)
      setErroSalvar('Não foi possível salvar. Tente de novo.')
      setSalvando(false)
    }
  }

  // Teclado físico: no desktop a calculadora responde sem o mouse.
  useEffect(() => {
    const onKeyDown = (event) => {
      // Com a folha aberta, o teclado é do campo de texto, não dos valores.
      if (naming) {
        if (event.key === 'Escape') fecharFolha()
        return
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return
      let key = null
      if (/^[0-9]$/.test(event.key)) key = event.key
      else if (event.key === 'Backspace') key = 'backspace'
      else if (event.key === 'Escape') key = 'clear'
      else if (event.key === 'Enter' || event.key === 'ArrowDown') key = 'next'
      else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActive((i) => (i - 1 + FIELDS.length) % FIELDS.length)
        return
      }
      if (!key) return
      event.preventDefault()
      if (key === 'next') {
        if (active === FIELDS.length - 1) setNaming(true)
        else setActive((i) => i + 1)
      } else setValues((v) => ({ ...v, [FIELDS[active].key]: press(v[FIELDS[active].key], key) }))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active, naming])

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-surface pb-6 text-strong shadow-xl lg:max-w-5xl lg:pb-12 lg:shadow-none">
      {/* No desktop o header não gruda: quem fica no topo é a TopBar. */}
      <header className="sticky top-0 z-40 flex items-center gap-2 bg-surface px-4 py-3 lg:static lg:px-8 lg:pb-2 lg:pt-10">
        <Link
          to="/calculadora"
          viewTransition
          aria-label="Voltar"
          className="-ml-1 flex h-9 w-9 items-center justify-center rounded-xl text-strong transition-colors hover:bg-surface-raise"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 text-xl font-bold tracking-tight lg:text-[28px]">Calculadora</h1>
        <button
          type="button"
          onClick={limpar}
          className={`${LABEL} rounded-lg px-2 py-1.5 text-mute transition-colors hover:text-strong`}
        >
          Limpar
        </button>
      </header>

      {/* No desktop: resultado à esquerda, parado enquanto a página rola, e campos
          com o teclado à direita. No celular tudo empilha como antes. */}
      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:px-8 lg:pt-4">
        {/* Resultado */}
        <div className="px-4 lg:sticky lg:top-24 lg:px-0">
          <Card as="div" className="p-5 lg:p-7" aria-live="polite">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`${LABEL} text-mute`}>Lucro líquido</p>
                <p className={`mt-2 text-[40px] font-bold leading-none tracking-tight tabular-nums ${toneOf(r.lucro)}`}>
                  {formatBRL(r.lucro)}
                </p>
              </div>
              <div className="text-right">
                <p className={`${LABEL} text-mute`}>Margem</p>
                <p className={`mt-2 text-xl font-bold tabular-nums ${r.margem == null ? 'text-mute' : toneOf(r.margem)}`}>
                  {r.margem == null ? '—' : `${r.margem > 0 ? '+' : ''}${formatDecimal(r.margem)}%`}
                </p>
              </div>
            </div>

            <div className={`${LABEL} mt-5 flex items-center justify-between gap-3`}>
              <span className="text-mute">Ponto de equilíbrio</span>
              <Equilibrio lucro={r.lucro} margem={r.margem} />
            </div>

            {/* Barra: o custo ocupa a parte cinza; o que sobra até a venda é a folga. */}
            <div className="mt-2.5 flex h-1.5 overflow-hidden rounded-full bg-surface-raise" aria-hidden="true">
              <div
                className={`h-full transition-[width] duration-300 ${r.lucro < 0 ? 'bg-loss' : 'bg-mute/35'}`}
                style={{ width: `${r.custoPct}%` }}
              />
              {r.lucro > 0 && <div className="h-full flex-1 bg-profit" />}
            </div>

            <div className="mt-2 flex justify-between text-[11px] tabular-nums text-mute">
              <span>Custo {formatBRL(r.custo)}</span>
              <span>Venda {formatBRL(r.venda)}</span>
            </div>
          </Card>

          {/* O teclado físico já funciona (ver o useEffect acima); no desktop, onde
              ele é o jeito natural de digitar, a tela ensina os atalhos. */}
          <p className="mt-4 hidden text-sm leading-relaxed text-mute lg:block">
            Digite os valores pelo teclado: <Tecla>Enter</Tecla> avança para o próximo campo,{' '}
            <Tecla>↑</Tecla> volta, <Tecla>⌫</Tecla> apaga e <Tecla>Esc</Tecla> zera o campo.
          </p>
        </div>

        <div>
          {/* Campos. Tocar em um deles o torna o alvo do teclado. */}
          <ul className="mt-4 border-y border-line lg:mt-0 lg:overflow-hidden lg:rounded-3xl lg:border lg:bg-surface-card lg:shadow-card">
            {FIELDS.map(({ key, label }, i) => {
              const selected = i === active
              const filled = values[key] !== ''
              return (
                <li key={key} className="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setActive(i)}
                    className={`flex w-full items-center justify-between border-l-2 px-4 py-3.5 text-left transition-colors ${
                      selected ? 'border-brik bg-surface-raise' : 'border-transparent hover:bg-surface-raise/60'
                    }`}
                  >
                    <span className={`text-sm ${selected ? 'font-medium text-strong' : 'text-mute'}`}>{label}</span>
                    <span className="flex items-center gap-0.5">
                      <span className={`text-base font-bold tabular-nums ${filled ? 'text-strong' : 'text-mute/60'}`}>
                        {formatBRL(Number(values[key] || 0))}
                      </span>
                      {selected && (
                        <span aria-hidden="true" className="h-5 w-0.5 rounded-full bg-brik motion-safe:animate-pulse" />
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          {/* Teclado */}
          <div className="grid auto-rows-[3.5rem] grid-cols-4 gap-2 px-4 pt-4 lg:px-0">
            {KEYS.map(({ label, key, aria, tone = 'num' }) => (
              <button
                key={key}
                type="button"
                aria-label={aria}
                onClick={() => tap(key)}
                className={`flex items-center justify-center rounded-2xl tabular-nums transition-colors ${TONE[tone]}`}
              >
                {key === 'next' && isLast ? (
                  // Sem o espaçamento entre letras: numa tecla de 1/4 da largura,
                  // "SALVAR" e "CÁLCULO" precisam caber inteiros, um por linha.
                  <span className="whitespace-nowrap tracking-normal">
                    Salvar
                    <br />
                    cálculo
                  </span>
                ) : (
                  label
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {naming && (
        <NomeDoBrique
          nome={nome}
          onChange={setNome}
          onSubmit={adicionar}
          onClose={fecharFolha}
          salvando={salvando}
          erro={erroSalvar}
        />
      )}
    </div>
  )
}

// Tecla desenhada no meio do texto de ajuda do desktop.
function Tecla({ children }) {
  return (
    <kbd className="rounded-md border border-line bg-surface-card px-1.5 py-0.5 font-sans text-xs font-medium text-strong shadow-card">
      {children}
    </kbd>
  )
}

// Folha que sobe do rodapé pedindo o nome do brique. Tocar fora dela fecha. No
// desktop vira uma janela no centro da tela.
function NomeDoBrique({ nome, onChange, onSubmit, onClose, salvando, erro }) {
  const input = useRef(null)
  useEffect(() => input.current?.focus(), [])

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center lg:items-center">
      <button
        type="button"
        aria-label="Cancelar"
        onClick={onClose}
        className="absolute inset-0 bg-strong/40"
      />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="nome-brique"
        onSubmit={onSubmit}
        className="relative w-full max-w-md rounded-t-3xl bg-surface px-4 pb-8 pt-5 shadow-xl lg:rounded-3xl lg:px-6 lg:pb-6"
      >
        <label id="nome-brique" htmlFor="nome-brique-input" className={`${LABEL} text-mute`}>
          Qual é o nome do brique?
        </label>
        <input
          ref={input}
          id="nome-brique-input"
          type="text"
          value={nome}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Ex.: iPhone 12 128GB"
          autoComplete="off"
          maxLength={80}
          className="mt-2.5 w-full rounded-2xl border border-line bg-surface-card px-4 py-3.5 text-base text-strong shadow-card outline-none placeholder:text-mute/60 focus:border-brik"
        />
        {erro && (
          <p role="alert" className="mt-2 text-sm text-loss">
            {erro}
          </p>
        )}
        <button
          type="submit"
          disabled={!nome.trim() || salvando}
          className={`${LABEL} mt-3 w-full rounded-2xl bg-brik py-4 text-xs font-bold text-paper transition-colors hover:bg-brik-dark disabled:opacity-40`}
        >
          {salvando ? 'Salvando…' : 'Salvar cálculo'}
        </button>
      </form>
    </div>
  )
}

export default Calculadora
