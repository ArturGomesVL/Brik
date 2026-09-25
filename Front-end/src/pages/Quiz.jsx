import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FilterIcon,
  LightbulbIcon,
  PinIcon,
  RouteIcon,
  WinkIcon,
} from '../components/icons.jsx'
import { mascaraReais } from '../lib/format.js'

// Quiz de boas-vindas, aberto depois do cadastro: orçamento, cidade e distância,
// categoria — e uma tela de agradecimento. Uma rota só; o passo troca aqui dentro.
// Tela cheia, sem navbar. A cor de destaque é o petróleo da marca.

const TOTAL = 3

// Por ora só Pernambuco: é onde o scraper coleta os anúncios.
const CIDADES = [
  'Abreu e Lima',
  'Cabo de Santo Agostinho',
  'Camaragibe',
  'Caruaru',
  'Garanhuns',
  'Goiana',
  'Gravatá',
  'Igarassu',
  'Ipojuca',
  'Jaboatão dos Guararapes',
  'Moreno',
  'Olinda',
  'Paulista',
  'Petrolina',
  'Recife',
  'Santa Cruz do Capibaribe',
  'São Lourenço da Mata',
  'Vitória de Santo Antão',
]

// As mesmas categorias da Home.
const CATEGORIAS = [
  { value: 'iphone', label: 'iPhones' },
  { value: 'videogame_console', label: 'Videogames' },
]

const VAZIO = { orcamento: '', cidade: '', distancia: '', categoria: '', semPreferencia: false }

// Trilho de progresso: três pontos ligados, o do passo atual maior e em petróleo.
function Progresso({ atual }) {
  return (
    <div aria-hidden="true" className="flex items-center rounded-full bg-white px-5 py-3.5 shadow-[0_6px_18px_-8px_rgba(43,43,43,0.25)]">
      {Array.from({ length: TOTAL }, (_, i) => (
        <span key={i} className="flex items-center">
          {i > 0 && <span className="h-0.5 w-14 bg-line" />}
          <span
            className={`rounded-full transition-all duration-300 ${
              i === atual ? 'h-4 w-4 bg-brik' : 'mx-[3px] h-2.5 w-2.5 bg-line'
            }`}
          />
        </span>
      ))}
    </div>
  )
}

function Cabecalho({ passo, titulo, children }) {
  return (
    <header className="text-center">
      <p className="text-xs font-bold text-brik">
        Passo {passo} de {TOTAL}
      </p>
      <h1 className="mt-2 text-[26px] font-bold leading-tight tracking-tight text-ink">{titulo}</h1>
      <p className="mx-auto mt-3 max-w-xs text-sm leading-snug text-mute">{children}</p>
    </header>
  )
}

// Caixa dos campos: borda petróleo, ícone à esquerda. O rótulo fica em cima.
function Caixa({ label, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-xs font-bold text-ink">
        {label}
      </label>
      <div className="relative flex h-14 items-center gap-3 rounded-xl border-[1.5px] border-brik/70 bg-white px-4 shadow-[0_4px_14px_-8px_rgba(15,76,92,0.45)] focus-within:border-brik focus-within:ring-2 focus-within:ring-brik/20">
        {children}
      </div>
    </div>
  )
}

// Select nativo sem a seta do navegador: a seta é o ícone, por cima dele.
function Selecao({ id, Icon, placeholder, options, value, onChange }) {
  return (
    <>
      <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-brik" />
      <select
        id={id}
        value={value}
        onChange={onChange}
        required
        className={`h-full min-w-0 flex-1 cursor-pointer appearance-none bg-transparent pr-8 text-sm outline-none ${
          value === '' ? 'text-ink/45' : 'text-ink'
        }`}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon aria-hidden="true" className="pointer-events-none absolute right-4 h-5 w-5 text-brik" />
    </>
  )
}

function Dica({ children }) {
  return (
    <aside className="flex gap-2.5 rounded-xl bg-brik/[0.06] p-4">
      <LightbulbIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-brik" />
      <div>
        <p className="text-xs font-bold text-brik">Dica</p>
        <p className="mt-1 text-xs leading-snug text-mute">{children}</p>
      </div>
    </aside>
  )
}

function Continuar({ disabled }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brik text-sm font-bold text-paper shadow-[0_10px_24px_-12px_rgba(15,76,92,0.6)] transition-colors hover:bg-brik-dark disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-brik"
    >
      Continuar
      <ChevronRightIcon aria-hidden="true" className="h-4 w-4" />
    </button>
  )
}

