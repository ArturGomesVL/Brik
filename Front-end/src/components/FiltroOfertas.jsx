import { useRef, useState } from 'react'
import { ChevronDownIcon, FilterIcon } from './icons.jsx'
import { NIVEIS } from '../config/categorias.js'
import { formatBRL, formatInt } from '../lib/format.js'
import { classeBotaoPainel, classePosicaoPainel, useFecharPainel } from '../lib/usePainel.js'

// Botão "Filtros" do header verde do Início, ao lado da cidade. Abre um painel
// com os selos (quais aparecem) e o máximo que a pessoa quer gastar. Tudo vale
// na hora — o feed atrás já muda —, e o botão do rodapé só fecha, mostrando
// quantas ofertas sobraram.
//
// `niveis`: os selos ligados (já só os que as Configurações permitem);
// `permitidos`: os selos a partir do mínimo das Configurações. Os outros
// aparecem desligados, com o aviso.
// `teto`: o maior preço do feed, arredondado — é o fim da régua de preço.
// `lateral`: a versão da coluna lateral do desktop, com um resumo do que está
// filtrado no próprio botão.

// Mesmas cores dos selos do card (ProductCard).
const SELO = {
  boa: 'bg-level-boa text-level-boa-ink',
  otima: 'bg-level-otima text-white',
  extraordinaria: 'bg-level-extra text-white',
}

const PASSO = 50
const ATALHOS = [500, 1000, 2000, 3000, 5000]

function FiltroOfertas({
  niveis,
  permitidos,
  onNiveis,
  precoMaximo,
  onPrecoMaximo,
  teto,
  resultado,
  onLimpar,
  lateral = false,
}) {
  const [aberto, setAberto] = useState(false)
  const raizRef = useRef(null)
  const botaoRef = useRef(null)
  useFecharPainel(aberto, setAberto, raizRef, botaoRef)

  const filtraNivel = niveis.length < permitidos.length
  const ativos = (filtraNivel ? 1 : 0) + (precoMaximo != null ? 1 : 0)
  const atalhos = ATALHOS.filter((valor) => valor < teto).slice(0, 4)
  const minimo = NIVEIS.find((n) => n.value === permitidos[0])

  // Resumo da versão lateral: "Ótimo, Extraordinário · até R$ 1.000", ou
  // "Todas as ofertas". Do selo, só a primeira palavra.
  const selosLigados = NIVEIS.filter((n) => niveis.includes(n.value)).map((n) => n.label.split(' ')[0])
  const resumo =
    [filtraNivel && selosLigados.join(', '), precoMaximo != null && `até ${formatBRL(precoMaximo)}`]
      .filter(Boolean)
      .join(' · ') || 'Todas as ofertas'

  // O último selo ligado não desliga: o feed ficaria sempre vazio.
  function alternar(valor) {
    const ligado = niveis.includes(valor)
    if (ligado && niveis.length === 1) return
    onNiveis(ligado ? niveis.filter((v) => v !== valor) : permitidos.filter((v) => v === valor || niveis.includes(v)))
  }

  // Régua: no teto é "sem limite". (O campo de texto aceita qualquer valor.)
  const definirPreco = (valor) => onPrecoMaximo(valor < teto ? valor : null)

  return (
    // No header do celular o painel se alinha à linha dos filtros (o pai
    // relativo, em Home), senão sairia da tela; na coluna lateral, ao botão.
    <div ref={raizRef} className={lateral ? 'relative w-full' : 'lg:relative'}>
      <button
        ref={botaoRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={aberto}
        onClick={() => setAberto((a) => !a)}
        className={classeBotaoPainel(lateral, aberto, true)}
      >
        <FilterIcon
          aria-hidden="true"
          className={`shrink-0 ${lateral ? 'h-4 w-4 text-brik' : 'h-3.5 w-3.5 text-mint sm:h-4 sm:w-4'}`}
        />
        {lateral ? (
          <span className="min-w-0 flex-1 text-left">
            <span className="block">Filtros</span>
            <span className="block truncate text-[11px] font-normal text-mute">{resumo}</span>
          </span>
        ) : (
          <span className="max-sm:sr-only">Filtros</span>
        )}
        {ativos > 0 && (
          <span className="painel-selo flex h-5 min-w-5 items-center justify-center rounded-full bg-mint px-1 text-[11px] font-bold text-brik">
            <span className="sr-only">(</span>
            {ativos}
            <span className="sr-only"> ativos)</span>
          </span>
        )}
        {lateral && (
          <ChevronDownIcon
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 transition-transform duration-300 ${aberto ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {aberto && (
        <div
          role="group"
          aria-label="Filtros das ofertas"
          className={`painel-pop ${classePosicaoPainel(lateral)} rounded-2xl bg-surface-card p-3 text-ink ring-1 ring-line sm:p-4`}
        >
          <section className="painel-item" style={{ '--i': 0 }}>
            <h2 className="text-[11px] font-bold uppercase tracking-wide text-mute">Selo da oferta</h2>
            <ul className="mt-2 flex flex-col gap-1 sm:gap-1.5">
              {NIVEIS.map(({ value, label, desconto }) => {
                const permitido = permitidos.includes(value)
                const ligado = permitido && niveis.includes(value)
                return (
                  <li key={value}>
                    <button
                      type="button"
                      aria-pressed={ligado}
                      disabled={!permitido}
                      onClick={() => alternar(value)}
                      className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left sm:gap-3 sm:py-2 ring-1 transition-[background-color,box-shadow,transform] duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 ${
                        ligado ? 'bg-brik/[0.06] ring-brik/40' : 'ring-line hover:bg-surface-raise'
                      }`}
                    >
                      <span className={`whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-bold ${SELO[value]}`}>
                        {label}
                      </span>
                      <span className="flex-1 text-[11px] text-mute sm:text-xs">{desconto}%+ abaixo da média</span>
                      <span
                        aria-hidden="true"
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          ligado ? 'border-brik bg-brik text-paper' : 'border-line'
                        }`}
                      >
                        {ligado && (
                          <svg viewBox="0 0 12 12" className="painel-check h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="m2.5 6.2 2.3 2.3 4.7-4.9" />
                          </svg>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            {permitidos.length < NIVEIS.length && (
              <p className="mt-1.5 text-[11px] leading-snug text-mute">
                Suas Configurações mostram só a partir de "{minimo?.label}".
              </p>
            )}
          </section>

          <section className="painel-item mt-3.5 sm:mt-5" style={{ '--i': 1 }}>
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-[11px] font-bold uppercase tracking-wide text-mute">Quanto posso gastar</h2>
              <span key={precoMaximo ?? 'livre'} className="painel-valor text-sm font-bold text-brik">
                {precoMaximo != null ? `até ${formatBRL(precoMaximo)}` : 'Sem limite'}
              </span>
            </div>

            <label className="mt-2 flex items-center gap-2 rounded-lg border border-line bg-surface-card px-3 py-1.5 focus-within:border-brik sm:py-2">
              <span className="text-sm font-medium text-mute">R$</span>
              <input
                inputMode="numeric"
                placeholder="Sem limite"
                aria-label="Valor máximo, em reais"
                value={precoMaximo != null ? formatInt(precoMaximo) : ''}
                onChange={(event) => onPrecoMaximo(Number(event.target.value.replace(/\D/g, '').slice(0, 7)) || null)}
                className="min-w-0 flex-1 bg-transparent text-sm font-bold text-ink outline-none placeholder:font-normal placeholder:text-mute/70"
              />
            </label>

            <input
              type="range"
              min={PASSO}
              max={teto}
              step={PASSO}
              value={Math.min(precoMaximo ?? teto, teto)}
              onChange={(event) => definirPreco(Number(event.target.value))}
              aria-label="Valor máximo"
              aria-valuetext={precoMaximo != null ? formatBRL(precoMaximo) : 'Sem limite'}
              className="mt-2 w-full cursor-pointer accent-brik sm:mt-3"
            />
            <div className="flex justify-between text-[10px] text-mute">
              <span>{formatBRL(PASSO)}</span>
              <span>{formatBRL(teto)}+</span>
            </div>

            {/* No celular, só os dois primeiros atalhos e o "Sem limite". */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[...atalhos, null].map((valor, i) => {
                const ativo = precoMaximo === valor
                return (
                  <button
                    key={valor ?? 'livre'}
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => onPrecoMaximo(valor)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      valor != null && i >= 2 ? 'max-sm:hidden' : ''
                    } ${
                      ativo ? 'bg-brik text-paper' : 'bg-surface-raise text-ink hover:bg-line/70'
                    }`}
                  >
                    {valor != null ? `até ${formatBRL(valor)}` : 'Sem limite'}
                  </button>
                )
              })}
            </div>
          </section>

          <div className="painel-item mt-3.5 flex gap-2 sm:mt-5" style={{ '--i': 2 }}>
            <button
              type="button"
              onClick={onLimpar}
              disabled={ativos === 0}
              className="rounded-lg border border-line px-4 py-2 text-sm sm:py-2.5 font-medium text-ink transition-colors hover:bg-surface-raise disabled:opacity-40 disabled:hover:bg-transparent"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => {
                setAberto(false)
                botaoRef.current?.focus()
              }}
              className="flex-1 rounded-lg bg-brik py-2 text-sm sm:py-2.5 font-bold text-paper transition-colors hover:bg-brik-dark"
            >
              <span aria-live="polite">
                Ver {resultado} {resultado === 1 ? 'oferta' : 'ofertas'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default FiltroOfertas