function Quiz() {
  const navigate = useNavigate()
  const [passo, setPasso] = useState(0)
  const [form, setForm] = useState(VAZIO)

  const set = (key, valor) => setForm((atual) => ({ ...atual, [key]: valor }))

  const valido = [
    form.orcamento !== '',
    form.cidade !== '' && Number(form.distancia) > 0,
    form.categoria !== '' || form.semPreferencia,
    true,
  ][passo]

  function avancar(event) {
    event.preventDefault()
    if (!valido) return
    if (passo < TOTAL) {
      setPasso(passo + 1)
      return
    }
    // TODO: gravar as respostas no perfil do usuário (Supabase).
    navigate('/', { viewTransition: true })
  }

  // No primeiro passo a seta sai do quiz. Sem histórico no app (link aberto
  // direto), vai para a Home em vez de sair do site.
  function voltar() {
    if (passo > 0) setPasso(passo - 1)
    else if (window.history.state?.idx > 0) navigate(-1)
    else navigate('/')
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-paper px-7 pb-12 pt-10 shadow-xl">
      <div className="relative flex items-center justify-center">
        <button
          type="button"
          onClick={voltar}
          aria-label="Voltar"
          className="absolute -left-2 flex h-10 w-10 items-center justify-center rounded-xl text-brik transition-colors hover:bg-brik/10"
        >
          <ChevronRightIcon className="h-6 w-6 rotate-180" />
        </button>
        {/* Na tela final o último ponto continua aceso: o quiz terminou nele. */}
        <Progresso atual={Math.min(passo, TOTAL - 1)} />
      </div>

      {/* key: cada passo remonta e entra com a animação de .reveal. */}
      <form key={passo} onSubmit={avancar} className="reveal mt-12 flex flex-1 flex-col" style={{ '--reveal-lead': '0ms' }}>
        {passo === 0 && (
          <>
            <Cabecalho passo={1} titulo="Quanto dinheiro você tem para começar?">
              Informe o valor que você tem disponível para fazer seu primeiro brique.
            </Cabecalho>

            <div className="mt-8 flex flex-col gap-5">
              <Caixa label="Seu orçamento disponível" htmlFor="orcamento">
                <span className="text-base font-bold text-brik">R$</span>
                <span aria-hidden="true" className="h-7 w-0.5 rounded-full bg-brik" />
                <input
                  id="orcamento"
                  inputMode="numeric"
                  placeholder="0,00"
                  autoFocus
                  value={form.orcamento}
                  onChange={(event) => set('orcamento', mascaraReais(event.target.value))}
                  className="min-w-0 flex-1 bg-transparent text-lg text-ink outline-none placeholder:text-ink/35"
                />
              </Caixa>

              <Dica>Comece com o que você tem! O importante é dar o primeiro passo.</Dica>
            </div>
          </>
        )}

        {passo === 1 && (
          <>
            <Cabecalho passo={2} titulo="De qual cidade você é e qual distância máxima você pode percorrer?">
              Essas informações ajudam a encontrar as melhores oportunidades perto de você.
            </Cabecalho>

            <div className="mt-8 flex flex-col gap-5">
              <Caixa label="Sua cidade" htmlFor="cidade">
                <Selecao
                  id="cidade"
                  Icon={PinIcon}
                  placeholder="Selecione sua cidade"
                  options={CIDADES.map((cidade) => ({ value: cidade, label: cidade }))}
                  value={form.cidade}
                  onChange={(event) => set('cidade', event.target.value)}
                />
              </Caixa>

              <Caixa label="Distância máxima para percorrer" htmlFor="distancia">
                <RouteIcon aria-hidden="true" className="h-5 w-5 shrink-0 text-brik" />
                <input
                  id="distancia"
                  inputMode="numeric"
                  placeholder="Digite a distância"
                  value={form.distancia}
                  onChange={(event) => set('distancia', event.target.value.replace(/\D/g, '').slice(0, 3))}
                  className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink/45"
                />
                <span className="text-xs font-bold text-brik">km</span>
              </Caixa>

              <Dica>Considere o tempo e o custo de deslocamento na hora de definir sua distância.</Dica>
            </div>
          </>
        )}

        {passo === 2 && (
          <>
            <Cabecalho passo={3} titulo="Selecione as categorias que você tem mais interesse">
              Se você já tem algo em mente, nos conte. Assim podemos te mostrar as melhores oportunidades.
            </Cabecalho>

            <div className="mt-8 flex flex-col gap-5">
              <Caixa label="Selecione a sua categoria de preferência" htmlFor="categoria">
                <Selecao
                  id="categoria"
                  Icon={FilterIcon}
                  placeholder="Selecione a categoria"
                  options={CATEGORIAS}
                  value={form.categoria}
                  onChange={(event) => setForm((atual) => ({ ...atual, categoria: event.target.value, semPreferencia: false }))}
                />
              </Caixa>

              <div>
                <div aria-hidden="true" className="flex items-center gap-3 text-xs text-mute">
                  <span className="h-px flex-1 bg-line" />
                  ou
                  <span className="h-px flex-1 bg-line" />
                </div>

                {/* "Não" é a resposta "sem preferência": limpa a categoria escolhida. */}
                <button
                  type="button"
                  aria-pressed={form.semPreferencia}
                  aria-describedby="sem-preferencia"
                  onClick={() =>
                    setForm((atual) => ({ ...atual, categoria: '', semPreferencia: !atual.semPreferencia }))
                  }
                  className={`mt-3 h-12 w-full rounded-xl border-[1.5px] border-brik text-sm font-bold transition-colors ${
                    form.semPreferencia ? 'bg-brik text-paper' : 'bg-white text-brik hover:bg-brik/[0.06]'
                  }`}
                >
                  Não
                </button>
                <p id="sem-preferencia" className="mx-auto mt-2 max-w-[14rem] text-center text-[11px] leading-snug text-mute">
                  Quero ver boas oportunidades sem uma preferência específica
                </p>
              </div>

              <Dica>Começar por uma categoria que você já conhece ajuda a avaliar melhor cada oferta.</Dica>
            </div>
          </>
        )}

        {passo === 3 && (
          <div className="mt-8 flex flex-col items-center text-center">
            <span className="flex h-36 w-36 items-center justify-center rounded-full bg-brik/[0.08]">
              <WinkIcon aria-hidden="true" className="h-20 w-20 text-brik" />
            </span>
            <h1 className="mt-8 text-[22px] font-bold leading-tight tracking-tight text-ink">
              Obrigado por compartilhar seus interesses conosco!
            </h1>
            <p className="mt-4 max-w-[15rem] text-sm leading-snug text-mute">
              Aproveite as funcionalidades do plano Free do nosso app!
            </p>
          </div>
        )}

        <div className="mt-auto pt-10">
          <Continuar disabled={!valido} />
        </div>
      </form>
    </div>
  )
}

export default Quiz
